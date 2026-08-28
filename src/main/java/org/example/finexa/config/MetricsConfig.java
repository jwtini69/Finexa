package org.example.finexa.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {

    @Bean
    public Counter ingestedEventsCounter(MeterRegistry registry) {
        return Counter.builder("finexa.usage.events.ingested")
                .description("Total number of raw cloud usage events ingested")
                .register(registry);
    }

    @Bean
    public Counter anomaliesDetectedCounter(MeterRegistry registry) {
        return Counter.builder("finexa.anomalies.detected")
                .description("Total number of spend anomalies detected")
                .register(registry);
    }

    @Bean
    public Counter outboxPublishedCounter(MeterRegistry registry) {
        return Counter.builder("finexa.outbox.events.published")
                .description("Total number of outbox events published to Kafka")
                .register(registry);
    }
}
