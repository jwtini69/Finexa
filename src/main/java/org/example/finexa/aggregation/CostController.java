package org.example.finexa.aggregation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.example.finexa.tenant.TenantContext;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/costs")
public class CostController {

    private final DateRangeQueryService dateRangeQueryService;

    public CostController(DateRangeQueryService dateRangeQueryService) {
        this.dateRangeQueryService = dateRangeQueryService;
    }

    @GetMapping("/summary")
    public DateRangeQueryService.CostSummaryResponse getSummary(
            @RequestParam(defaultValue = "7d") String range,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        UUID organizationId = TenantContext.requireOrganizationId();
        return dateRangeQueryService.getSummary(organizationId, range, from, to);
    }

    @GetMapping("/timeseries")
    public List<CostRollupRepository.TimeseriesAggregate> getTimeseries(
            @RequestParam(defaultValue = "7d") String range,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "hour") String interval
    ) {
        UUID organizationId = TenantContext.requireOrganizationId();
        return dateRangeQueryService.getTimeseries(organizationId, range, from, to, interval);
    }

    @GetMapping("/breakdown")
    public Object getBreakdown(
            @RequestParam(defaultValue = "7d") String range,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "service") String by
    ) {
        UUID organizationId = TenantContext.requireOrganizationId();
        if ("resource".equalsIgnoreCase(by)) {
            return dateRangeQueryService.getResourceBreakdown(organizationId, range, from, to);
        }
        return dateRangeQueryService.getServiceBreakdown(organizationId, range, from, to);
    }
}
