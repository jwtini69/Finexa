package org.example.finexa.aggregation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CostRollupEvent(
        UUID eventId,
        UUID organizationId,
        String serviceName,
        String resourceId,
        Instant bucketStart,
        Instant bucketEnd,
        BigDecimal cost,
        BigDecimal totalBucketCost,
        Instant timestamp
) {
    public CostRollupEvent {
        if (eventId == null) {
            eventId = UUID.randomUUID();
        }
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }
}
