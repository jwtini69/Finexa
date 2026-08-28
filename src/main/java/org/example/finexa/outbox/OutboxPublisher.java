package org.example.finexa.outbox;

import java.util.List;
import org.example.finexa.config.KafkaConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public OutboxPublisher(OutboxRepository outboxRepository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.outboxRepository = outboxRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelay = 500)
    public void publishPendingEvents() {
        try {
            List<OutboxEvent> pendingEvents = outboxRepository.findPendingEvents(50);
            if (pendingEvents == null || pendingEvents.isEmpty()) {
                return;
            }

            for (OutboxEvent event : pendingEvents) {
                publishSingleEvent(event);
            }
        } catch (Exception ex) {
            log.debug("Outbox publisher tick encountered error (e.g. during shutdown/reconnect): {}", ex.getMessage());
        }
    }

    public void publishSingleEvent(OutboxEvent event) {
        String partitionKey = event.organizationId().toString();
        try {
            kafkaTemplate.send(KafkaConfig.WEBHOOK_OUTBOX_EVENTS_TOPIC, partitionKey, event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("Failed to publish outbox event {} to Kafka", event.id(), ex);
                            outboxRepository.incrementRetry(event.id());
                        } else {
                            outboxRepository.markPublished(event.id());
                            log.debug("Outbox event {} published to Kafka topic {} partition {}",
                                    event.id(),
                                    KafkaConfig.WEBHOOK_OUTBOX_EVENTS_TOPIC,
                                    result.getRecordMetadata().partition());
                        }
                    });
        } catch (Exception ex) {
            log.error("Error initiating Kafka send for outbox event {}", event.id(), ex);
            outboxRepository.incrementRetry(event.id());
        }
    }
}
