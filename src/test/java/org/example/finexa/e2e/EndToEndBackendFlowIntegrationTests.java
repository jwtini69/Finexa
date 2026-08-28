package org.example.finexa.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.example.finexa.aggregation.CostRollupRepository;
import org.example.finexa.detection.Anomaly;
import org.example.finexa.detection.AnomalyRepository;
import org.example.finexa.outbox.OutboxEvent;
import org.example.finexa.outbox.OutboxPublisher;
import org.example.finexa.outbox.OutboxRepository;
import org.example.finexa.webhook.WebhookDelivery;
import org.example.finexa.webhook.WebhookDeliveryRepository;
import org.example.finexa.webhook.WebhookHttpClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@org.springframework.test.annotation.DirtiesContext
class EndToEndBackendFlowIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("finexa")
            .withUsername("finexa")
            .withPassword("finexa");

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer("apache/kafka-native:3.8.0");

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, Object>>> LIST_TYPE = new TypeReference<>() {};

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    AnomalyRepository anomalyRepository;

    @Autowired
    OutboxRepository outboxRepository;

    @Autowired
    OutboxPublisher outboxPublisher;

    @Autowired
    WebhookDeliveryRepository webhookDeliveryRepository;

    @Autowired
    CostRollupRepository costRollupRepository;

    @MockitoBean
    WebhookHttpClient webhookHttpClient;

    @DynamicPropertySource
    static void dynamicProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
        registry.add("finexa.security.jwt-secret", () -> "test-secret-with-at-least-thirty-two-bytes");
    }

    @Test
    void completeEndToEndFlow_DemoSequence() throws Exception {
        // Configure mock HTTP client for webhooks
        when(webhookHttpClient.post(anyString(), anyString(), anyString()))
                .thenReturn(new WebhookHttpClient.HttpResponseResult(200, "{\"acknowledged\":true}"));

        // 1. Register Organization & Owner
        String regJson = """
                {
                  "organization_name": "Demo FinOps Corp",
                  "owner_email": "cto@demofinops.com",
                  "password": "Password123!"
                }
                """;
        String regResp = mockMvc.perform(post("/api/orgs/register")
                        .contentType("application/json")
                        .content(regJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Map<String, Object> regData = objectMapper.readValue(regResp, MAP_TYPE);
        UUID orgId = UUID.fromString(regData.get("organization_id").toString());
        assertThat(orgId).isNotNull();

        // 2. Login as Owner
        String loginJson = """
                {
                  "email": "cto@demofinops.com",
                  "password": "Password123!"
                }
                """;
        String loginResp = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<String, Object> loginData = objectMapper.readValue(loginResp, MAP_TYPE);
        String token = "Bearer " + loginData.get("access_token");

        // 3. Register Webhook Endpoint
        String webhookJson = """
                {
                  "url": "https://hooks.slack.com/services/finexa/alerts",
                  "secret": "whsec_demosecretkey123",
                  "events": "BUDGET_THRESHOLD_CROSSED,ANOMALY_DETECTED"
                }
                """;
        mockMvc.perform(post("/api/webhooks")
                        .header("Authorization", token)
                        .contentType("application/json")
                        .content(webhookJson))
                .andExpect(status().isCreated());

        // 4. Create Budget with $500 cap and 80% threshold
        String budgetJson = """
                {
                  "name": "Production EC2 Cap",
                  "scope_type": "SERVICE",
                  "scope_value": "EC2",
                  "cap_amount": 500.00,
                  "period": "DAILY",
                  "threshold_percentages": "80,100"
                }
                """;
        mockMvc.perform(post("/api/budgets")
                        .header("Authorization", token)
                        .contentType("application/json")
                        .content(budgetJson))
                .andExpect(status().isCreated());

        // 5. Backfill 14 days of realistic usage
        mockMvc.perform(post("/api/generator/backfill?days=14")
                        .header("Authorization", token))
                .andExpect(status().isOk());

        // 6. Query Cost Analytics
        String summaryResp = mockMvc.perform(get("/api/costs/summary?range=7d")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<String, Object> summaryData = objectMapper.readValue(summaryResp, MAP_TYPE);
        assertThat(summaryData.get("current_spend")).isNotNull();

        String timeseriesResp = mockMvc.perform(get("/api/costs/timeseries?range=7d")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Map<String, Object>> timeseriesData = objectMapper.readValue(timeseriesResp, LIST_TYPE);
        assertThat(timeseriesData).isNotEmpty();

        // 7. Inject Runaway Spend Spike (EC2 jumps to $420)
        String spikeJson = """
                {
                  "service_name": "EC2",
                  "resource_id": "i-0a1b2c3d4e5f6001",
                  "spike_cost": 420.00
                }
                """;
        mockMvc.perform(post("/api/generator/spike")
                        .header("Authorization", token)
                        .contentType("application/json")
                        .content(spikeJson))
                .andExpect(status().isOk());

        // 8. Wait for Anomaly Detection Pipeline to flag and persist the spike
        await().atMost(15, TimeUnit.SECONDS).pollInterval(Duration.ofMillis(300)).untilAsserted(() -> {
            List<Anomaly> anomalies = anomalyRepository.findAllByTenant(orgId);
            assertThat(anomalies).isNotEmpty();

            Anomaly spikeAnomaly = anomalies.stream()
                    .filter(a -> a.resourceId().equals("i-0a1b2c3d4e5f6001"))
                    .findFirst()
                    .orElse(null);

            assertThat(spikeAnomaly).isNotNull();
            assertThat(spikeAnomaly.severity()).isIn("HIGH", "CRITICAL");
        });

        // 9. Verify Anomaly Controller returns the anomaly and allows acknowledgment
        String anomaliesResp = mockMvc.perform(get("/api/anomalies")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Map<String, Object>> anomaliesList = objectMapper.readValue(anomaliesResp, LIST_TYPE);
        assertThat(anomaliesList).isNotEmpty();
        String anomalyId = anomaliesList.get(0).get("id").toString();

        mockMvc.perform(post("/api/anomalies/{id}/acknowledge", anomalyId)
                        .header("Authorization", token))
                .andExpect(status().isOk());

        // 10. Verify Outbox Event created for Budget threshold crossing
        await().atMost(10, TimeUnit.SECONDS).untilAsserted(() -> {
            outboxPublisher.publishPendingEvents();
            List<OutboxEvent> outboxEvents = outboxRepository.findPendingEvents(10);
            // After publish, should transition to PUBLISHED
            List<WebhookDelivery> deliveries = webhookDeliveryRepository.findAllByTenant(orgId);
            assertThat(deliveries).isNotEmpty();
            assertThat(deliveries.get(0).status()).isEqualTo("SUCCESS");
        });

        // 11. Verify Webhook Deliveries audit log via API
        String deliveriesResp = mockMvc.perform(get("/api/webhooks/deliveries")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Map<String, Object>> deliveriesList = objectMapper.readValue(deliveriesResp, LIST_TYPE);
        assertThat(deliveriesList).isNotEmpty();
        assertThat(deliveriesList.get(0).get("status")).isEqualTo("SUCCESS");
    }
}
