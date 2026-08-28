package org.example.finexa.budget;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record Budget(
        UUID id,
        UUID organizationId,
        String name,
        String scopeType,
        String scopeValue,
        BigDecimal capAmount,
        String period,
        String thresholdPercentages,
        BigDecimal currentSpend,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public Budget {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (currentSpend == null) {
            currentSpend = BigDecimal.ZERO;
        }
        if (status == null) {
            status = "ACTIVE";
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }
}
