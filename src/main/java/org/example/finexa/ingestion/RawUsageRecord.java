package org.example.finexa.ingestion;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RawUsageRecord(
        UUID id,
        UUID organizationId,
        String serviceName,
        String resourceId,
        BigDecimal cost,
        String currency,
        Instant timestamp,
        Instant createdAt
) {
    public static RawUsageRecord fromEvent(UsageEvent event) {
        return new RawUsageRecord(
                event.eventId(),
                event.organizationId(),
                event.serviceName(),
                event.resourceId(),
                event.cost(),
                event.currency(),
                event.timestamp(),
                Instant.now()
        );
    }
}
