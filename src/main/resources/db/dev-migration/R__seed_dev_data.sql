INSERT INTO organizations (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Finexa Demo Org', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO org_users (id, organization_id, email, password_hash, role, created_at)
VALUES
    (
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000001',
        'owner@finexa.dev',
        '{noop}password',
        'OWNER',
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000001',
        'admin@finexa.dev',
        '{noop}password',
        'ADMIN',
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000103',
        '00000000-0000-0000-0000-000000000001',
        'viewer@finexa.dev',
        '{noop}password',
        'VIEWER',
        NOW()
    )
ON CONFLICT (id) DO NOTHING;
