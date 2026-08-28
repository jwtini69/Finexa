package org.example.finexa.tenant;

import java.time.Instant;
import java.util.UUID;

public record OrganizationResponse(UUID id, String name, Instant createdAt) {
    static OrganizationResponse from(Organization organization) {
        return new OrganizationResponse(organization.id(), organization.name(), organization.createdAt());
    }
}
