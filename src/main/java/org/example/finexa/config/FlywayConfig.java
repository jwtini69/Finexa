package org.example.finexa.config;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    @Bean(initMethod = "migrate")
    Flyway flyway(
            DataSource dataSource,
            @Value("${spring.flyway.locations:classpath:db/migration}") String locations
    ) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations(parseLocations(locations))
                .load();
    }

    private String[] parseLocations(String locations) {
        return locations == null || locations.isBlank()
                ? new String[]{"classpath:db/migration"}
                : locations.split("\\s*,\\s*");
    }
}
