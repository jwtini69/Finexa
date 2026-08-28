package org.example.finexa.ingestion;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.example.finexa.tenant.Organization;
import org.example.finexa.tenant.OrganizationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class UsageEventGenerator {

    private static final Logger log = LoggerFactory.getLogger(UsageEventGenerator.class);

    private final UsageEventProducer usageEventProducer;
    private final RawUsageRepository rawUsageRepository;
    private final OrganizationRepository organizationRepository;
    private final Random random = new Random(42);

    private final AtomicBoolean enabled;
    private final ConcurrentHashMap<String, BigDecimal> activeSpikes = new ConcurrentHashMap<>();

    public record SyntheticResource(String serviceName, String resourceId, double baseHourlyCost, double variance) {}

    public static final List<SyntheticResource> DEFAULT_RESOURCES = List.of(
            new SyntheticResource("EC2", "i-0a1b2c3d4e5f6001", 75.00, 5.0),
            new SyntheticResource("EC2", "i-0a1b2c3d4e5f6002", 30.00, 3.0),
            new SyntheticResource("RDS", "db-main-cluster-primary", 45.00, 4.0),
            new SyntheticResource("S3", "finexa-prod-analytics-lake", 12.50, 2.0),
            new SyntheticResource("CloudFront", "dist-cdn-global-static", 8.00, 1.5),
            new SyntheticResource("Lambda", "fn-event-stream-processor", 4.20, 0.8)
    );

    public UsageEventGenerator(
            UsageEventProducer usageEventProducer,
            RawUsageRepository rawUsageRepository,
            OrganizationRepository organizationRepository,
            @Value("${finexa.generator.enabled:false}") boolean initialEnabled
    ) {
        this.usageEventProducer = usageEventProducer;
        this.rawUsageRepository = rawUsageRepository;
        this.organizationRepository = organizationRepository;
        this.enabled = new AtomicBoolean(initialEnabled);
    }

    public boolean isEnabled() {
        return enabled.get();
    }

    public void setEnabled(boolean state) {
        this.enabled.set(state);
    }

    @Scheduled(fixedDelayString = "${finexa.generator.interval-ms:5000}")
    public void scheduledTick() {
        if (!enabled.get()) {
            return;
        }
        generateTickForAllOrgs(Instant.now());
    }

    public void generateTickForAllOrgs(Instant timestamp) {
        List<Organization> orgs = organizationRepository.findAll();
        for (Organization org : orgs) {
            generateTickForOrg(org.id(), timestamp);
        }
    }

    public List<UsageEvent> generateTickForOrg(UUID organizationId, Instant timestamp) {
        List<UsageEvent> events = new ArrayList<>();
        for (SyntheticResource res : DEFAULT_RESOURCES) {
            BigDecimal cost = calculateResourceCost(organizationId, res, timestamp);
            UsageEvent event = new UsageEvent(
                    UUID.randomUUID(),
                    organizationId,
                    res.serviceName(),
                    res.resourceId(),
                    cost,
                    "USD",
                    timestamp
            );
            events.add(event);
            usageEventProducer.send(event);
        }
        return events;
    }

    public UsageEvent injectSpike(UUID organizationId, String serviceName, String resourceId, BigDecimal spikeCost) {
        UsageEvent spikeEvent = new UsageEvent(
                UUID.randomUUID(),
                organizationId,
                serviceName,
                resourceId,
                spikeCost,
                "USD",
                Instant.now()
        );
        log.warn("Injecting artificial spend spike for org={}, service={}, resource={}, cost={}",
                organizationId, serviceName, resourceId, spikeCost);
        usageEventProducer.send(spikeEvent);
        return spikeEvent;
    }

    public int backfillHistory(UUID organizationId, int days) {
        log.info("Starting historical data backfill for org={} over {} days", organizationId, days);
        Instant now = Instant.now().truncatedTo(ChronoUnit.HOURS);
        Instant start = now.minus(days, ChronoUnit.DAYS);

        int totalRecords = 0;
        List<RawUsageRecord> batch = new ArrayList<>();

        for (Instant time = start; time.isBefore(now); time = time.plus(1, ChronoUnit.HOURS)) {
            for (SyntheticResource res : DEFAULT_RESOURCES) {
                BigDecimal cost = calculateSeasonalBaselineCost(res, time);
                RawUsageRecord record = new RawUsageRecord(
                        UUID.randomUUID(),
                        organizationId,
                        res.serviceName(),
                        res.resourceId(),
                        cost,
                        "USD",
                        time,
                        time
                );
                batch.add(record);
                totalRecords++;

                if (batch.size() >= 500) {
                    rawUsageRepository.batchInsert(batch);
                    batch.clear();
                }
            }
        }

        if (!batch.isEmpty()) {
            rawUsageRepository.batchInsert(batch);
            batch.clear();
        }

        log.info("Completed backfill for org={}: inserted {} records across {} days", organizationId, totalRecords, days);
        return totalRecords;
    }

    public BigDecimal calculateSeasonalBaselineCost(SyntheticResource res, Instant timestamp) {
        ZonedDateTime zdt = timestamp.atZone(ZoneOffset.UTC);
        DayOfWeek dow = zdt.getDayOfWeek();
        int hour = zdt.getHour();

        double multiplier = 1.0;
        // Weekday business hours surge (Mon-Fri 08:00 - 18:00 UTC)
        if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
            if (hour >= 8 && hour <= 18) {
                multiplier = 1.35; // 35% higher during active working hours
            } else {
                multiplier = 1.0;
            }
        } else {
            // Weekend dip
            multiplier = 0.65; // 35% lower on weekends
        }

        // Small deterministic pseudorandom variation based on hour and day
        int hash = (dow.getValue() * 24 + hour) * 31 + res.resourceId().hashCode();
        double noise = ((Math.abs(hash) % 100) / 100.0 - 0.5) * res.variance();

        double base = res.baseHourlyCost() * multiplier + noise;
        return BigDecimal.valueOf(Math.max(0.1, base)).setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateResourceCost(UUID orgId, SyntheticResource res, Instant timestamp) {
        String spikeKey = orgId + ":" + res.resourceId();
        BigDecimal spike = activeSpikes.remove(spikeKey);
        if (spike != null) {
            return spike;
        }

        return calculateSeasonalBaselineCost(res, timestamp);
    }
}
