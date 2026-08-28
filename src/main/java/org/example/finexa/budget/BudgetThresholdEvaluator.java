package org.example.finexa.budget;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.example.finexa.ingestion.RawUsageRepository;
import org.example.finexa.outbox.OutboxEvent;
import org.example.finexa.outbox.OutboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BudgetThresholdEvaluator {

    private static final Logger log = LoggerFactory.getLogger(BudgetThresholdEvaluator.class);

    private final BudgetRepository budgetRepository;
    private final RawUsageRepository rawUsageRepository;
    private final OutboxRepository outboxRepository;

    public BudgetThresholdEvaluator(
            BudgetRepository budgetRepository,
            RawUsageRepository rawUsageRepository,
            OutboxRepository outboxRepository
    ) {
        this.budgetRepository = budgetRepository;
        this.rawUsageRepository = rawUsageRepository;
        this.outboxRepository = outboxRepository;
    }

    @Transactional
    public void evaluateBudgetsForTenant(UUID organizationId) {
        List<Budget> activeBudgets = budgetRepository.findActiveByTenant(organizationId);
        Instant now = Instant.now();

        for (Budget budget : activeBudgets) {
            evaluateSingleBudget(budget, now);
        }
    }

    @Transactional
    public void evaluateSingleBudget(Budget budget, Instant now) {
        Instant periodStart = calculatePeriodStart(budget.period(), now);
        BigDecimal currentSpend = calculateSpend(budget, periodStart, now);

        if (budget.capAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        BigDecimal percentage = currentSpend.divide(budget.capAmount(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);

        String[] thresholdStrs = budget.thresholdPercentages().split(",");
        for (String thresholdStr : thresholdStrs) {
            try {
                double thresholdVal = Double.parseDouble(thresholdStr.trim());
                if (percentage.doubleValue() >= thresholdVal) {
                    // Threshold crossed
                    String newStatus = percentage.doubleValue() >= 100.0 ? "EXCEEDED" : budget.status();
                    budgetRepository.updateSpendAndStatus(budget.id(), currentSpend, newStatus);

                    String payload = String.format(
                            """
                            {"budget_id":"%s","budget_name":"%s","organization_id":"%s","cap_amount":%s,"current_spend":%s,"threshold_percentage":%s,"actual_percentage":%s,"timestamp":"%s"}
                            """,
                            budget.id(),
                            budget.name(),
                            budget.organizationId(),
                            budget.capAmount(),
                            currentSpend,
                            thresholdVal,
                            percentage,
                            now
                    ).trim();

                    OutboxEvent outboxEvent = OutboxEvent.pending(
                            budget.organizationId(),
                            "BUDGET_THRESHOLD_CROSSED",
                            "BUDGET",
                            budget.id().toString(),
                            payload
                    );

                    outboxRepository.save(outboxEvent);

                    log.warn("BUDGET THRESHOLD CROSSED: org={}, budget='{}', spend=${}/cap=${} ({}%) -> OutboxEvent {}",
                            budget.organizationId(), budget.name(), currentSpend, budget.capAmount(), percentage, outboxEvent.id());
                    break; // Trigger highest applicable threshold once per evaluation
                }
            } catch (NumberFormatException ignored) {}
        }
    }

    private Instant calculatePeriodStart(String period, Instant now) {
        ZonedDateTime zdt = now.atZone(ZoneOffset.UTC);
        if ("MONTHLY".equalsIgnoreCase(period)) {
            return zdt.withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS).toInstant();
        }
        // Default to DAILY
        return zdt.truncatedTo(ChronoUnit.DAYS).toInstant();
    }

    private BigDecimal calculateSpend(Budget budget, Instant from, Instant to) {
        String scope = budget.scopeType();
        if ("SERVICE".equalsIgnoreCase(scope) && budget.scopeValue() != null) {
            return rawUsageRepository.sumCostByTenantAndService(budget.organizationId(), budget.scopeValue(), from, to);
        } else if ("RESOURCE".equalsIgnoreCase(scope) && budget.scopeValue() != null) {
            return rawUsageRepository.sumCostByTenantAndResource(budget.organizationId(), budget.scopeValue(), from, to);
        }
        return rawUsageRepository.sumCostByTenantAndPeriod(budget.organizationId(), from, to);
    }
}
