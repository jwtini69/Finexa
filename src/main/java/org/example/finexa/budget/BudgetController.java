package org.example.finexa.budget;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
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
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetRepository budgetRepository;
    private final BudgetThresholdEvaluator budgetThresholdEvaluator;

    public BudgetController(
            BudgetRepository budgetRepository,
            BudgetThresholdEvaluator budgetThresholdEvaluator
    ) {
        this.budgetRepository = budgetRepository;
        this.budgetThresholdEvaluator = budgetThresholdEvaluator;
    }

    public record CreateBudgetRequest(
            @NotBlank String name,
            @NotBlank String scopeType,
            String scopeValue,
            @NotNull @DecimalMin("0.01") BigDecimal capAmount,
            @NotBlank String period,
            @NotBlank String thresholdPercentages
    ) {}

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public ResponseEntity<Budget> createBudget(@Valid @RequestBody CreateBudgetRequest request) {
        UUID organizationId = TenantContext.requireOrganizationId();
        Budget budget = new Budget(
                UUID.randomUUID(),
                organizationId,
                request.name(),
                request.scopeType().toUpperCase(),
                request.scopeValue(),
                request.capAmount(),
                request.period().toUpperCase(),
                request.thresholdPercentages(),
                BigDecimal.ZERO,
                "ACTIVE",
                null,
                null
        );

        budgetRepository.save(budget);
        budgetThresholdEvaluator.evaluateBudgetsForTenant(organizationId);

        return ResponseEntity
                .created(URI.create("/api/budgets/" + budget.id()))
                .body(budget);
    }

    @GetMapping
    public List<Budget> listBudgets() {
        UUID organizationId = TenantContext.requireOrganizationId();
        return budgetRepository.findAllByTenant(organizationId);
    }

    @GetMapping("/{id}")
    public Budget getBudget(@PathVariable UUID id) {
        UUID organizationId = TenantContext.requireOrganizationId();
        return budgetRepository.findByIdAndTenant(id, organizationId)
                .orElseThrow(() -> new NotFoundException("Budget not found"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public ResponseEntity<Void> deleteBudget(@PathVariable UUID id) {
        UUID organizationId = TenantContext.requireOrganizationId();
        boolean deleted = budgetRepository.deleteByIdAndTenant(id, organizationId);
        if (!deleted) {
            throw new NotFoundException("Budget not found");
        }
        return ResponseEntity.noContent().build();
    }
}
