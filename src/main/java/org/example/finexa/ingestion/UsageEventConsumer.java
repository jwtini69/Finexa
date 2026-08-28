package org.example.finexa.ingestion;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.example.finexa.aggregation.CostRollupEvent;
import org.example.finexa.aggregation.CostRollupEventProducer;
import org.example.finexa.config.KafkaConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class UsageEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(UsageEventConsumer.class);

    private final RawUsageRepository rawUsageRepository;
    private final CostRollupEventProducer costRollupEventProducer;

    public UsageEventConsumer(
            RawUsageRepository rawUsageRepository,
            CostRollupEventProducer costRollupEventProducer
    ) {
        this.rawUsageRepository = rawUsageRepository;
        this.costRollupEventProducer = costRollupEventProducer;
    }

    @KafkaListener(
            topics = KafkaConfig.USAGE_EVENTS_TOPIC,
            groupId = KafkaConfig.INGESTION_CONSUMER_GROUP,
            containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void consume(@Payload UsageEvent event) {
        log.info("Ingesting usage event: id={}, org={}, service={}, resource={}, cost={}",
                event.eventId(), event.organizationId(), event.serviceName(), event.resourceId(), event.cost());

        RawUsageRecord record = RawUsageRecord.fromEvent(event);
        rawUsageRepository.insert(record);

        // Calculate total hourly cost for this resource bucket
        Instant bucketStart = event.timestamp().truncatedTo(ChronoUnit.HOURS);
        Instant bucketEnd = bucketStart.plus(1, ChronoUnit.HOURS);
        BigDecimal totalBucketCost = rawUsageRepository.getHourlyTotalCost(
                event.organizationId(),
                event.serviceName(),
                event.resourceId(),
                event.timestamp()
        );

        CostRollupEvent rollupEvent = new CostRollupEvent(
                UUID.randomUUID(),
                event.organizationId(),
                event.serviceName(),
                event.resourceId(),
                bucketStart,
                bucketEnd,
                event.cost(),
                totalBucketCost,
                event.timestamp()
        );

        costRollupEventProducer.send(rollupEvent);
    }
}
