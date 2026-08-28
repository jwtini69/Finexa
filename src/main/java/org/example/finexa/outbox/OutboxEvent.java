package org.example.finexa.outbox;

import java.time.Instant;
import java.util.UUID;

public record OutboxEvent(
        UUID id,
        UUID organizationId,
        String eventType,
        String aggregateType,
        String aggregateId,
        String payload,
        String status,
        int retryCount,
        Instant createdAt,
        Instant publishedAt
) {
    public OutboxEvent {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (status == null) {
            status = "PENDING";
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public static OutboxEvent pending(
            UUID organizationId,
            String eventType,
            String aggregateType,
            String aggregateId,
            String payload
    ) {
        return new OutboxEvent(
                UUID.randomUUID(),
                organizationId,
                eventType,
                aggregateType,
                aggregateId,
                payload,
                "PENDING",
                0,
                Instant.now(),
                null
        );
    }
}
