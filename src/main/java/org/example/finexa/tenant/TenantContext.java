package org.example.finexa.tenant;

import java.util.Optional;
import java.util.UUID;

public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT_ORGANIZATION_ID = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setOrganizationId(UUID organizationId) {
        CURRENT_ORGANIZATION_ID.set(organizationId);
    }

    public static UUID requireOrganizationId() {
        return currentOrganizationId()
                .orElseThrow(() -> new IllegalStateException("No tenant is bound to the current request"));
    }

    public static Optional<UUID> currentOrganizationId() {
        return Optional.ofNullable(CURRENT_ORGANIZATION_ID.get());
    }

    public static void clear() {
        CURRENT_ORGANIZATION_ID.remove();
    }
}
