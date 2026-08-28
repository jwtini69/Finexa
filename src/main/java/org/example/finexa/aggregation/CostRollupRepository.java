package org.example.finexa.aggregation;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class CostRollupRepository {

    private final JdbcClient jdbcClient;

    public CostRollupRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public record RollupPoint(
            Instant bucketStart,
            Instant bucketEnd,
            String serviceName,
            String resourceId,
            BigDecimal totalCost,
            int eventCount,
            BigDecimal avgCost
    ) {}

    public record TimeseriesAggregate(
            Instant bucket,
            BigDecimal totalCost
    ) {}

    public record ServiceBreakdown(
            String serviceName,
            BigDecimal totalCost
    ) {}

    public record ResourceBreakdown(
            String serviceName,
            String resourceId,
            BigDecimal totalCost
    ) {}

    public List<TimeseriesAggregate> queryHourlyTimeseries(UUID organizationId, Instant from, Instant to) {
        return jdbcClient.sql("""
                SELECT bucket_start AS bucket, SUM(total_cost) AS total_cost
                FROM hourly_cost_rollups
                WHERE organization_id = :organizationId
                  AND bucket_start >= :from
                  AND bucket_start <= :to
                GROUP BY bucket_start
                ORDER BY bucket_start ASC
                """)
                .param("organizationId", organizationId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query((rs, rowNum) -> new TimeseriesAggregate(
                        rs.getTimestamp("bucket").toInstant(),
                        rs.getBigDecimal("total_cost")
                ))
                .list();
    }

    public List<TimeseriesAggregate> queryDailyTimeseries(UUID organizationId, Instant from, Instant to) {
        return jdbcClient.sql("""
                SELECT bucket_start AS bucket, SUM(total_cost) AS total_cost
                FROM daily_cost_rollups
                WHERE organization_id = :organizationId
                  AND bucket_start >= :from
                  AND bucket_start <= :to
                GROUP BY bucket_start
                ORDER BY bucket_start ASC
                """)
                .param("organizationId", organizationId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query((rs, rowNum) -> new TimeseriesAggregate(
                        rs.getTimestamp("bucket").toInstant(),
                        rs.getBigDecimal("total_cost")
                ))
                .list();
    }

    public List<ServiceBreakdown> queryServiceBreakdown(UUID organizationId, Instant from, Instant to) {
        return jdbcClient.sql("""
                SELECT service_name, SUM(total_cost) AS total_cost
                FROM hourly_cost_rollups
                WHERE organization_id = :organizationId
                  AND bucket_start >= :from
                  AND bucket_start <= :to
                GROUP BY service_name
                ORDER BY total_cost DESC
                """)
                .param("organizationId", organizationId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query((rs, rowNum) -> new ServiceBreakdown(
                        rs.getString("service_name"),
                        rs.getBigDecimal("total_cost")
                ))
                .list();
    }

    public List<ResourceBreakdown> queryResourceBreakdown(UUID organizationId, Instant from, Instant to) {
        return jdbcClient.sql("""
                SELECT service_name, resource_id, SUM(total_cost) AS total_cost
                FROM hourly_cost_rollups
                WHERE organization_id = :organizationId
                  AND bucket_start >= :from
                  AND bucket_start <= :to
                GROUP BY service_name, resource_id
                ORDER BY total_cost DESC
                LIMIT 50
                """)
                .param("organizationId", organizationId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query((rs, rowNum) -> new ResourceBreakdown(
                        rs.getString("service_name"),
                        rs.getString("resource_id"),
                        rs.getBigDecimal("total_cost")
                ))
                .list();
    }

    public List<RollupPoint> queryHourlyHistoryForResource(
            UUID organizationId,
            String serviceName,
            String resourceId,
            Instant from,
            Instant to
    ) {
        return jdbcClient.sql("""
                SELECT bucket_start, bucket_end, service_name, resource_id, total_cost, event_count, avg_cost
                FROM hourly_cost_rollups
                WHERE organization_id = :organizationId
                  AND service_name = :serviceName
                  AND resource_id = :resourceId
                  AND bucket_start >= :from
                  AND bucket_start <= :to
                ORDER BY bucket_start ASC
                """)
                .param("organizationId", organizationId)
                .param("serviceName", serviceName)
                .param("resourceId", resourceId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query((rs, rowNum) -> new RollupPoint(
                        rs.getTimestamp("bucket_start").toInstant(),
                        rs.getTimestamp("bucket_end").toInstant(),
                        rs.getString("service_name"),
                        rs.getString("resource_id"),
                        rs.getBigDecimal("total_cost"),
                        rs.getInt("event_count"),
                        rs.getBigDecimal("avg_cost")
                ))
                .list();
    }
}
