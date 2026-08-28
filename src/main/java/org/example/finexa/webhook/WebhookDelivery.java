package org.example.finexa.webhook;

import java.time.Instant;
import java.util.UUID;

public record WebhookDelivery(
        UUID id,
        UUID eventId,
        UUID endpointId,
        UUID organizationId,
        String status,
        Integer httpStatusCode,
        String responseBody,
        int attemptCount,
        Instant deliveredAt
) {
    public WebhookDelivery {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (deliveredAt == null) {
            deliveredAt = Instant.now();
        }
    }
}
