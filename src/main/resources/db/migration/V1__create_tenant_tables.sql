CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE org_users (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_org_users_role CHECK (role IN ('OWNER', 'ADMIN', 'VIEWER'))
);

CREATE UNIQUE INDEX ux_org_users_email_lower ON org_users (LOWER(email));
CREATE INDEX ix_org_users_organization_id ON org_users (organization_id);
