package org.example.finexa.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "finexa.security")
public record SecurityProperties(String jwtSecret, Duration tokenTtl) {

    public SecurityProperties {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalArgumentException("finexa.security.jwt-secret must be at least 32 characters");
        }
        if (tokenTtl == null || tokenTtl.isNegative() || tokenTtl.isZero()) {
            tokenTtl = Duration.ofHours(2);
        }
    }
}
