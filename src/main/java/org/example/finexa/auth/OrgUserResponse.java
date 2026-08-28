package org.example.finexa.auth;

import java.time.Instant;
import java.util.UUID;
import org.example.finexa.tenant.OrgUser;
import org.example.finexa.tenant.Role;

public record OrgUserResponse(
        UUID id,
        UUID organizationId,
        String email,
        Role role,
        Instant createdAt
) {
    public static OrgUserResponse from(OrgUser user) {
        return new OrgUserResponse(
                user.id(),
                user.organizationId(),
                user.email(),
                user.role(),
                user.createdAt()
        );
    }
}
