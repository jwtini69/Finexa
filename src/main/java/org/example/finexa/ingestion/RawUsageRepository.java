package org.example.finexa.ingestion;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class RawUsageRepository {

    private final JdbcClient jdbcClient;

    public RawUsageRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional
    public void insert(RawUsageRecord record) {
        jdbcClient.sql("""
                INSERT INTO raw_usage_records (
                    id, organization_id, service_name, resource_id, cost, currency, timestamp, created_at
                ) VALUES (
                    :id, :organizationId, :serviceName, :resourceId, :cost, :currency, :timestamp, :createdAt
                )
                """)
                .param("id", record.id())
                .param("organizationId", record.organizationId())
                .param("serviceName", record.serviceName())
                .param("resourceId", record.resourceId())
                .param("cost", record.cost())
                .param("currency", record.currency())
                .param("timestamp", Timestamp.from(record.timestamp()))
                .param("createdAt", Timestamp.from(record.createdAt()))
                .update();

        updateRollups(record.organizationId(), record.serviceName(), record.resourceId(), record.timestamp(), record.cost());
    }

    @Transactional
    public void batchInsert(List<RawUsageRecord> records) {
        for (RawUsageRecord record : records) {
            insert(record);
        }
    }

    public List<RawUsageRecord> findByTenantAndDateRange(UUID organizationId, Instant from, Instant to) {
        return jdbcClient.sql("""
                SELECT id, organization_id, service_name, resource_id, cost, currency, timestamp, created_at
                FROM raw_usage_records
                WHERE organization_id = :organizationId
                  AND timestamp >= :from
                  AND timestamp <= :to
                ORDER BY timestamp DESC
                """)
                .param("organizationId", organizationId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query((rs, rowNum) -> new RawUsageRecord(
                        rs.getObject("id", UUID.class),
                        rs.getObject("organization_id", UUID.class),
                        rs.getString("service_name"),
                        rs.getString("resource_id"),
                        rs.getBigDecimal("cost"),
                        rs.getString("currency"),
                        rs.getTimestamp("timestamp").toInstant(),
                        rs.getTimestamp("created_at").toInstant()
                ))
                .list();
    }

    public List<RawUsageRecord> findByTenantServiceResourceAndDateRange(
            UUID organizationId,
            String serviceName,
            String resourceId,
            Instant from,
            Instant to
    ) {
        return jdbcClient.sql("""
                SELECT id, organization_id, service_name, resource_id, cost, currency, timestamp, created_at
                FROM raw_usage_records
                WHERE organization_id = :organizationId
                  AND service_name = :serviceName
                  AND resource_id = :resourceId
                  AND timestamp >= :from
                  AND timestamp <= :to
                ORDER BY timestamp ASC
                """)
                .param("organizationId", organizationId)
                .param("serviceName", serviceName)
                .param("resourceId", resourceId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query((rs, rowNum) -> new RawUsageRecord(
                        rs.getObject("id", UUID.class),
                        rs.getObject("organization_id", UUID.class),
                        rs.getString("service_name"),
                        rs.getString("resource_id"),
                        rs.getBigDecimal("cost"),
                        rs.getString("currency"),
                        rs.getTimestamp("timestamp").toInstant(),
                        rs.getTimestamp("created_at").toInstant()
                ))
                .list();
    }

    public BigDecimal sumCostByTenantAndPeriod(UUID organizationId, Instant from, Instant to) {
        BigDecimal sum = jdbcClient.sql("""
                SELECT COALESCE(SUM(cost), 0)
                FROM raw_usage_records
                WHERE organization_id = :organizationId
                  AND timestamp >= :from
                  AND timestamp <= :to
                """)
                .param("organizationId", organizationId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query(BigDecimal.class)
                .single();
        return sum != null ? sum : BigDecimal.ZERO;
    }

    public BigDecimal sumCostByTenantAndService(UUID organizationId, String serviceName, Instant from, Instant to) {
        BigDecimal sum = jdbcClient.sql("""
                SELECT COALESCE(SUM(cost), 0)
                FROM raw_usage_records
                WHERE organization_id = :organizationId
                  AND service_name = :serviceName
                  AND timestamp >= :from
                  AND timestamp <= :to
                """)
                .param("organizationId", organizationId)
                .param("serviceName", serviceName)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query(BigDecimal.class)
                .single();
        return sum != null ? sum : BigDecimal.ZERO;
    }

    public BigDecimal sumCostByTenantAndResource(UUID organizationId, String resourceId, Instant from, Instant to) {
        BigDecimal sum = jdbcClient.sql("""
                SELECT COALESCE(SUM(cost), 0)
                FROM raw_usage_records
                WHERE organization_id = :organizationId
                  AND resource_id = :resourceId
                  AND timestamp >= :from
                  AND timestamp <= :to
                """)
                .param("organizationId", organizationId)
                .param("resourceId", resourceId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query(BigDecimal.class)
                .single();
        return sum != null ? sum : BigDecimal.ZERO;
    }

    public BigDecimal getHourlyTotalCost(UUID organizationId, String serviceName, String resourceId, Instant timestamp) {
        Instant bucketStart = timestamp.truncatedTo(ChronoUnit.HOURS);
        Optional<BigDecimal> total = jdbcClient.sql("""
                SELECT total_cost
                FROM hourly_cost_rollups
                WHERE organization_id = :organizationId
                  AND service_name = :serviceName
                  AND resource_id = :resourceId
                  AND bucket_start = :bucketStart
                """)
                .param("organizationId", organizationId)
                .param("serviceName", serviceName)
                .param("resourceId", resourceId)
                .param("bucketStart", Timestamp.from(bucketStart))
                .query(BigDecimal.class)
                .optional();
        return total.orElse(BigDecimal.ZERO);
    }

    private void updateRollups(UUID organizationId, String serviceName, String resourceId, Instant timestamp, BigDecimal cost) {
        Instant hourStart = timestamp.truncatedTo(ChronoUnit.HOURS);
        Instant hourEnd = hourStart.plus(1, ChronoUnit.HOURS);
        Instant dayStart = timestamp.truncatedTo(ChronoUnit.DAYS);
        Instant dayEnd = dayStart.plus(1, ChronoUnit.DAYS);

        // Upsert hourly rollup
        jdbcClient.sql("""
                INSERT INTO hourly_cost_rollups (
                    organization_id, service_name, resource_id, bucket_start, bucket_end,
                    total_cost, event_count, avg_cost, min_cost, max_cost, updated_at
                ) VALUES (
                    :organizationId, :serviceName, :resourceId, :bucketStart, :bucketEnd,
                    :cost, 1, :cost, :cost, :cost, NOW()
                )
                ON CONFLICT (organization_id, service_name, resource_id, bucket_start)
                DO UPDATE SET
                    total_cost = hourly_cost_rollups.total_cost + EXCLUDED.total_cost,
                    event_count = hourly_cost_rollups.event_count + 1,
                    avg_cost = (hourly_cost_rollups.total_cost + EXCLUDED.total_cost) / (hourly_cost_rollups.event_count + 1),
                    min_cost = LEAST(hourly_cost_rollups.min_cost, EXCLUDED.min_cost),
                    max_cost = GREATEST(hourly_cost_rollups.max_cost, EXCLUDED.max_cost),
                    updated_at = NOW()
                """)
                .param("organizationId", organizationId)
                .param("serviceName", serviceName)
                .param("resourceId", resourceId)
                .param("bucketStart", Timestamp.from(hourStart))
                .param("bucketEnd", Timestamp.from(hourEnd))
                .param("cost", cost)
                .update();

        // Upsert daily rollup
        jdbcClient.sql("""
                INSERT INTO daily_cost_rollups (
                    organization_id, service_name, resource_id, bucket_start, bucket_end,
                    total_cost, event_count, avg_cost, min_cost, max_cost, updated_at
                ) VALUES (
                    :organizationId, :serviceName, :resourceId, :bucketStart, :bucketEnd,
                    :cost, 1, :cost, :cost, :cost, NOW()
                )
                ON CONFLICT (organization_id, service_name, resource_id, bucket_start)
                DO UPDATE SET
                    total_cost = daily_cost_rollups.total_cost + EXCLUDED.total_cost,
                    event_count = daily_cost_rollups.event_count + 1,
                    avg_cost = (daily_cost_rollups.total_cost + EXCLUDED.total_cost) / (daily_cost_rollups.event_count + 1),
                    min_cost = LEAST(daily_cost_rollups.min_cost, EXCLUDED.min_cost),
                    max_cost = GREATEST(daily_cost_rollups.max_cost, EXCLUDED.max_cost),
                    updated_at = NOW()
                """)
                .param("organizationId", organizationId)
                .param("serviceName", serviceName)
                .param("resourceId", resourceId)
                .param("bucketStart", Timestamp.from(dayStart))
                .param("bucketEnd", Timestamp.from(dayEnd))
                .param("cost", cost)
                .update();
    }
}
