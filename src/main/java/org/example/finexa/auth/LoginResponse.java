package org.example.finexa.auth;

import java.time.Instant;
import java.util.UUID;
import org.example.finexa.tenant.Role;

public record LoginResponse(
        String accessToken,
        String tokenType,
        Instant expiresAt,
        UUID userId,
        UUID organizationId,
        String email,
        Role role
) {
}
