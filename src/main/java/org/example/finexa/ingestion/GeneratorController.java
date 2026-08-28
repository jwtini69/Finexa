package org.example.finexa.ingestion;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.example.finexa.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/generator")
public class GeneratorController {

    private final UsageEventGenerator generator;

    public GeneratorController(UsageEventGenerator generator) {
        this.generator = generator;
    }

    public record SpikeRequest(
            @NotBlank String serviceName,
            @NotBlank String resourceId,
            @NotNull @DecimalMin("0.01") BigDecimal spikeCost
    ) {}

    public record ToggleRequest(boolean enabled) {}

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of(
                "enabled", generator.isEnabled(),
                "available_resources", UsageEventGenerator.DEFAULT_RESOURCES
        );
    }

    @PostMapping("/toggle")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public Map<String, Object> toggle(@RequestBody ToggleRequest request) {
        generator.setEnabled(request.enabled());
        return Map.of("enabled", generator.isEnabled());
    }

    @PostMapping("/tick")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public List<UsageEvent> triggerTick() {
        UUID organizationId = TenantContext.requireOrganizationId();
        return generator.generateTickForOrg(organizationId, Instant.now());
    }

    @PostMapping("/spike")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public UsageEvent injectSpike(@Valid @RequestBody SpikeRequest request) {
        UUID organizationId = TenantContext.requireOrganizationId();
        return generator.injectSpike(organizationId, request.serviceName(), request.resourceId(), request.spikeCost());
    }

    @PostMapping("/backfill")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public Map<String, Object> backfill(@RequestParam(defaultValue = "14") int days) {
        UUID organizationId = TenantContext.requireOrganizationId();
        int recordsCreated = generator.backfillHistory(organizationId, days);
        return Map.of(
                "organization_id", organizationId,
                "days_backfilled", days,
                "records_created", recordsCreated
        );
    }
}
