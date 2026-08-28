package org.example.finexa.budget;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class BudgetRepository {

    private final JdbcClient jdbcClient;

    public BudgetRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional
    public Budget save(Budget budget) {
        jdbcClient.sql("""
                INSERT INTO budgets (
                    id, organization_id, name, scope_type, scope_value,
                    cap_amount, period, threshold_percentages, current_spend, status, created_at, updated_at
                ) VALUES (
                    :id, :organizationId, :name, :scopeType, :scopeValue,
                    :capAmount, :period, :thresholdPercentages, :currentSpend, :status, :createdAt, :updatedAt
                )
                """)
                .param("id", budget.id())
                .param("organizationId", budget.organizationId())
                .param("name", budget.name())
                .param("scopeType", budget.scopeType())
                .param("scopeValue", budget.scopeValue())
                .param("capAmount", budget.capAmount())
                .param("period", budget.period())
                .param("thresholdPercentages", budget.thresholdPercentages())
                .param("currentSpend", budget.currentSpend())
                .param("status", budget.status())
                .param("createdAt", Timestamp.from(budget.createdAt()))
                .param("updatedAt", Timestamp.from(budget.updatedAt()))
                .update();

        return budget;
    }

    public List<Budget> findAllByTenant(UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, organization_id, name, scope_type, scope_value,
                       cap_amount, period, threshold_percentages, current_spend, status, created_at, updated_at
                FROM budgets
                WHERE organization_id = :organizationId
                ORDER BY created_at DESC
                """)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public List<Budget> findActiveByTenant(UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, organization_id, name, scope_type, scope_value,
                       cap_amount, period, threshold_percentages, current_spend, status, created_at, updated_at
                FROM budgets
                WHERE organization_id = :organizationId
                  AND status != 'DISABLED'
                """)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<Budget> findByIdAndTenant(UUID id, UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, organization_id, name, scope_type, scope_value,
                       cap_amount, period, threshold_percentages, current_spend, status, created_at, updated_at
                FROM budgets
                WHERE id = :id
                  AND organization_id = :organizationId
                """)
                .param("id", id)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    @Transactional
    public void updateSpendAndStatus(UUID id, BigDecimal currentSpend, String status) {
        jdbcClient.sql("""
                UPDATE budgets
                SET current_spend = :currentSpend, status = :status, updated_at = NOW()
                WHERE id = :id
                """)
                .param("id", id)
                .param("currentSpend", currentSpend)
                .param("status", status)
                .update();
    }

    @Transactional
    public boolean deleteByIdAndTenant(UUID id, UUID organizationId) {
        int rows = jdbcClient.sql("""
                DELETE FROM budgets
                WHERE id = :id
                  AND organization_id = :organizationId
                """)
                .param("id", id)
                .param("organizationId", organizationId)
                .update();
        return rows > 0;
    }

    private Budget mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Budget(
                rs.getObject("id", UUID.class),
                rs.getObject("organization_id", UUID.class),
                rs.getString("name"),
                rs.getString("scope_type"),
                rs.getString("scope_value"),
                rs.getBigDecimal("cap_amount"),
                rs.getString("period"),
                rs.getString("threshold_percentages"),
                rs.getBigDecimal("current_spend"),
                rs.getString("status"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant()
        );
    }
}
