package org.example.finexa.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@org.springframework.test.annotation.DirtiesContext
class AuthAndTenantIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("finexa")
            .withUsername("finexa")
            .withPassword("finexa");

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcClient jdbcClient;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("finexa.security.jwt-secret", () -> "test-secret-with-at-least-thirty-two-bytes");
    }

    @Test
    void registrationCreatesOneOrganizationAndOneOwnerAtomically() throws Exception {
        Map<String, Object> response = register("Acme Cloud", "owner-acme@example.com", "strong-password");

        assertThat(response.get("organization_id")).isNotNull();
        assertThat(response.get("owner_user_id")).isNotNull();

        Integer organizationCount = jdbcClient.sql("SELECT COUNT(*) FROM organizations WHERE name = :name")
                .param("name", "Acme Cloud")
                .query(Integer.class)
                .single();
        Integer ownerCount = jdbcClient.sql("""
                        SELECT COUNT(*)
                        FROM org_users
                        WHERE organization_id = :organizationId
                          AND email = :email
                          AND role = 'OWNER'
                        """)
                .param("organizationId", java.util.UUID.fromString(response.get("organization_id").toString()))
                .param("email", "owner-acme@example.com")
                .query(Integer.class)
                .single();

        assertThat(organizationCount).isEqualTo(1);
        assertThat(ownerCount).isEqualTo(1);
    }

    @Test
    void registrationRollsBackOrganizationWhenOwnerEmailConflicts() throws Exception {
        register("Conflict One", "duplicate-owner@example.com", "strong-password");

        mockMvc.perform(post("/api/orgs/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "organization_name": "Conflict Two",
                                  "owner_email": "duplicate-owner@example.com",
                                  "password": "strong-password"
                                }
                                """))
                .andExpect(status().isConflict());

        Integer leakedOrganizationCount = jdbcClient.sql("SELECT COUNT(*) FROM organizations WHERE name = :name")
                .param("name", "Conflict Two")
                .query(Integer.class)
                .single();

        assertThat(leakedOrganizationCount).isZero();
    }

    @Test
    void userCannotReadAnotherOrganizationEvenWhenIdIsGuessed() throws Exception {
        Map<String, Object> orgA = register("Tenant A", "owner-a@example.com", "strong-password");
        Map<String, Object> orgB = register("Tenant B", "owner-b@example.com", "strong-password");
        String orgAToken = login("owner-a@example.com", "strong-password").get("access_token").toString();

        mockMvc.perform(get("/api/orgs/{organizationId}", orgB.get("organization_id"))
                        .header("Authorization", "Bearer " + orgAToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/orgs/{organizationId}", orgA.get("organization_id"))
                        .header("Authorization", "Bearer " + orgAToken))
                .andExpect(status().isOk());
    }

    @Test
    void viewerCannotUseConfigurationWriteEndpoint() throws Exception {
        register("Rbac Tenant", "owner-rbac@example.com", "strong-password");
        String ownerToken = login("owner-rbac@example.com", "strong-password").get("access_token").toString();

        mockMvc.perform(post("/api/orgs/users")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "viewer-rbac@example.com",
                                  "password": "strong-password",
                                  "role": "VIEWER"
                                }
                                """))
                .andExpect(status().isCreated());

        String viewerToken = login("viewer-rbac@example.com", "strong-password").get("access_token").toString();

        mockMvc.perform(post("/api/orgs/users")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "blocked@example.com",
                                  "password": "strong-password",
                                  "role": "ADMIN"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    private Map<String, Object> register(String organizationName, String ownerEmail, String password) throws Exception {
        String json = """
                {
                  "organization_name": "%s",
                  "owner_email": "%s",
                  "password": "%s"
                }
                """.formatted(organizationName, ownerEmail, password);

        String content = mockMvc.perform(post("/api/orgs/register")
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readValue(content, MAP_TYPE);
    }

    private Map<String, Object> login(String email, String password) throws Exception {
        String json = """
                {
                  "email": "%s",
                  "password": "%s"
                }
                """.formatted(email, password);

        String content = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(json))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readValue(content, MAP_TYPE);
    }
}
