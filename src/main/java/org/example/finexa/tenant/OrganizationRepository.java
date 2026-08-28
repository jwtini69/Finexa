package org.example.finexa.tenant;

import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class OrganizationRepository {

    private final JdbcClient jdbcClient;

    public OrganizationRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Organization save(UUID id, String name) {
        return jdbcClient.sql("""
                        INSERT INTO organizations (id, name)
                        VALUES (:id, :name)
                        RETURNING id, name, created_at
                        """)
                .param("id", id)
                .param("name", name)
                .query((rs, rowNum) -> new Organization(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getTimestamp("created_at").toInstant()
                ))
                .single();
    }

    public Optional<Organization> findByTenant() {
        return findById(TenantContext.requireOrganizationId());
    }

    public Optional<Organization> findById(UUID organizationId) {
        return jdbcClient.sql("""
                        SELECT id, name, created_at
                        FROM organizations
                        WHERE id = :id
                        """)
                .param("id", organizationId)
                .query((rs, rowNum) -> new Organization(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getTimestamp("created_at").toInstant()
                ))
                .optional();
    }

    public java.util.List<Organization> findAll() {
        return jdbcClient.sql("""
                        SELECT id, name, created_at
                        FROM organizations
                        ORDER BY created_at ASC
                        """)
                .query((rs, rowNum) -> new Organization(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getTimestamp("created_at").toInstant()
                ))
                .list();
    }
}
