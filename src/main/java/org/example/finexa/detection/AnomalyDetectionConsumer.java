package org.example.finexa.detection;

import java.time.Instant;
import java.util.UUID;
import org.example.finexa.aggregation.CostRollupEvent;
import org.example.finexa.config.KafkaConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
public class AnomalyDetectionConsumer {

    private static final Logger log = LoggerFactory.getLogger(AnomalyDetectionConsumer.class);

    private final SeasonalBaselineService seasonalBaselineService;
    private final AnomalyRepository anomalyRepository;
    private final org.example.finexa.budget.BudgetThresholdEvaluator budgetThresholdEvaluator;

    public AnomalyDetectionConsumer(
            SeasonalBaselineService seasonalBaselineService,
            AnomalyRepository anomalyRepository,
            org.example.finexa.budget.BudgetThresholdEvaluator budgetThresholdEvaluator
    ) {
        this.seasonalBaselineService = seasonalBaselineService;
        this.anomalyRepository = anomalyRepository;
        this.budgetThresholdEvaluator = budgetThresholdEvaluator;
    }

    @KafkaListener(
            topics = KafkaConfig.COST_ROLLUP_EVENTS_TOPIC,
            groupId = KafkaConfig.DETECTION_CONSUMER_GROUP,
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consume(@Payload CostRollupEvent event) {
        log.debug("Evaluating cost rollup event for anomaly: org={}, service={}, res={}, cost={}",
                event.organizationId(), event.serviceName(), event.resourceId(), event.totalBucketCost());

        SeasonalBaselineService.SeasonalEvaluationResult result = seasonalBaselineService.evaluate(
                event.organizationId(),
                event.serviceName(),
                event.resourceId(),
                event.bucketStart(),
                event.totalBucketCost()
        );

        if (result.isAnomaly()) {
            String detectionStage = result.usedSeasonalBaseline() ? "SEASONAL" : "NAIVE";
            Anomaly anomaly = new Anomaly(
                    UUID.randomUUID(),
                    event.organizationId(),
                    event.serviceName(),
                    event.resourceId(),
                    event.totalBucketCost(),
                    result.expectedCost(),
                    result.deviationPercentage(),
                    result.zScore(),
                    result.severity(),
                    detectionStage,
                    "OPEN",
                    event.timestamp(),
                    Instant.now()
            );

            anomalyRepository.save(anomaly);

            log.warn("ANOMALY DETECTED [{}]: Org={}, Service={}, Resource={}, Actual={}, Expected={}, Dev=+{}%, Z={}",
                    anomaly.severity(),
                    anomaly.organizationId(),
                    anomaly.serviceName(),
                    anomaly.resourceId(),
                    anomaly.actualCost(),
                    anomaly.expectedCost(),
                    anomaly.deviationPercentage(),
                    anomaly.zScore());
        }

        budgetThresholdEvaluator.evaluateBudgetsForTenant(event.organizationId());
    }
}
