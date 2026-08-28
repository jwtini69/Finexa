package org.example.finexa.webhook;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.example.finexa.common.NotFoundException;
import org.example.finexa.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private final WebhookEndpointRepository endpointRepository;
    private final WebhookDeliveryRepository deliveryRepository;

    public WebhookController(
            WebhookEndpointRepository endpointRepository,
            WebhookDeliveryRepository deliveryRepository
    ) {
        this.endpointRepository = endpointRepository;
        this.deliveryRepository = deliveryRepository;
    }

    public record CreateEndpointRequest(
            @NotBlank String url,
            String secret,
            String events
    ) {}

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public ResponseEntity<WebhookEndpoint> registerEndpoint(@Valid @RequestBody CreateEndpointRequest request) {
        UUID organizationId = TenantContext.requireOrganizationId();
        WebhookEndpoint endpoint = new WebhookEndpoint(
                UUID.randomUUID(),
                organizationId,
                request.url(),
                request.secret() != null ? request.secret() : UUID.randomUUID().toString(),
                request.events() != null ? request.events() : "BUDGET_THRESHOLD_CROSSED,ANOMALY_DETECTED",
                "ACTIVE",
                null
        );

        endpointRepository.save(endpoint);
        return ResponseEntity
                .created(URI.create("/api/webhooks/" + endpoint.id()))
                .body(endpoint);
    }

    @GetMapping
    public List<WebhookEndpoint> listEndpoints() {
        UUID organizationId = TenantContext.requireOrganizationId();
        return endpointRepository.findAllByTenant(organizationId);
    }

    @GetMapping("/deliveries")
    public List<WebhookDelivery> listDeliveries() {
        UUID organizationId = TenantContext.requireOrganizationId();
        return deliveryRepository.findAllByTenant(organizationId);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public ResponseEntity<Void> deleteEndpoint(@PathVariable UUID id) {
        UUID organizationId = TenantContext.requireOrganizationId();
        boolean deleted = endpointRepository.deleteByIdAndTenant(id, organizationId);
        if (!deleted) {
            throw new NotFoundException("Webhook endpoint not found");
        }
        return ResponseEntity.noContent().build();
    }
}
