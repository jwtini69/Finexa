package org.example.finexa.tenant;

import java.time.Instant;
import java.util.UUID;

public record OrgUser(
        UUID id,
        UUID organizationId,
        String email,
        String passwordHash,
        Role role,
        Instant createdAt
) {
}
