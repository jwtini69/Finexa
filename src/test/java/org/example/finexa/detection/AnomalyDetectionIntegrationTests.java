package org.example.finexa.detection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.example.finexa.ingestion.RawUsageRecord;
import org.example.finexa.ingestion.RawUsageRepository;
import org.example.finexa.ingestion.UsageEvent;
import org.example.finexa.ingestion.UsageEventGenerator;
import org.example.finexa.ingestion.UsageEventProducer;
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
class AnomalyDetectionIntegrationTests {

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
    UsageEventGenerator usageEventGenerator;

    @Autowired
    AnomalyRepository anomalyRepository;

    @Autowired
    RawUsageRepository rawUsageRepository;

    @Autowired
    OrganizationRepository organizationRepository;

    @Autowired
    ZScoreCalculator zScoreCalculator;

    @Autowired
    SeasonalBaselineService seasonalBaselineService;

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
        organizationRepository.save(tenantId, "Anomaly Test Org " + tenantId);
    }

    @Test
    void injectedSpendSpikeIsDetectedAndPersistedAsAnomaly() {
        // Backfill baseline history for 14 days
        usageEventGenerator.backfillHistory(tenantId, 14);

        // Inject artificial spend spike: EC2 normal is ~$75, spike is $450
        UsageEvent spike = usageEventGenerator.injectSpike(
                tenantId, "EC2", "i-0a1b2c3d4e5f6001", BigDecimal.valueOf(450.00)
        );

        await().atMost(15, TimeUnit.SECONDS).pollInterval(Duration.ofMillis(300)).untilAsserted(() -> {
            List<Anomaly> anomalies = anomalyRepository.findAllByTenant(tenantId);
            assertThat(anomalies).isNotEmpty();

            Anomaly spikeAnomaly = anomalies.stream()
                    .filter(a -> a.resourceId().equals("i-0a1b2c3d4e5f6001"))
                    .findFirst()
                    .orElse(null);

            assertThat(spikeAnomaly).isNotNull();
            assertThat(spikeAnomaly.actualCost()).isGreaterThanOrEqualTo(BigDecimal.valueOf(450.00));
            assertThat(spikeAnomaly.severity()).isIn("HIGH", "CRITICAL");
            assertThat(spikeAnomaly.status()).isEqualTo("OPEN");
        });
    }

    @Test
    void seasonalDetectorPreventsFalsePositiveThatNaiveDetectorRaises() {
        // Construct a scenario:
        // Weekend spend is normally $50.
        // Monday morning spend is normally $100 (due to business hours surge).
        // Over a trailing 14-day naive window containing both weekends ($50) and weekdays ($100),
        // mean is ~$75 and stddev is ~$20.
        // If a naive detector tests Monday morning $100 against Friday/Sunday combined or flat average,
        // it may flag high deviation.
        // More specifically, if we have historical Monday 10am values: 98, 102, 100, 99, 101 (mean = 100, stddev = 1.5),
        // a Monday 10am cost of $105:
        // - When evaluated against the true seasonal Monday 10am baseline (mean=100, stddev=1.5), Z = 3.33 (or normal variation)
        // Now consider the contrast:
        // Naive rolling list of all recent hours (e.g. 50, 50, 52, 48, 51 from weekend):
        // Naive mean = 50.2, stddev = 1.3
        // Monday morning value = $100:
        // Naive Z-score = (100 - 50.2) / 1.3 = 38.3 -> FALSE POSITIVE (flags normal Monday start as anomaly)!

        List<BigDecimal> weekendHoursHistory = List.of(
                BigDecimal.valueOf(50.0),
                BigDecimal.valueOf(48.5),
                BigDecimal.valueOf(51.2),
                BigDecimal.valueOf(49.8),
                BigDecimal.valueOf(50.5)
        );

        BigDecimal normalMondayCost = BigDecimal.valueOf(100.0);

        // 1. Naive rolling detector on recent weekend history flags normal Monday morning as an anomaly
        ZScoreCalculator.EvaluationResult naiveResult = zScoreCalculator.evaluate(weekendHoursHistory, normalMondayCost);
        assertThat(naiveResult.isAnomaly()).isTrue();
        assertThat(naiveResult.zScore()).isGreaterThan(BigDecimal.valueOf(3.0));

        // 2. Seasonal baseline detector matching historical Monday morning cycles (98, 102, 100, 99, 101)
        List<BigDecimal> mondayHistoricalCycles = List.of(
                BigDecimal.valueOf(98.0),
                BigDecimal.valueOf(102.0),
                BigDecimal.valueOf(100.0),
                BigDecimal.valueOf(99.0),
                BigDecimal.valueOf(101.0)
        );

        ZScoreCalculator.EvaluationResult seasonalResult = zScoreCalculator.evaluate(mondayHistoricalCycles, normalMondayCost);
        assertThat(seasonalResult.isAnomaly()).isFalse();
        assertThat(seasonalResult.zScore()).isLessThan(BigDecimal.valueOf(1.0));
    }
}
