# Finexa — Backend Build Spec
### Reference document for AI coding agents (Claude Code, Cursor, etc.)

This document is the source of truth for building the backend. Follow the phases **in order** — do not skip ahead or generate later-phase code before earlier phases pass their acceptance criteria. Each phase must be independently runnable and testable before moving to the next.

---

## 0. Tech Stack & Conventions

- **Language/Framework:** follow the preconfigured Gradle project baseline: Java 26, Spring Boot 4.1.1
- **Build tool:** Gradle
- **Database:** PostgreSQL 16 + TimescaleDB extension
- **Cache/coordination:** Redis
- **Messaging:** Apache Kafka
- **Resilience:** Resilience4j (retry, circuit breaker)
- **Migrations:** Flyway (never use `hibernate.ddl-auto=update` — all schema changes go through versioned Flyway scripts)
- **Auth:** Spring Security + JWT
- **Testing:** JUnit 5, Testcontainers (Postgres, Kafka, Redis) for integration tests
- **Product/app name:** Finexa
- **Package root:** follow the preconfigured Spring project package: `org.example.finexa`

**Architecture principle:** this is a **modular monolith** — one Spring Boot application, organized into clearly separated packages by module. Do NOT create separate Spring Boot applications, separate `pom.xml`/`build.gradle` files, or separate deployable services for Ingestion, Detection, or Webhooks. These are `@KafkaListener`-annotated components living in their own packages inside the single application.

**Multi-tenancy rule (applies to every phase):** every table that holds org-specific data must have an `organization_id` column. Every repository query must filter by the current tenant context. Never trust a client-supplied `organization_id` — always derive it server-side from the authenticated user's JWT/session.

---

## 1. Project Structure (target end state for the backend)

```
src/main/java/org/example/finexa/
├── config/
│   ├── SecurityConfig.java
│   ├── KafkaConfig.java
│   ├── RedisConfig.java
│   └── Resilience4jConfig.java
├── tenant/
│   ├── Organization.java
│   ├── OrgUser.java
│   ├── Role.java
│   ├── TenantContext.java
│   └── TenantFilter.java
├── auth/
│   ├── AuthController.java
│   ├── JwtService.java
│   ├── OrgRegistrationRequest.java / OrgRegistrationResponse.java
│   ├── LoginRequest.java / LoginResponse.java
│   └── UserDetailsServiceImpl.java
├── ingestion/
│   ├── UsageEventGenerator.java
│   ├── UsageEvent.java
│   ├── UsageEventProducer.java
│   ├── UsageEventConsumer.java
│   └── RawUsageRecord.java
├── aggregation/
│   ├── CostRollupRepository.java
│   ├── CostRollupEvent.java
│   ├── CostRollupEventProducer.java
│   └── DateRangeQueryService.java
├── detection/
│   ├── ZScoreCalculator.java
│   ├── SeasonalBaselineService.java
│   ├── AnomalyDetectionConsumer.java
│   ├── Anomaly.java
│   └── AnomalyController.java
├── budget/
│   ├── Budget.java
│   ├── BudgetController.java
│   └── BudgetThresholdEvaluator.java
├── outbox/
│   ├── OutboxEvent.java
│   ├── OutboxRepository.java
│   └── OutboxPublisher.java
├── webhook/
│   ├── WebhookEndpoint.java
│   ├── WebhookDelivery.java
│   ├── WebhookDispatcher.java
│   └── DeadLetterHandler.java
└── FinexaApplication.java

src/main/resources/
├── application.yml
└── db/migration/
    ├── V1__create_tenant_tables.sql
    ├── V2__create_raw_usage_hypertable.sql
    ├── V3__create_continuous_aggregates.sql
    ├── V4__create_anomaly_and_budget_tables.sql
    ├── V5__create_outbox_and_webhook_tables.sql
    └── R__seed_dev_data.sql           (dev profile only; demo org/users)

src/test/java/...                    (mirrors main structure)
docker-compose.yml                   (local infrastructure: Postgres+Timescale, Redis, Kafka, Zookeeper/KRaft)
```

---

## 2. Build Phases

