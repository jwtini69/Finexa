package org.example.finexa.webhook;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class WebhookDeliveryRepository {

    private static final Logger log = LoggerFactory.getLogger(WebhookDeliveryRepository.class);

    private final JdbcClient jdbcClient;

    public WebhookDeliveryRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional
    public boolean insertDeliverySafely(WebhookDelivery delivery) {
        try {
            int inserted = jdbcClient.sql("""
                    INSERT INTO webhook_deliveries (
                        id, event_id, endpoint_id, organization_id, status,
                        http_status_code, response_body, attempt_count, delivered_at
                    ) VALUES (
                        :id, :eventId, :endpointId, :organizationId, :status,
                        :httpStatusCode, :responseBody, :attemptCount, :deliveredAt
                    )
                    ON CONFLICT (event_id, endpoint_id) DO NOTHING
                    """)
                    .param("id", delivery.id())
                    .param("eventId", delivery.eventId())
                    .param("endpointId", delivery.endpointId())
                    .param("organizationId", delivery.organizationId())
                    .param("status", delivery.status())
                    .param("httpStatusCode", delivery.httpStatusCode())
                    .param("responseBody", delivery.responseBody())
                    .param("attemptCount", delivery.attemptCount())
                    .param("deliveredAt", Timestamp.from(delivery.deliveredAt()))
                    .update();

            return inserted > 0;
        } catch (DataIntegrityViolationException ex) {
            log.info("Duplicate webhook delivery suppressed by database uniqueness constraint for event {} endpoint {}",
                    delivery.eventId(), delivery.endpointId());
            return false;
        }
    }

    public Optional<WebhookDelivery> findByEventAndEndpoint(UUID eventId, UUID endpointId) {
        return jdbcClient.sql("""
                SELECT id, event_id, endpoint_id, organization_id, status,
                       http_status_code, response_body, attempt_count, delivered_at
                FROM webhook_deliveries
                WHERE event_id = :eventId AND endpoint_id = :endpointId
                """)
                .param("eventId", eventId)
                .param("endpointId", endpointId)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    public List<WebhookDelivery> findAllByTenant(UUID organizationId) {
        return jdbcClient.sql("""
                SELECT id, event_id, endpoint_id, organization_id, status,
                       http_status_code, response_body, attempt_count, delivered_at
                FROM webhook_deliveries
                WHERE organization_id = :organizationId
                ORDER BY delivered_at DESC
                LIMIT 100
                """)
                .param("organizationId", organizationId)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    private WebhookDelivery mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new WebhookDelivery(
                rs.getObject("id", UUID.class),
                rs.getObject("event_id", UUID.class),
                rs.getObject("endpoint_id", UUID.class),
                rs.getObject("organization_id", UUID.class),
                rs.getString("status"),
                (Integer) rs.getObject("http_status_code"),
                rs.getString("response_body"),
                rs.getInt("attempt_count"),
                rs.getTimestamp("delivered_at").toInstant()
        );
    }
}
