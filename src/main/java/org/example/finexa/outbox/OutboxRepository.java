package org.example.finexa.outbox;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class OutboxRepository {

    private final JdbcClient jdbcClient;

    public OutboxRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional
    public OutboxEvent save(OutboxEvent event) {
        jdbcClient.sql("""
                INSERT INTO outbox_events (
                    id, organization_id, event_type, aggregate_type, aggregate_id,
                    payload, status, retry_count, created_at, published_at
                ) VALUES (
                    :id, :organizationId, :eventType, :aggregateType, :aggregateId,
                    CAST(:payload AS JSONB), :status, :retryCount, :createdAt, :publishedAt
                )
                """)
                .param("id", event.id())
                .param("organizationId", event.organizationId())
                .param("eventType", event.eventType())
                .param("aggregateType", event.aggregateType())
                .param("aggregateId", event.aggregateId())
                .param("payload", event.payload())
                .param("status", event.status())
                .param("retryCount", event.retryCount())
                .param("createdAt", Timestamp.from(event.createdAt()))
                .param("publishedAt", event.publishedAt() != null ? Timestamp.from(event.publishedAt()) : null)
                .update();

        return event;
    }

    public List<OutboxEvent> findPendingEvents(int limit) {
        return jdbcClient.sql("""
                SELECT id, organization_id, event_type, aggregate_type, aggregate_id,
                       payload::text AS payload, status, retry_count, created_at, published_at
                FROM outbox_events
                WHERE status = 'PENDING'
                ORDER BY created_at ASC
                LIMIT :limit
                """)
                .param("limit", limit)
                .query((rs, rowNum) -> mapRow(rs))
                .list();
    }

    public Optional<OutboxEvent> findById(UUID id) {
        return jdbcClient.sql("""
                SELECT id, organization_id, event_type, aggregate_type, aggregate_id,
                       payload::text AS payload, status, retry_count, created_at, published_at
                FROM outbox_events
                WHERE id = :id
                """)
                .param("id", id)
                .query((rs, rowNum) -> mapRow(rs))
                .optional();
    }

    @Transactional
    public void markPublished(UUID id) {
        jdbcClient.sql("""
                UPDATE outbox_events
                SET status = 'PUBLISHED', published_at = NOW()
                WHERE id = :id
                """)
                .param("id", id)
                .update();
    }

    @Transactional
    public void markFailed(UUID id) {
        jdbcClient.sql("""
                UPDATE outbox_events
                SET status = 'FAILED', retry_count = retry_count + 1
                WHERE id = :id
                """)
                .param("id", id)
                .update();
    }

    @Transactional
    public void incrementRetry(UUID id) {
        jdbcClient.sql("""
                UPDATE outbox_events
                SET retry_count = retry_count + 1
                WHERE id = :id
                """)
                .param("id", id)
                .update();
    }

    private OutboxEvent mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Timestamp pubTs = rs.getTimestamp("published_at");
        return new OutboxEvent(
                rs.getObject("id", UUID.class),
                rs.getObject("organization_id", UUID.class),
                rs.getString("event_type"),
                rs.getString("aggregate_type"),
                rs.getString("aggregateId" != null ? "aggregate_id" : "aggregate_id"),
                rs.getString("payload"),
                rs.getString("status"),
                rs.getInt("retry_count"),
                rs.getTimestamp("created_at").toInstant(),
                pubTs != null ? pubTs.toInstant() : null
        );
    }
}