### Phase 1 — Foundation: Tenancy, Auth, RBAC
**Build this phase yourself, or review AI-generated code line by line before accepting it.** Every later phase depends on tenant isolation being correct, and this is the first thing an interviewer will probe.

**Files:** `config/SecurityConfig.java`, all of `tenant/`, all of `auth/`, `V1__create_tenant_tables.sql`

**Requirements:**
- `Organization` entity: id, name, created_at
- `OrgUser` entity: id, organization_id (FK), email, password_hash, role (OWNER/ADMIN/VIEWER)
- `POST /api/orgs/register`: creates an `Organization` and its first OWNER `OrgUser` in one database transaction
- Dev/test bootstrap data is provided separately through a dev-profile Flyway seed script so local testing does not depend on manual signup every run
- JWT contains `organization_id` and `role` as claims
- `TenantFilter` runs on every request, extracts `organization_id` from the JWT, and sets it in a request-scoped `TenantContext` — no controller or service should ever accept `organization_id` as a request parameter for a data-scoping decision
- Method-level authorization via `@PreAuthorize` for role checks (e.g., only OWNER/ADMIN can hit budget-config endpoints)

**Acceptance criteria:**
- A user from Org A cannot read or write Org B's data through any endpoint, even if they guess/construct a request with Org B's IDs
- A VIEWER role gets 403 on any config/write endpoint
- Registration creates exactly one organization and exactly one OWNER user atomically
- Integration tests proving all of the above

---

### Phase 2 — Data Flow: Mock Generator → Kafka → Ingestion → TimescaleDB
**Fine for AI to scaffold; you review the Kafka partitioning and hypertable design.**

**Files:** all of `ingestion/`, `aggregation/`, `V2__create_raw_usage_hypertable.sql`, `V3__create_continuous_aggregates.sql`

**Requirements:**
- `UsageEventGenerator`: scheduled (Quartz or `@Scheduled`) job producing realistic synthetic AWS/GCP-shaped usage events (service name, resource id, cost, timestamp) per organization
- Must support a **backfill mode** that generates several weeks of historical data on startup/demand — required later for seasonal baseline detection to have data to compare against
- Must support an **injectable anomaly mode** (e.g., a flag/endpoint that makes the generator produce an artificial spend spike for a given resource) — needed for the demo script
- `UsageEventProducer`: publishes to Kafka topic `usage-events`, **partitioned by `organization_id`** (use org_id as the partition key)
- `UsageEventConsumer`: `@KafkaListener` with an explicit consumer group, writes to `RawUsageRecord` (TimescaleDB hypertable)
- After each committed raw usage write, the ingestion flow publishes a `CostRollupEvent` to Kafka topic `cost-rollup-events`, partitioned by `organization_id`. This event represents the affected org/service/resource/time bucket; it is not emitted by TimescaleDB itself.
- `V2` migration: create hypertable on the raw usage table via `SELECT create_hypertable(...)`
- `V3` migration: create continuous aggregates for hourly and daily rollups. These aggregates are the query/read model; they are not treated as a push-based event source.

**Acceptance criteria:**
- Running the generator populates the hypertable via the full Kafka round-trip (not a direct DB write)
- Ingestion publishes `cost-rollup-events` after raw usage writes, and downstream consumers can process those events without polling TimescaleDB for changes
- A dynamic date-range query (24h/7d/30d/custom) returns correctly aggregated rollups
- Consumer lag is observable (log it or expose via actuator) — don't just process silently with no visibility

---

### Phase 3 — Anomaly Detection (two sub-phases, build in order)
**Design the statistical logic yourself. AI can help with the surrounding Spring plumbing.**

**Files:** all of `detection/`, `V4__create_anomaly_and_budget_tables.sql`

**Phase 3a — naive rolling Z-score (build and prove this first):**
- `ZScoreCalculator`: computes mean/stddev over a trailing window (e.g., 14 days) per resource/service, flags `|z| > threshold` (default 3.0, configurable per org)
- `AnomalyDetectionConsumer`: listens to `cost-rollup-events`, queries the relevant rollup/raw history, runs the calculator, and persists flagged `Anomaly` records
- Prove this works end-to-end with the demo's spike-injection before moving to 3b

