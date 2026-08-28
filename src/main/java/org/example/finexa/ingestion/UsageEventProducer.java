package org.example.finexa.ingestion;

import java.util.concurrent.CompletableFuture;
import org.example.finexa.config.KafkaConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

@Component
public class UsageEventProducer {

    private static final Logger log = LoggerFactory.getLogger(UsageEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public UsageEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public CompletableFuture<SendResult<String, Object>> send(UsageEvent event) {
        String partitionKey = event.organizationId().toString();
        return kafkaTemplate.send(KafkaConfig.USAGE_EVENTS_TOPIC, partitionKey, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send usage event {} for tenant {}", event.eventId(), event.organizationId(), ex);
                    } else {
                        log.debug("Sent usage event {} partition {} offset {}",
                                event.eventId(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                });
    }
}
