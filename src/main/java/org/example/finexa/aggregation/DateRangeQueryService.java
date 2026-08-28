package org.example.finexa.aggregation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.example.finexa.ingestion.RawUsageRepository;
import org.springframework.stereotype.Service;

@Service
public class DateRangeQueryService {

    private final CostRollupRepository costRollupRepository;
    private final RawUsageRepository rawUsageRepository;

    public record DateRange(Instant from, Instant to, Instant previousFrom, Instant previousTo) {}

    public record CostSummaryResponse(
            BigDecimal currentSpend,
            BigDecimal previousSpend,
            BigDecimal percentageChange,
            String topService,
            BigDecimal topServiceSpend,
            Instant from,
            Instant to
    ) {}

    public DateRangeQueryService(CostRollupRepository costRollupRepository, RawUsageRepository rawUsageRepository) {
        this.costRollupRepository = costRollupRepository;
        this.rawUsageRepository = rawUsageRepository;
    }

    public DateRange resolveRange(String range, Instant customFrom, Instant customTo) {
        Instant now = Instant.now();
        Instant from;
        Instant to = customTo != null ? customTo : now;

        if ("24h".equalsIgnoreCase(range)) {
            from = to.minus(24, ChronoUnit.HOURS);
        } else if ("7d".equalsIgnoreCase(range)) {
            from = to.minus(7, ChronoUnit.DAYS);
        } else if ("30d".equalsIgnoreCase(range)) {
            from = to.minus(30, ChronoUnit.DAYS);
        } else if (customFrom != null) {
            from = customFrom;
        } else {
            // Default to 7 days
            from = to.minus(7, ChronoUnit.DAYS);
        }

        Duration duration = Duration.between(from, to);
        Instant previousTo = from;
        Instant previousFrom = from.minus(duration);

        return new DateRange(from, to, previousFrom, previousTo);
    }

    public CostSummaryResponse getSummary(UUID organizationId, String range, Instant customFrom, Instant customTo) {
        DateRange dr = resolveRange(range, customFrom, customTo);

        BigDecimal currentSpend = rawUsageRepository.sumCostByTenantAndPeriod(organizationId, dr.from(), dr.to());
        BigDecimal previousSpend = rawUsageRepository.sumCostByTenantAndPeriod(organizationId, dr.previousFrom(), dr.previousTo());

        BigDecimal percentageChange = BigDecimal.ZERO;
        if (previousSpend.compareTo(BigDecimal.ZERO) > 0) {
            percentageChange = currentSpend.subtract(previousSpend)
                    .divide(previousSpend, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        List<CostRollupRepository.ServiceBreakdown> services = costRollupRepository.queryServiceBreakdown(organizationId, dr.from(), dr.to());
        String topService = services.isEmpty() ? "N/A" : services.get(0).serviceName();
        BigDecimal topServiceSpend = services.isEmpty() ? BigDecimal.ZERO : services.get(0).totalCost();

        return new CostSummaryResponse(
                currentSpend.setScale(2, RoundingMode.HALF_UP),
                previousSpend.setScale(2, RoundingMode.HALF_UP),
                percentageChange,
                topService,
                topServiceSpend.setScale(2, RoundingMode.HALF_UP),
                dr.from(),
                dr.to()
        );
    }

    public List<CostRollupRepository.TimeseriesAggregate> getTimeseries(
            UUID organizationId,
            String range,
            Instant customFrom,
            Instant customTo,
            String interval
    ) {
        DateRange dr = resolveRange(range, customFrom, customTo);
        if ("day".equalsIgnoreCase(interval) || "30d".equalsIgnoreCase(range)) {
            return costRollupRepository.queryDailyTimeseries(organizationId, dr.from(), dr.to());
        }
        return costRollupRepository.queryHourlyTimeseries(organizationId, dr.from(), dr.to());
    }

    public List<CostRollupRepository.ServiceBreakdown> getServiceBreakdown(
            UUID organizationId,
            String range,
            Instant customFrom,
            Instant customTo
    ) {
        DateRange dr = resolveRange(range, customFrom, customTo);
        return costRollupRepository.queryServiceBreakdown(organizationId, dr.from(), dr.to());
    }

    public List<CostRollupRepository.ResourceBreakdown> getResourceBreakdown(
            UUID organizationId,
            String range,
            Instant customFrom,
            Instant customTo
    ) {
        DateRange dr = resolveRange(range, customFrom, customTo);
        return costRollupRepository.queryResourceBreakdown(organizationId, dr.from(), dr.to());
    }
}
