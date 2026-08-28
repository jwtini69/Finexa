package org.example.finexa.detection;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.example.finexa.aggregation.CostRollupRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class SeasonalBaselineService {

    private static final Logger log = LoggerFactory.getLogger(SeasonalBaselineService.class);

    private final JdbcClient jdbcClient;
    private final ZScoreCalculator zScoreCalculator;

    public SeasonalBaselineService(JdbcClient jdbcClient, ZScoreCalculator zScoreCalculator) {
        this.jdbcClient = jdbcClient;
        this.zScoreCalculator = zScoreCalculator;
    }

    public record SeasonalEvaluationResult(
            boolean isAnomaly,
            boolean usedSeasonalBaseline,
            BigDecimal zScore,
            BigDecimal expectedCost,
            BigDecimal deviationPercentage,
            String severity,
            int sampleCount
    ) {}

    public SeasonalEvaluationResult evaluate(
            UUID organizationId,
            String serviceName,
            String resourceId,
            Instant timestamp,
            BigDecimal currentValue
    ) {
        List<BigDecimal> seasonalHistory = querySeasonalHistory(
                organizationId, serviceName, resourceId, timestamp, 6
        );

        if (seasonalHistory.size() >= 2) {
            ZScoreCalculator.EvaluationResult result = zScoreCalculator.evaluate(seasonalHistory, currentValue);
            log.debug("Seasonal evaluation for org={}, res={}: samples={}, mean={}, zScore={}, isAnomaly={}",
                    organizationId, resourceId, seasonalHistory.size(), result.mean(), result.zScore(), result.isAnomaly());
            return new SeasonalEvaluationResult(
                    result.isAnomaly(),
                    true,
                    result.zScore(),
                    result.mean(),
                    result.deviationPercentage(),
                    result.severity(),
                    seasonalHistory.size()
            );
        }

        // Fallback to trailing 14-day rolling window
        List<BigDecimal> rollingHistory = queryRollingHistory(
                organizationId, serviceName, resourceId, timestamp, 14
        );
        ZScoreCalculator.EvaluationResult result = zScoreCalculator.evaluate(rollingHistory, currentValue);
        log.debug("Rolling window fallback evaluation for org={}, res={}: samples={}, mean={}, zScore={}, isAnomaly={}",
                organizationId, resourceId, rollingHistory.size(), result.mean(), result.zScore(), result.isAnomaly());

        return new SeasonalEvaluationResult(
                result.isAnomaly(),
                false,
                result.zScore(),
                result.mean(),
                result.deviationPercentage(),
                result.severity(),
                rollingHistory.size()
        );
    }

    public List<BigDecimal> querySeasonalHistory(
            UUID organizationId,
            String serviceName,
            String resourceId,
            Instant timestamp,
            int weeksBack
    ) {
        ZonedDateTime zdt = timestamp.atZone(ZoneOffset.UTC);
        int dayOfWeek = zdt.getDayOfWeek().getValue(); // 1 = Monday, 7 = Sunday
        int hourOfDay = zdt.getHour();

        Instant from = timestamp.minus(weeksBack * 7L, ChronoUnit.DAYS);
        Instant to = timestamp.minus(1, ChronoUnit.HOURS); // Exclude the current hour

        return jdbcClient.sql("""
                SELECT total_cost
                FROM hourly_cost_rollups
                WHERE organization_id = :organizationId
                  AND service_name = :serviceName
                  AND resource_id = :resourceId
                  AND bucket_start >= :from
                  AND bucket_start <= :to
                  AND EXTRACT(ISODOW FROM bucket_start) = :dayOfWeek
                  AND EXTRACT(HOUR FROM bucket_start) = :hourOfDay
                ORDER BY bucket_start ASC
                """)
                .param("organizationId", organizationId)
                .param("serviceName", serviceName)
                .param("resourceId", resourceId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .param("dayOfWeek", dayOfWeek)
                .param("hourOfDay", hourOfDay)
                .query(BigDecimal.class)
                .list();
    }

    public List<BigDecimal> queryRollingHistory(
            UUID organizationId,
            String serviceName,
            String resourceId,
            Instant timestamp,
            int daysBack
    ) {
        Instant from = timestamp.minus(daysBack, ChronoUnit.DAYS);
        Instant to = timestamp.minus(1, ChronoUnit.HOURS);

        return jdbcClient.sql("""
                SELECT total_cost
                FROM hourly_cost_rollups
                WHERE organization_id = :organizationId
                  AND service_name = :serviceName
                  AND resource_id = :resourceId
                  AND bucket_start >= :from
                  AND bucket_start <= :to
                ORDER BY bucket_start ASC
                """)
                .param("organizationId", organizationId)
                .param("serviceName", serviceName)
                .param("resourceId", resourceId)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query(BigDecimal.class)
                .list();
    }
}
