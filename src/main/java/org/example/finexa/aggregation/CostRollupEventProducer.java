package org.example.finexa.aggregation;

import org.example.finexa.config.KafkaConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class CostRollupEventProducer {

    private static final Logger log = LoggerFactory.getLogger(CostRollupEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public CostRollupEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void send(CostRollupEvent event) {
        String key = event.organizationId().toString();
        kafkaTemplate.send(KafkaConfig.COST_ROLLUP_EVENTS_TOPIC, key, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish cost rollup event {} for org {}", event.eventId(), event.organizationId(), ex);
                    } else {
                        log.debug("Published cost rollup event {} partition {} offset {}",
                                event.eventId(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                });
    }
}
