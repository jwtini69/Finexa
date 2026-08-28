DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

CREATE TABLE raw_usage_records (
    id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_name VARCHAR(64) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    cost NUMERIC(12, 6) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        BEGIN
            PERFORM create_hypertable('raw_usage_records', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

CREATE INDEX ix_raw_usage_org_timestamp ON raw_usage_records (organization_id, timestamp DESC);
CREATE INDEX ix_raw_usage_org_service_resource ON raw_usage_records (organization_id, service_name, resource_id, timestamp DESC);
