package org.example.finexa.webhook;

import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.example.finexa.config.KafkaConfig;
import org.example.finexa.outbox.OutboxEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
public class WebhookDispatcher {

    private static final Logger log = LoggerFactory.getLogger(WebhookDispatcher.class);

    private final WebhookEndpointRepository endpointRepository;
    private final WebhookDeliveryRepository deliveryRepository;
    private final DeadLetterHandler deadLetterHandler;
    private final WebhookHttpClient webhookHttpClient;
    private final Retry retryPolicy;

    public WebhookDispatcher(
            WebhookEndpointRepository endpointRepository,
            WebhookDeliveryRepository deliveryRepository,
            DeadLetterHandler deadLetterHandler,
            WebhookHttpClient webhookHttpClient
    ) {
        this.endpointRepository = endpointRepository;
        this.deliveryRepository = deliveryRepository;
        this.deadLetterHandler = deadLetterHandler;
        this.webhookHttpClient = webhookHttpClient;

        RetryConfig config = RetryConfig.custom()
                .maxAttempts(3)
                .intervalFunction(io.github.resilience4j.core.IntervalFunction.ofExponentialBackoff(100L, 2.0d))
                .retryOnException(e -> true)
                .build();
        this.retryPolicy = RetryRegistry.of(config).retry("webhookRetry");
    }

    @KafkaListener(
            topics = KafkaConfig.WEBHOOK_OUTBOX_EVENTS_TOPIC,
            groupId = KafkaConfig.WEBHOOK_DISPATCHER_GROUP,
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void dispatch(@Payload OutboxEvent event) {
        log.info("Processing outbox event for webhook dispatch: id={}, org={}, type={}",
                event.id(), event.organizationId(), event.eventType());

        List<WebhookEndpoint> endpoints = endpointRepository.findActiveByTenant(event.organizationId());
        if (endpoints.isEmpty()) {
            log.debug("No active webhook endpoints for org {}", event.organizationId());
            return;
        }

        for (WebhookEndpoint endpoint : endpoints) {
            if (isSubscribed(endpoint, event.eventType())) {
                dispatchToEndpoint(event, endpoint);
            }
        }
    }

    public void dispatchToEndpoint(OutboxEvent event, WebhookEndpoint endpoint) {
        // Fast-path idempotency check
        if (deliveryRepository.findByEventAndEndpoint(event.id(), endpoint.id()).isPresent()) {
            log.info("Webhook for event {} and endpoint {} already delivered. Skipping.", event.id(), endpoint.id());
            return;
        }

        int attemptCount = 0;
        Exception lastException = null;
        WebhookHttpClient.HttpResponseResult lastResult = null;

        for (int i = 1; i <= 3; i++) {
            attemptCount = i;
            try {
                lastResult = webhookHttpClient.post(endpoint.url(), endpoint.secret(), event.payload());
                if (lastResult.statusCode() >= 200 && lastResult.statusCode() < 300) {
                    // Success!
                    WebhookDelivery delivery = new WebhookDelivery(
                            UUID.randomUUID(),
                            event.id(),
                            endpoint.id(),
                            event.organizationId(),
                            "SUCCESS",
                            lastResult.statusCode(),
                            lastResult.body(),
                            attemptCount,
                            Instant.now()
                    );
                    deliveryRepository.insertDeliverySafely(delivery);
                    log.info("Successfully delivered webhook event {} to {} on attempt {}", event.id(), endpoint.url(), attemptCount);
                    return;
                } else {
                    log.warn("Webhook attempt {} to {} returned non-2xx status: {}", attemptCount, endpoint.url(), lastResult.statusCode());
                    if (i < 3) {
                        Thread.sleep(100L * (1L << (i - 1))); // Exponential backoff: 100ms, 200ms
                    }
                }
            } catch (Exception ex) {
                lastException = ex;
                log.warn("Webhook attempt {} to {} failed with error: {}", attemptCount, endpoint.url(), ex.getMessage());
                if (i < 3) {
                    try {
                        Thread.sleep(100L * (1L << (i - 1)));
                    } catch (InterruptedException ignored) {}
                }
            }
        }

        // Exhausted retries -> Dead Letter
        String errorMsg = lastResult != null
                ? "HTTP " + lastResult.statusCode() + ": " + lastResult.body()
                : (lastException != null ? lastException.getMessage() : "Unknown delivery error");

        deadLetterHandler.handleExhaustedRetries(event, endpoint, attemptCount, errorMsg);

        WebhookDelivery failedDelivery = new WebhookDelivery(
                UUID.randomUUID(),
                event.id(),
                endpoint.id(),
                event.organizationId(),
                "DEAD_LETTER",
                lastResult != null ? lastResult.statusCode() : 500,
                errorMsg,
                attemptCount,
                Instant.now()
        );
        deliveryRepository.insertDeliverySafely(failedDelivery);
    }

    private boolean isSubscribed(WebhookEndpoint endpoint, String eventType) {
        if (endpoint.events() == null || endpoint.events().isBlank() || "*".equals(endpoint.events())) {
            return true;
        }
        for (String subscribed : endpoint.events().split(",")) {
            if (subscribed.trim().equalsIgnoreCase(eventType)) {
                return true;
            }
        }
        return false;
    }
}
