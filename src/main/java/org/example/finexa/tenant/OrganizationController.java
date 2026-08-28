package org.example.finexa.tenant;

import java.util.UUID;
import org.example.finexa.common.NotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orgs")
public class OrganizationController {

    private final OrganizationRepository organizationRepository;

    public OrganizationController(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    @GetMapping("/me")
    public OrganizationResponse currentOrganization() {
        return organizationRepository.findByTenant()
                .map(OrganizationResponse::from)
                .orElseThrow(() -> new NotFoundException("Organization not found"));
    }

    @GetMapping("/{organizationId}")
    public OrganizationResponse organizationById(@PathVariable UUID organizationId) {
        UUID tenantOrganizationId = TenantContext.requireOrganizationId();
        if (!tenantOrganizationId.equals(organizationId)) {
            throw new NotFoundException("Organization not found");
        }
        return currentOrganization();
    }
}
