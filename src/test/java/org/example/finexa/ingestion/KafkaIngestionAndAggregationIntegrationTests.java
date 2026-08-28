package org.example.finexa.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.example.finexa.aggregation.CostRollupRepository;
import org.example.finexa.aggregation.DateRangeQueryService;
import org.example.finexa.tenant.Organization;
import org.example.finexa.tenant.OrganizationRepository;
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
class KafkaIngestionAndAggregationIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("finexa")
            .withUsername("finexa")
            .withPassword("finexa");

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer("apache/kafka-native:3.8.0");

    @Autowired
    UsageEventProducer usageEventProducer;

    @Autowired
    RawUsageRepository rawUsageRepository;

    @Autowired
    CostRollupRepository costRollupRepository;

    @Autowired
    DateRangeQueryService dateRangeQueryService;

    @Autowired
    UsageEventGenerator usageEventGenerator;

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
        organizationRepository.save(tenantId, "Ingestion Test Org " + tenantId);
    }

    @Test
    void usageEventFlowsThroughKafkaIntoHypertableAndUpdatesRollups() {
        Instant now = Instant.now();
        UsageEvent event = new UsageEvent(
                UUID.randomUUID(),
                tenantId,
                "EC2",
                "i-roundtrip-test-01",
                BigDecimal.valueOf(125.50),
                "USD",
                now
        );

        usageEventProducer.send(event);

        await().atMost(10, TimeUnit.SECONDS).pollInterval(Duration.ofMillis(200)).untilAsserted(() -> {
            List<RawUsageRecord> records = rawUsageRepository.findByTenantServiceResourceAndDateRange(
                    tenantId, "EC2", "i-roundtrip-test-01", now.minus(5, ChronoUnit.MINUTES), now.plus(5, ChronoUnit.MINUTES)
            );
            assertThat(records).isNotEmpty();
            assertThat(records.get(0).cost()).isEqualByComparingTo(BigDecimal.valueOf(125.50));

            BigDecimal hourlyTotal = rawUsageRepository.getHourlyTotalCost(
                    tenantId, "EC2", "i-roundtrip-test-01", now
            );
            assertThat(hourlyTotal).isGreaterThanOrEqualTo(BigDecimal.valueOf(125.50));
        });
    }

    @Test
    void backfillPopulatesHistoricalDataAndDateRangeQueryAggregatesCorrectly() {
        int backfilledCount = usageEventGenerator.backfillHistory(tenantId, 14);
        assertThat(backfilledCount).isGreaterThan(0);

        DateRangeQueryService.CostSummaryResponse summary = dateRangeQueryService.getSummary(
                tenantId, "7d", null, null
        );

        assertThat(summary.currentSpend()).isGreaterThan(BigDecimal.ZERO);
        assertThat(summary.topService()).isNotNull();

        List<CostRollupRepository.TimeseriesAggregate> timeseries = dateRangeQueryService.getTimeseries(
                tenantId, "7d", null, null, "hour"
        );
        assertThat(timeseries).isNotEmpty();

        List<CostRollupRepository.ServiceBreakdown> serviceBreakdown = dateRangeQueryService.getServiceBreakdown(
                tenantId, "7d", null, null
        );
        assertThat(serviceBreakdown).isNotEmpty();
    }
}
