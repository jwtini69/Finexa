package org.example.finexa.webhook;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class WebhookEndpointRepository {

    private final JdbcClient jdbcClient;

    public WebhookEndpointRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional
    public WebhookEndpoint save(WebhookEndpoint endpoint) {
        jdbcClient.sql("""
                INSERT INTO webhook_endpoints (
                    id, organization_id, url, secret, events, status, created_at
                ) VALUES (
                    :id, :organizationId, :url, :secret, :events, :status, :createdAt
                )
                """)
                .param("id", endpoint.id())
                .param("organizationId", endpoint.organizationId())
                .param("url", endpoint.url())
                .param("secret", endpoint.secret())
                .param("events", endpoint.events())
                .param("status", endpoint.status())
                .param("createdAt", Timestamp.from(endpoint.createdAt()))
                .update();

        return endpoint;
    }

    public List<WebhookEndpoint> findAllByTenant(UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, organization_id, url, secret, events, status, created_at
                FROM webhook_endpoints
                WHERE organization_id = :organizationId
                ORDER BY created_at DESC
                """)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public List<WebhookEndpoint> findActiveByTenant(UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, organization_id, url, secret, events, status, created_at
                FROM webhook_endpoints
                WHERE organization_id = :organizationId
                  AND status = 'ACTIVE'
                """)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<WebhookEndpoint> findByIdAndTenant(UUID id, UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, organization_id, url, secret, events, status, created_at
                FROM webhook_endpoints
                WHERE id = :id
                  AND organization_id = :organizationId
                """)
                .param("id", id)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    @Transactional
    public boolean deleteByIdAndTenant(UUID id, UUID organizationId) {
        int rows = jdbcClient.sql("""
                DELETE FROM webhook_endpoints
                WHERE id = :id
                  AND organization_id = :organizationId
                """)
                .param("id", id)
                .param("organizationId", organizationId)
                .update();
        return rows > 0;
    }

    private WebhookEndpoint mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new WebhookEndpoint(
                rs.getObject("id", UUID.class),
                rs.getObject("organization_id", UUID.class),
                rs.getString("url"),
                rs.getString("secret"),
                rs.getString("events"),
                rs.getString("status"),
                rs.getTimestamp("created_at").toInstant()
        );
    }
}
