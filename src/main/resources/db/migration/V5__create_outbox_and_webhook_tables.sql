CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    CONSTRAINT ck_outbox_status CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED'))
);

CREATE INDEX ix_outbox_status_created ON outbox_events (status, created_at ASC);
CREATE INDEX ix_outbox_org ON outbox_events (organization_id);

CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url VARCHAR(1024) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events VARCHAR(255) NOT NULL DEFAULT 'BUDGET_THRESHOLD_CROSSED,ANOMALY_DETECTED',
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_webhook_endpoints_status CHECK (status IN ('ACTIVE', 'DISABLED'))
);

CREATE INDEX ix_webhook_endpoints_org ON webhook_endpoints (organization_id);

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES outbox_events(id) ON DELETE CASCADE,
    endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL,
    http_status_code INT,
    response_body TEXT,
    attempt_count INT NOT NULL DEFAULT 1,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_webhook_deliveries_status CHECK (status IN ('SUCCESS', 'FAILED', 'DEAD_LETTER'))
);

CREATE UNIQUE INDEX ux_webhook_delivery_event_endpoint ON webhook_deliveries(event_id, endpoint_id);
CREATE INDEX ix_webhook_deliveries_org ON webhook_deliveries (organization_id);

CREATE TABLE dead_letter_deliveries (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    endpoint_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    last_error TEXT,
    attempts INT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_dead_letter_org ON dead_letter_deliveries (organization_id);
