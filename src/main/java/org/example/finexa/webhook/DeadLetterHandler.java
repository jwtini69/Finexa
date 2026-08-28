package org.example.finexa.webhook;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.example.finexa.outbox.OutboxEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DeadLetterHandler {

    private static final Logger log = LoggerFactory.getLogger(DeadLetterHandler.class);

    private final JdbcClient jdbcClient;

    public DeadLetterHandler(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional
    public void handleExhaustedRetries(OutboxEvent event, WebhookEndpoint endpoint, int attempts, String lastError) {
        log.error("DEAD LETTER DELIVERY: Exhausted {} retries for event {} to endpoint {} (org={}). Error: {}",
                attempts, event.id(), endpoint.url(), event.organizationId(), lastError);

        jdbcClient.sql("""
                INSERT INTO dead_letter_deliveries (
                    id, event_id, endpoint_id, organization_id, last_error, attempts, failed_at
                ) VALUES (
                    :id, :eventId, :endpointId, :organizationId, :lastError, :attempts, :failedAt
                )
                """)
                .param("id", UUID.randomUUID())
                .param("eventId", event.id())
                .param("endpointId", endpoint.id())
                .param("organizationId", event.organizationId())
                .param("lastError", lastError != null ? lastError : "Max retries exceeded")
                .param("attempts", attempts)
                .param("failedAt", Timestamp.from(Instant.now()))
                .update();
    }
}
