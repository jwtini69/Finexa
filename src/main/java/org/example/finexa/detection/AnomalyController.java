package org.example.finexa.detection;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.example.finexa.common.NotFoundException;
import org.example.finexa.tenant.TenantContext;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/anomalies")
public class AnomalyController {

    private final AnomalyRepository anomalyRepository;

    public AnomalyController(AnomalyRepository anomalyRepository) {
        this.anomalyRepository = anomalyRepository;
    }

    @GetMapping
    public List<Anomaly> listAnomalies(@RequestParam(required = false) String status) {
        UUID organizationId = TenantContext.requireOrganizationId();
        if (status != null && !status.isBlank()) {
            return anomalyRepository.findByTenantAndStatus(organizationId, status.toUpperCase());
        }
        return anomalyRepository.findAllByTenant(organizationId);
    }

    @GetMapping("/{id}")
    public Anomaly getAnomaly(@PathVariable UUID id) {
        UUID organizationId = TenantContext.requireOrganizationId();
        return anomalyRepository.findByIdAndTenant(id, organizationId)
                .orElseThrow(() -> new NotFoundException("Anomaly not found"));
    }

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public Map<String, Object> acknowledge(@PathVariable UUID id) {
        UUID organizationId = TenantContext.requireOrganizationId();
        boolean updated = anomalyRepository.updateStatus(id, organizationId, "ACKNOWLEDGED");
        if (!updated) {
            throw new NotFoundException("Anomaly not found");
        }
        return Map.of("id", id, "status", "ACKNOWLEDGED");
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public Map<String, Object> resolve(@PathVariable UUID id) {
        UUID organizationId = TenantContext.requireOrganizationId();
        boolean updated = anomalyRepository.updateStatus(id, organizationId, "RESOLVED");
        if (!updated) {
            throw new NotFoundException("Anomaly not found");
        }
        return Map.of("id", id, "status", "RESOLVED");
    }
}
