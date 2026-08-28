package org.example.finexa.auth;

import java.util.UUID;
import org.example.finexa.tenant.Role;

public record CurrentUser(UUID id, UUID organizationId, String email, Role role) {
}
