package org.example.finexa.detection;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ZScoreCalculator {

    public static final double DEFAULT_Z_THRESHOLD = 3.0;

    public record EvaluationResult(
            boolean isAnomaly,
            BigDecimal zScore,
            BigDecimal mean,
            BigDecimal stdDev,
            BigDecimal deviationPercentage,
            String severity
    ) {}

    public EvaluationResult evaluate(List<BigDecimal> historicalValues, BigDecimal currentValue) {
        return evaluate(historicalValues, currentValue, DEFAULT_Z_THRESHOLD);
    }

    public EvaluationResult evaluate(List<BigDecimal> historicalValues, BigDecimal currentValue, double threshold) {
        if (historicalValues == null || historicalValues.isEmpty()) {
            return new EvaluationResult(
                    false,
                    BigDecimal.ZERO,
                    currentValue,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    "NONE"
            );
        }

        double sum = 0.0;
        for (BigDecimal val : historicalValues) {
            sum += val.doubleValue();
        }
        double mean = sum / historicalValues.size();

        double sumSqDiff = 0.0;
        for (BigDecimal val : historicalValues) {
            double diff = val.doubleValue() - mean;
            sumSqDiff += diff * diff;
        }

        double variance = historicalValues.size() > 1 ? sumSqDiff / (historicalValues.size() - 1) : sumSqDiff;
        double stdDev = Math.sqrt(variance);

        // Prevent zero/tiny stdDev on constant baselines
        double effectiveStdDev = Math.max(stdDev, 0.01);

        double current = currentValue.doubleValue();
        double zScoreValue = (current - mean) / effectiveStdDev;
        zScoreValue = Math.max(-999999.0, Math.min(999999.0, zScoreValue));

        double deviationPct = 0.0;
        if (mean > 0.0001) {
            deviationPct = ((current - mean) / mean) * 100.0;
            deviationPct = Math.max(-999999.0, Math.min(999999.0, deviationPct));
        }

        boolean isAnomaly = Math.abs(zScoreValue) >= threshold && deviationPct > 0;
        String severity = determineSeverity(zScoreValue, deviationPct);

        return new EvaluationResult(
                isAnomaly,
                BigDecimal.valueOf(zScoreValue).setScale(4, RoundingMode.HALF_UP),
                BigDecimal.valueOf(mean).setScale(4, RoundingMode.HALF_UP),
                BigDecimal.valueOf(effectiveStdDev).setScale(4, RoundingMode.HALF_UP),
                BigDecimal.valueOf(deviationPct).setScale(2, RoundingMode.HALF_UP),
                isAnomaly ? severity : "NONE"
        );
    }

    private String determineSeverity(double zScore, double deviationPct) {
        if (zScore >= 6.0 || deviationPct >= 300.0) {
            return "CRITICAL";
        }
        if (zScore >= 4.5 || deviationPct >= 150.0) {
            return "HIGH";
        }
        if (zScore >= 3.5 || deviationPct >= 75.0) {
            return "MEDIUM";
        }
        return "LOW";
    }
}
