CREATE TABLE anomalies (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_name VARCHAR(64) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    actual_cost NUMERIC(12, 6) NOT NULL,
    expected_cost NUMERIC(12, 6) NOT NULL,
    deviation_percentage NUMERIC(16, 2) NOT NULL,
    z_score NUMERIC(16, 4) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    detection_stage VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    anomaly_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_anomalies_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT ck_anomalies_detection_stage CHECK (detection_stage IN ('NAIVE', 'SEASONAL')),
    CONSTRAINT ck_anomalies_status CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED'))
);

CREATE INDEX ix_anomalies_org_timestamp ON anomalies (organization_id, anomaly_timestamp DESC);
CREATE INDEX ix_anomalies_org_status ON anomalies (organization_id, status);

CREATE TABLE budgets (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    scope_type VARCHAR(32) NOT NULL,
    scope_value VARCHAR(255),
    cap_amount NUMERIC(12, 2) NOT NULL,
    period VARCHAR(16) NOT NULL,
    threshold_percentages VARCHAR(64) NOT NULL,
    current_spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_budgets_scope_type CHECK (scope_type IN ('ORGANIZATION', 'SERVICE', 'RESOURCE')),
    CONSTRAINT ck_budgets_period CHECK (period IN ('DAILY', 'MONTHLY')),
    CONSTRAINT ck_budgets_status CHECK (status IN ('ACTIVE', 'EXCEEDED', 'DISABLED'))
);

CREATE INDEX ix_budgets_org ON budgets (organization_id);
