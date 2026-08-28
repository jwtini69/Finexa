CREATE TABLE hourly_cost_rollups (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_name VARCHAR(64) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    bucket_start TIMESTAMPTZ NOT NULL,
    bucket_end TIMESTAMPTZ NOT NULL,
    total_cost NUMERIC(12, 6) NOT NULL,
    event_count INT NOT NULL DEFAULT 1,
    avg_cost NUMERIC(12, 6) NOT NULL,
    min_cost NUMERIC(12, 6) NOT NULL,
    max_cost NUMERIC(12, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_hourly_cost_rollups PRIMARY KEY (organization_id, service_name, resource_id, bucket_start)
);

CREATE TABLE daily_cost_rollups (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_name VARCHAR(64) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    bucket_start TIMESTAMPTZ NOT NULL,
    bucket_end TIMESTAMPTZ NOT NULL,
    total_cost NUMERIC(12, 6) NOT NULL,
    event_count INT NOT NULL DEFAULT 1,
    avg_cost NUMERIC(12, 6) NOT NULL,
    min_cost NUMERIC(12, 6) NOT NULL,
    max_cost NUMERIC(12, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_daily_cost_rollups PRIMARY KEY (organization_id, service_name, resource_id, bucket_start)
);

CREATE INDEX ix_hourly_rollups_org_bucket ON hourly_cost_rollups (organization_id, bucket_start DESC);
CREATE INDEX ix_hourly_rollups_org_service ON hourly_cost_rollups (organization_id, service_name, bucket_start DESC);
CREATE INDEX ix_daily_rollups_org_bucket ON daily_cost_rollups (organization_id, bucket_start DESC);
CREATE INDEX ix_daily_rollups_org_service ON daily_cost_rollups (organization_id, service_name, bucket_start DESC);
