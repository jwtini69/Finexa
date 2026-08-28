package org.example.finexa.webhook;

import java.time.Instant;
import java.util.UUID;

public record WebhookEndpoint(
        UUID id,
        UUID organizationId,
        String url,
        String secret,
        String events,
        String status,
        Instant createdAt
) {
    public WebhookEndpoint {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (events == null || events.isBlank()) {
            events = "BUDGET_THRESHOLD_CROSSED,ANOMALY_DETECTED";
        }
        if (status == null) {
            status = "ACTIVE";
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