**Phase 3b — seasonal baseline (only after 3a works and backfill data exists):**
- `SeasonalBaselineService`: compares a point against the equivalent point in prior cycles (e.g., same weekday, same hour-of-day over prior weeks) instead of a blind trailing window
- Should reduce false positives on recurring patterns (e.g., predictable weekday/weekend cost differences) — write a test that proves this specifically (naive detector flags a normal Monday-vs-weekend swing as anomalous; seasonal detector does not)

**Acceptance criteria:**
- Injected spend spike is correctly flagged within one aggregation cycle
- A test demonstrating the seasonal detector avoiding a false positive that the naive detector would have raised
- `AnomalyController`: returns anomalies filtered by the caller's tenant only

---

### Phase 4 — Reliability Layer: Outbox, Webhooks, Idempotency
**This is the interview centerpiece — build carefully, don't just accept AI output without tracing through the failure scenarios yourself.**

**Files:** all of `outbox/`, all of `webhook/`, all of `budget/`, `V5__create_outbox_and_webhook_tables.sql`

**Requirements:**
- `Budget` entity: org/team/service scope, cap amount, period, threshold percentages (e.g., 80%, 100%)
- `BudgetThresholdEvaluator`: on new cost data, checks against budgets; on a crossed threshold, writes an `OutboxEvent` **in the same database transaction** as any other state change — this atomicity is the entire point of the pattern
- `OutboxEvent` table: event id, event type, payload, status (PENDING/PUBLISHED), created_at
- `OutboxPublisher`: polls the outbox table (or uses a DB-level trigger/CDC approach — polling is fine for this scope) and publishes pending events to Kafka, then marks them PUBLISHED
- `WebhookDispatcher`: `@KafkaListener`, calls the configured endpoint URL, wrapped in Resilience4j `@Retry` with exponential backoff
- `WebhookDelivery` table: **must have** `UNIQUE(event_id, endpoint_id)` — this is the database-enforced exactly-once-effective/idempotency guarantee, not optional, not Redis-only
- Wording note: do not claim literal exactly-once HTTP delivery. If the remote endpoint receives a request and the acknowledgement is lost, the dispatcher may retry. The defensible guarantee is exactly-once-effective processing/recording inside Finexa, enforced by the database uniqueness constraint.
- On retry exhaustion, route to a dead-letter path (`DeadLetterHandler`) — log and persist for manual follow-up, don't silently drop

**Acceptance criteria:**
- Kill the application process between the outbox write and the publish step (simulate via a delay + manual kill in a test/demo) — on restart, the pending event still gets published. No event is lost.
- Simulate a webhook endpoint returning 503 for the first N attempts, then 200 — verify retries happen with increasing backoff and exactly **one** successful delivery record exists in `webhook_deliveries` for that `(event_id, endpoint_id)` pair despite multiple attempts
- Two concurrent workers (simulate with a test that fires two threads) processing the same event: exactly one `INSERT` succeeds, the other correctly handles the uniqueness violation without crashing or double-delivering

---

## 3. What NOT to build in this phase

- No frontend work yet — backend must be fully functional and tested via API calls/Postman/integration tests first
- No React Flow, no topology visualization
- No real AWS/GCP API integration — mock generator only
- No cost optimization recommendation logic — detection and alerting only
- Don't add a sixth microservice or split any of `ingestion/`, `detection/`, `webhook/` into separate deployable applications

---

## 4. Definition of "Backend Done"

- `docker-compose up` brings up local infrastructure cleanly: Postgres+Timescale, Redis, Kafka, and Zookeeper/KRaft as needed. During active development, run the app from Gradle against that infrastructure; add the app to Compose later only if useful for packaging/demo.
- All four phases' acceptance criteria pass, with integration tests (Testcontainers) covering each
- The full demo sequence (generate normal data → inject spike → see it flagged → cross budget threshold → webhook fires → simulate endpoint failure → confirm exactly-once-effective delivery state) can be run end-to-end via API calls alone, with no frontend required
- Swagger/OpenAPI docs are generated and accurate for every endpoint, so the frontend (built afterward) has a reliable contract to build against
