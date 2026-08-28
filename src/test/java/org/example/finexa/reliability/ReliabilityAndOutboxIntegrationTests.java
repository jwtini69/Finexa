package org.example.finexa.reliability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.example.finexa.budget.Budget;
import org.example.finexa.budget.BudgetRepository;
import org.example.finexa.budget.BudgetThresholdEvaluator;
import org.example.finexa.ingestion.RawUsageRecord;
import org.example.finexa.ingestion.RawUsageRepository;
import org.example.finexa.outbox.OutboxEvent;
import org.example.finexa.outbox.OutboxPublisher;
import org.example.finexa.outbox.OutboxRepository;
import org.example.finexa.tenant.OrganizationRepository;
import org.example.finexa.webhook.DeadLetterHandler;
import org.example.finexa.webhook.WebhookDelivery;
import org.example.finexa.webhook.WebhookDeliveryRepository;
import org.example.finexa.webhook.WebhookDispatcher;
import org.example.finexa.webhook.WebhookEndpoint;
import org.example.finexa.webhook.WebhookEndpointRepository;
import org.example.finexa.webhook.WebhookHttpClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;

@SpringBootTest
@Testcontainers
@org.springframework.test.annotation.DirtiesContext
class ReliabilityAndOutboxIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("finexa")
            .withUsername("finexa")
            .withPassword("finexa");

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer("apache/kafka-native:3.8.0");

    @Autowired
    BudgetRepository budgetRepository;

    @Autowired
    BudgetThresholdEvaluator budgetThresholdEvaluator;

    @Autowired
    RawUsageRepository rawUsageRepository;

    @Autowired
    OutboxRepository outboxRepository;

    @Autowired
    OutboxPublisher outboxPublisher;

    @Autowired
    WebhookEndpointRepository webhookEndpointRepository;

    @Autowired
    WebhookDeliveryRepository webhookDeliveryRepository;

    @Autowired
    DeadLetterHandler deadLetterHandler;

    @Autowired
    OrganizationRepository organizationRepository;

    private UUID tenantId;

    @DynamicPropertySource
    static void dynamicProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
        registry.add("finexa.security.jwt-secret", () -> "test-secret-with-at-least-thirty-two-bytes");
    }

    @BeforeEach
    void setup() {
        tenantId = UUID.randomUUID();
        organizationRepository.save(tenantId, "Reliability Org " + tenantId);
    }

    @Test
    void budgetThresholdCrossingAtomicallyCreatesOutboxEventAndPublisherDispatchesIt() {
        // 1. Create a budget with cap $1000 and threshold 80%
        Budget budget = new Budget(
                UUID.randomUUID(),
                tenantId,
                "Monthly Cap",
                "ORGANIZATION",
                null,
                BigDecimal.valueOf(1000.00),
                "DAILY",
                "80,100",
                BigDecimal.ZERO,
                "ACTIVE",
                null,
                null
        );
        budgetRepository.save(budget);

        // 2. Insert usage record of $850 (crosses 80% threshold)
        RawUsageRecord record = new RawUsageRecord(
                UUID.randomUUID(),
                tenantId,
                "EC2",
                "i-threshold-test",
                BigDecimal.valueOf(850.00),
                "USD",
                Instant.now(),
                Instant.now()
        );
        rawUsageRepository.insert(record);

        // 3. Evaluate budget
        budgetThresholdEvaluator.evaluateBudgetsForTenant(tenantId);

        // 4. Verify outbox event is created in PENDING state
        List<OutboxEvent> pending = outboxRepository.findPendingEvents(10);
        assertThat(pending).isNotEmpty();
        OutboxEvent createdEvent = pending.stream()
                .filter(e -> e.organizationId().equals(tenantId))
                .findFirst()
                .orElse(null);

        assertThat(createdEvent).isNotNull();
        assertThat(createdEvent.eventType()).isEqualTo("BUDGET_THRESHOLD_CROSSED");
        assertThat(createdEvent.status()).isEqualTo("PENDING");

        // 5. Run outbox publisher and verify it transitions to PUBLISHED
        outboxPublisher.publishPendingEvents();

        await().atMost(10, TimeUnit.SECONDS).untilAsserted(() -> {
            OutboxEvent updated = outboxRepository.findById(createdEvent.id()).orElseThrow();
            assertThat(updated.status()).isEqualTo("PUBLISHED");
            assertThat(updated.publishedAt()).isNotNull();
        });
    }

    @Test
    void webhookDispatcherRetriesOn503AndEnsuresSingleSuccessfulDeliveryRecord() throws Exception {
        // Mock WebhookHttpClient to return 503 twice then 200 on attempt 3
        WebhookHttpClient mockClient = mock(WebhookHttpClient.class);
        AtomicInteger callCount = new AtomicInteger(0);

        when(mockClient.post(anyString(), anyString(), anyString())).thenAnswer(invocation -> {
            int attempt = callCount.incrementAndGet();
            if (attempt < 3) {
                return new WebhookHttpClient.HttpResponseResult(503, "Service Unavailable");
            }
            return new WebhookHttpClient.HttpResponseResult(200, "{\"success\":true}");
        });

        WebhookDispatcher dispatcher = new WebhookDispatcher(
                webhookEndpointRepository,
                webhookDeliveryRepository,
                deadLetterHandler,
                mockClient
        );

        WebhookEndpoint endpoint = new WebhookEndpoint(
                UUID.randomUUID(),
                tenantId,
                "https://api.partner.dev/webhooks",
                "secret-key-123",
                "BUDGET_THRESHOLD_CROSSED",
                "ACTIVE",
                null
        );
        webhookEndpointRepository.save(endpoint);

        OutboxEvent event = OutboxEvent.pending(
                tenantId,
                "BUDGET_THRESHOLD_CROSSED",
                "BUDGET",
                UUID.randomUUID().toString(),
                "{\"alert\":\"Budget 80% crossed\"}"
        );
        outboxRepository.save(event);

        // Execute dispatch
        dispatcher.dispatchToEndpoint(event, endpoint);

        // Assert 3 attempts made
        assertThat(callCount.get()).isEqualTo(3);

        // Verify exactly one successful delivery record exists in DB
        List<WebhookDelivery> deliveries = webhookDeliveryRepository.findAllByTenant(tenantId);
        List<WebhookDelivery> matching = deliveries.stream()
                .filter(d -> d.eventId().equals(event.id()) && d.endpointId().equals(endpoint.id()))
                .toList();

        assertThat(matching).hasSize(1);
        assertThat(matching.get(0).status()).isEqualTo("SUCCESS");
        assertThat(matching.get(0).attemptCount()).isEqualTo(3);
    }

    @Test
    void concurrentDuplicateDeliveryIsEnforcedByDatabaseUniqueConstraint() throws Exception {
        WebhookHttpClient mockClient = mock(WebhookHttpClient.class);
        when(mockClient.post(anyString(), anyString(), anyString()))
                .thenReturn(new WebhookHttpClient.HttpResponseResult(200, "OK"));

        WebhookDispatcher dispatcher = new WebhookDispatcher(
                webhookEndpointRepository,
                webhookDeliveryRepository,
                deadLetterHandler,
                mockClient
        );

        WebhookEndpoint endpoint = new WebhookEndpoint(
                UUID.randomUUID(),
                tenantId,
                "https://api.partner.dev/concurrent",
                "secret-concurrent",
                "BUDGET_THRESHOLD_CROSSED",
                "ACTIVE",
                null
        );
        webhookEndpointRepository.save(endpoint);

        OutboxEvent event = OutboxEvent.pending(
                tenantId,
                "BUDGET_THRESHOLD_CROSSED",
                "BUDGET",
                UUID.randomUUID().toString(),
                "{\"alert\":\"Concurrency Test\"}"
        );
        outboxRepository.save(event);

        // Fire concurrent workers processing the same event
        ExecutorService executor = Executors.newFixedThreadPool(4);
        List<Callable<Void>> tasks = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            tasks.add(() -> {
                dispatcher.dispatchToEndpoint(event, endpoint);
                return null;
            });
        }

        List<Future<Void>> futures = executor.invokeAll(tasks);
        for (Future<Void> f : futures) {
            f.get(); // Ensure no uncaught exceptions
        }
        executor.shutdown();

        // Verify database contains EXACTLY ONE record for (event_id, endpoint_id)
        List<WebhookDelivery> deliveries = webhookDeliveryRepository.findAllByTenant(tenantId);
        List<WebhookDelivery> matching = deliveries.stream()
                .filter(d -> d.eventId().equals(event.id()) && d.endpointId().equals(endpoint.id()))
                .toList();

        assertThat(matching).hasSize(1);
        assertThat(matching.get(0).status()).isEqualTo("SUCCESS");
    }
}
