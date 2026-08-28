package org.example.finexa.ingestion;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record UsageEvent(
        UUID eventId,
        UUID organizationId,
        String serviceName,
        String resourceId,
        BigDecimal cost,
        String currency,
        Instant timestamp
) {
    public UsageEvent {
        if (eventId == null) {
            eventId = UUID.randomUUID();
        }
        if (currency == null || currency.isBlank()) {
            currency = "USD";
        }
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }
}
