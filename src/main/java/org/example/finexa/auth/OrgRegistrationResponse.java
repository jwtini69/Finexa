package org.example.finexa.auth;

import java.time.Instant;
import java.util.UUID;

public record OrgRegistrationResponse(
        UUID organizationId,
        UUID ownerUserId,
        String organizationName,
        String ownerEmail,
        Instant createdAt
) {
}
