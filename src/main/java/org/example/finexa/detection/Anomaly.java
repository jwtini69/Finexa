package org.example.finexa.detection;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record Anomaly(
        UUID id,
        UUID organizationId,
        String serviceName,
        String resourceId,
        BigDecimal actualCost,
        BigDecimal expectedCost,
        BigDecimal deviationPercentage,
        BigDecimal zScore,
        String severity,
        String detectionStage,
        String status,
        Instant anomalyTimestamp,
        Instant createdAt
) {
    public Anomaly {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (status == null) {
            status = "OPEN";
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
