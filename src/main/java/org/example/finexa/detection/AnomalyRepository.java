package org.example.finexa.detection;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AnomalyRepository {

    private final JdbcClient jdbcClient;

    public AnomalyRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional
    public Anomaly save(Anomaly anomaly) {
        jdbcClient.sql("""
                INSERT INTO anomalies (
                    id, organization_id, service_name, resource_id, actual_cost, expected_cost,
                    deviation_percentage, z_score, severity, detection_stage, status, anomaly_timestamp, created_at
                ) VALUES (
                    :id, :organizationId, :serviceName, :resourceId, :actualCost, :expectedCost,
                    :deviationPercentage, :zScore, :severity, :detectionStage, :status, :anomalyTimestamp, :createdAt
                )
                """)
                .param("id", anomaly.id())
                .param("organizationId", anomaly.organizationId())
                .param("serviceName", anomaly.serviceName())
                .param("resourceId", anomaly.resourceId())
                .param("actualCost", anomaly.actualCost())
                .param("expectedCost", anomaly.expectedCost())
                .param("deviationPercentage", anomaly.deviationPercentage())
                .param("zScore", anomaly.zScore())
                .param("severity", anomaly.severity())
                .param("detectionStage", anomaly.detectionStage())
                .param("status", anomaly.status())
                .param("anomalyTimestamp", Timestamp.from(anomaly.anomalyTimestamp()))
                .param("createdAt", Timestamp.from(anomaly.createdAt()))
                .update();

        return anomaly;
    }

    public List<Anomaly> findAllByTenant(UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, organization_id, service_name, resource_id, actual_cost, expected_cost,
                       deviation_percentage, z_score, severity, detection_stage, status, anomaly_timestamp, created_at
                FROM anomalies
                WHERE organization_id = :organizationId
                ORDER BY anomaly_timestamp DESC
                """)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public List<Anomaly> findByTenantAndStatus(UUID organizationId, String status) {
        return jdbcClient.sql("""
                SELECT id, organization_id, service_name, resource_id, actual_cost, expected_cost,
                       deviation_percentage, z_score, severity, detection_stage, status, anomaly_timestamp, created_at
                FROM anomalies
                WHERE organization_id = :organizationId
                  AND status = :status
                ORDER BY anomaly_timestamp DESC
                """)
                .param("organizationId", organizationId)
                .param("status", status)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<Anomaly> findByIdAndTenant(UUID id, UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, organization_id, service_name, resource_id, actual_cost, expected_cost,
                       deviation_percentage, z_score, severity, detection_stage, status, anomaly_timestamp, created_at
                FROM anomalies
                WHERE id = :id
                  AND organization_id = :organizationId
                """)
                .param("id", id)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    @Transactional
    public boolean updateStatus(UUID id, UUID organizationId, String status) {
        int updated = jdbcClient.sql("""
                UPDATE anomalies
                SET status = :status
                WHERE id = :id
                  AND organization_id = :organizationId
                """)
                .param("id", id)
                .param("organizationId", organizationId)
                .param("status", status)
                .update();
        return updated > 0;
    }

    public int countRecentByTenant(UUID organizationId, Instant since) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM anomalies
                WHERE organization_id = :organizationId
                  AND created_at >= :since
                """)
                .param("organizationId", organizationId)
                .param("since", Timestamp.from(since))
                .query(Integer.class)
                .single();
        return count != null ? count : 0;
    }

    private Anomaly mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Anomaly(
                rs.getObject("id", UUID.class),
                rs.getObject("organization_id", UUID.class),
                rs.getString("service_name"),
                rs.getString("resource_id"),
                rs.getBigDecimal("actual_cost"),
                rs.getBigDecimal("expected_cost"),
                rs.getBigDecimal("deviation_percentage"),
                rs.getBigDecimal("z_score"),
                rs.getString("severity"),
                rs.getString("detection_stage"),
                rs.getString("status"),
                rs.getTimestamp("anomaly_timestamp").toInstant(),
                rs.getTimestamp("created_at").toInstant()
        );
    }
}
