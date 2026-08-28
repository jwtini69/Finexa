package org.example.finexa.tenant;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class OrgUserRepository {

    private final JdbcClient jdbcClient;

    public OrgUserRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public OrgUser save(UUID id, UUID organizationId, String email, String passwordHash, Role role) {
        return jdbcClient.sql("""
                        INSERT INTO org_users (id, organization_id, email, password_hash, role)
                        VALUES (:id, :organizationId, :email, :passwordHash, :role)
                        RETURNING id, organization_id, email, password_hash, role, created_at
                        """)
                .param("id", id)
                .param("organizationId", organizationId)
                .param("email", normalizeEmail(email))
                .param("passwordHash", passwordHash)
                .param("role", role.name())
                .query(this::mapUser)
                .single();
    }

    public Optional<OrgUser> findByEmail(String email) {
        return jdbcClient.sql("""
                        SELECT id, organization_id, email, password_hash, role, created_at
                        FROM org_users
                        WHERE LOWER(email) = LOWER(:email)
                        """)
                .param("email", normalizeEmail(email))
                .query(this::mapUser)
                .optional();
    }

    public List<OrgUser> findAllByCurrentTenant() {
        return jdbcClient.sql("""
                        SELECT id, organization_id, email, password_hash, role, created_at
                        FROM org_users
                        WHERE organization_id = :organizationId
                        ORDER BY created_at ASC
                        """)
                .param("organizationId", TenantContext.requireOrganizationId())
                .query(this::mapUser)
                .list();
    }

    private OrgUser mapUser(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new OrgUser(
                rs.getObject("id", UUID.class),
                rs.getObject("organization_id", UUID.class),
                rs.getString("email"),
                rs.getString("password_hash"),
                Role.valueOf(rs.getString("role")),
                rs.getTimestamp("created_at").toInstant()
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
