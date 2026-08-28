# Finexa — Cloud Cost Optimizer & Anomaly Detector
### Product Requirements Document — v2 (Revised Architecture)

---

## 1. Problem Statement

Companies running infrastructure on AWS, GCP, or Azure routinely get surprised by their cloud bill. Costs are spread across dozens of services, teams provision resources without central visibility, and a single misconfiguration (an idle GPU instance, an unthrottled autoscaling group, a forgotten load balancer) can silently add thousands of dollars to a monthly invoice before anyone notices — often only when finance reviews the bill weeks later.

Existing solutions fall into two camps:
- **Native cloud billing dashboards** (AWS Cost Explorer, GCP Billing) — accurate but siloed per-provider, not real-time, and not proactive.
- **Enterprise FinOps platforms** (CloudHealth, Cloudability) — powerful but expensive and heavyweight for mid-size engineering orgs.

**The gap:** a lightweight, self-hosted, multi-cloud cost visibility tool that ingests usage data continuously, detects abnormal spend *as it happens*, and can automatically stop the bleeding via budget enforcement.

This project builds a scoped-down version: a B2B SaaS-style dashboard connecting to (mocked) AWS/GCP usage data, tracking metrics near-real-time, statistically detecting spend anomalies, and enforcing budget caps via reliable webhook delivery.

---

## 2. Goals & Non-Goals

**Goals**
- Reliable, event-driven time-series ingestion and aggregation
- Statistically sound anomaly detection that accounts for seasonal/recurring spend patterns, not naive thresholds
- Exactly-once-effective budget-cap webhooks, provably correct inside Finexa under retry/concurrency failure cases
- Multi-tenant RBAC with real isolation, not just login/registration
- A working, demoable product with a live failure-injection story — not just CRUD dashboards

**Non-Goals (v1)**
- Real integration with live AWS/GCP billing APIs (mocked data generation instead)
- Cost *optimization recommendations* (rightsizing, reserved-instance suggestions) — detection and alerting only
- Framing this as an "AI" project — Synthara already covers AI/LLM engineering; this project exists to prove **reliable, data-intensive backend systems design**, and that positioning should stay clean
- Infrastructure topology visualization (React Flow)
- Payment processing for the SaaS itself

---

## 3. Target Users & Personas

| Persona | Role | Needs |
|---|---|---|
| **Org Owner** | e.g., CTO / Head of Infra | Full visibility across all teams' spend, budget config, user management |
| **Admin** | e.g., Team Lead / DevOps | View/acknowledge anomalies, configure alert thresholds for their team |
| **Viewer** | e.g., Engineer / Finance stakeholder | Read-only dashboard access |

---

## 4. Architecture

### 4.1 Principle: modular monolith, not microservices-for-their-own-sake

A single Spring Boot application, internally organized into clearly separated modules/packages. This avoids the operational overhead of running and coordinating five separate deployables for a project of this scope, while still letting you describe clean module boundaries in interviews. Kafka is used *only* where asynchronous processing is genuinely warranted — not as decoration.

```
                        React Dashboard
                              │
                              ▼
                       Spring Boot API
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
        Auth/RBAC         Cost APIs        Alert APIs
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                        PostgreSQL
                       + TimescaleDB
                              │
             ┌────────────────┴──────────────┐
             │                               │
           Redis                           Kafka
     (short-lived                    (async event backbone)
    coordination/cache)                      │
                          ┌───────────────────┼───────────────────┐
                          │                   │                   │
                   Ingestion Consumer   Detection Consumer   Webhook Dispatcher
                  (inside the same Spring Boot app — separate @KafkaListener
                   components/packages, not separate deployables)
                          │                   │                   │
                          └───────────────────┴───────────────────┘
                                              │
                                         Resilience4j
                                       (retry / backoff /
                                        circuit breaking)
```

**Important framing note:** Ingestion, Detection, and Webhook Dispatch are Kafka *consumer components* living inside the one Spring Boot deployable — distinct classes/packages with clear responsibilities, not three separate services. This preserves the "modular monolith" decision; don't let the diagram's boxes turn back into de-facto microservices.

### 4.2 Event-driven ingestion flow

```
Cloud Usage Generator (mock)
        │
        ▼
      Kafka   ← partitioned by organization_id
        │        (gives real parallelism across tenants
        │         while preserving per-org ordering)
        ▼
Ingestion Consumer
        │
        ▼
   TimescaleDB (raw + hypertable)
        │
        ▼
 Aggregation (continuous aggregates) → Detection Consumer
```

The ingestion consumer publishes a `cost-rollup-events` Kafka message after each committed raw usage write, keyed by `organization_id`, identifying the affected org/service/resource/time bucket. TimescaleDB continuous aggregates remain the query/read model; they are not treated as a push-based event source.

This gives Kafka a genuinely new problem to demonstrate versus RideFlow (which already showed basic Kafka usage): consumer groups, partition strategy, consumer lag monitoring, retry handling, and idempotent consumption — real depth rather than "I used Kafka again."

### 4.3 Webhook delivery: outbox pattern

```
Budget threshold crossed
          │
          ▼
   Create Alert Event  ──────┐
          │                  │  (same DB transaction)
          ▼                  │
   Outbox Event Table  ◄─────┘
          │
          ▼
   Outbox Publisher (polls table, publishes to Kafka)
          │
          ▼
     Kafka Topic
          │
          ▼
   Webhook Dispatcher (consumer)
          │
          ├── success → mark DELIVERED
          │
          └── failure
                 │
                 ▼
             Retry (Resilience4j exponential backoff)
                 │
        ┌────────┴────────┐
        ▼                 ▼
      success          max retries exceeded
                          │
                          ▼
                    Dead Letter Queue (for manual follow-up)
```

**Why the outbox pattern matters:** without it, there's an unanswerable question — "what happens if the DB transaction commits but the app crashes before publishing to Kafka?" The outbox table makes event creation and persistence atomic with the business transaction; a separate publisher guarantees the event eventually reaches Kafka even after a crash.

### 4.4 Idempotency: database-enforced, not Redis-only

```sql
CREATE UNIQUE INDEX ux_webhook_delivery_event_endpoint
ON webhook_deliveries(event_id, endpoint_id);
```

If two workers concurrently process the same event, one `INSERT` succeeds and the other fails on the uniqueness violation — a hard, database-enforced correctness guarantee rather than a soft one. Redis is still used, but for caching and short-lived coordination (e.g., distributed locks during processing), not as the source of truth for "has this already been delivered."

This should be described as exactly-once-effective delivery state, not literal exactly-once HTTP delivery. If a remote endpoint receives a webhook but the acknowledgement is lost, Finexa may retry the HTTP call; the defensible guarantee is that Finexa records and acts on the delivery once per `(event_id, endpoint_id)`.

---

## 5. Core Features

### 5.1 Mock Cloud Resource Ingestion
- A generator (scheduled or continuous) produces synthetic AWS/GCP-shaped usage events onto Kafka, partitioned by `organization_id`
- Supports injecting anomalies on demand (spend spikes, runaway resources) for demo/testing
- Backfills enough historical data (multiple weeks) to make seasonal baseline comparisons meaningful — this must happen *before* seasonal detection can be tested

### 5.2 Time-Series Aggregation
- TimescaleDB hypertables + continuous aggregates for hourly/daily rollups per resource, service, and organization
- `cost-rollup-events` Kafka messages emitted by the ingestion flow after raw usage writes, giving detection and budget evaluation a concrete event source instead of pretending TimescaleDB emits push events
- Dynamic date-range queries from the frontend (24h, 7d, 30d, custom)

### 5.3 Anomaly Detection — build in two phases
- **Phase 1 (naive):** rolling Z-score over a trailing window (e.g., 14 days); `|z| > threshold` flags an anomaly. Build and prove this first — it validates the whole pipeline end-to-end before adding statistical sophistication.
- **Phase 2 (seasonal):** compare each point against the equivalent point in prior cycles (e.g., "this Monday 10am" against "previous Mondays around 10am") rather than a blind rolling window, to avoid false positives from predictable daily/weekly spend patterns. Requires backfilled history to be meaningful — build only after Phase 1 works.

### 5.4 Real-Time Alerting
- Detected anomalies generate alerts, pushed to the frontend (toast/polling) and persisted for offline users
- Each alert includes: resource, expected vs. actual value, deviation %, severity, timestamp

### 5.5 Budget Cap Enforcement via Webhooks
- Configurable budget caps per org/team/service and threshold (e.g., 80%, 100%)
- Delivery via the outbox pattern described in §4.3 — atomic, crash-safe, exactly-once-effective
- Exponential backoff retries (Resilience4j) with a dead-letter path for exhausted retries

### 5.6 Multi-Tenant RBAC
- `POST /api/orgs/register` creates a new organization and first OWNER user in one transaction, so the B2B SaaS signup story is demoable
- Dev/test seed data can also create known local org/users for repeatable testing
- Every relevant table carries `organization_id`; every query enforces tenant boundaries
- Three roles: Owner (full control, billing/user mgmt), Admin (configure alerts/budgets, acknowledge anomalies), Viewer (read-only)
- Enforced server-side via Spring Security method-level authorization — not just hidden in the UI
- Explicitly tested: Org A user → Org A data (✅), Org A user → Org B data (❌)

### 5.7 Dashboard (Frontend)
- Overview: current spend vs. budget, trend charts, top cost drivers
- Time-series charts with dynamic date-range selection (React + Shadcn UI + Recharts)
- Alerts feed with severity/status
- Budget configuration (Owner/Admin only)
- Kept thin (~15% of total effort) — the backend is the point of this project

---

## 6. Recommended Build Sequence

Building all pieces in parallel risks debugging multiple unproven systems simultaneously. Sequence instead:

1. **Foundation:** modular monolith skeleton, multi-tenant schema (`organization_id` everywhere), RBAC — get this right first since everything else depends on it
2. **Data flow:** mock generator → Kafka → Ingestion Consumer → TimescaleDB — prove raw data flows correctly end-to-end before adding intelligence
3. **Detection, phase 1 then 2:** naive rolling Z-score first (validates the detection pipeline), then backfill historical data and upgrade to seasonal baselines
4. **Reliability layer, last:** outbox table + publisher, webhook dispatcher, Resilience4j retries, DB-enforced idempotency — depends on anomaly/budget events already existing to have something to deliver

---

## 7. Key Technical Challenges (Why This Project Matters)

| Challenge | What It Demonstrates |
|---|---|
| Event-driven ingestion with Kafka partitioning by tenant, consumer groups, lag handling | Distributed-systems depth beyond "I used Kafka" — a genuinely different problem than RideFlow's Kafka usage |
| TimescaleDB hypertables + continuous aggregates | Data modeling for high-write, high-read time-series workloads |
| Seasonal Z-score anomaly detection | Applying real statistical reasoning to reduce false positives, not arbitrary thresholds |
| Outbox pattern for webhook events | Understanding atomicity across a DB transaction and an async event publish — a classic distributed-systems failure mode with a real answer |
| DB-enforced idempotency (unique constraint) + Resilience4j backoff | Hard correctness guarantees under concurrent/duplicate processing, not just soft Redis-based hope |
| Multi-tenant RBAC with enforced isolation | Correctly modeling and testing authorization boundaries in a B2B SaaS context |

---

## 8. Demo Script (for interviews / portfolio video)

1. Normal EC2 spend baseline: ~$1,850/day
2. Inject a runaway instance: EC2 hourly cost jumps from $75 → $420
3. Ingestion pipeline receives the event via Kafka
4. Aggregation updates the TimescaleDB rollup
5. Anomaly detector computes a seasonal-adjusted Z-score (e.g., 4.87) and flags it
6. Alert surfaces: **CRITICAL — EC2/production-cluster — Expected: $82, Actual: $417, Deviation: +409%**
7. Budget threshold is crossed by the same event
8. Webhook fires via the outbox → dispatcher path
9. Simulate the webhook endpoint failing (503, 503, 503, then 200 on attempt 4)
10. Show that despite four attempts, exactly one successful delivery record exists (DB-enforced idempotency) — no duplicate Finexa-side effects

This is the centerpiece demo — it's worth far more in an interview than clicking through dashboard pages, because it proves the failure-handling claims rather than just asserting them.

---

## 9. Success Criteria / Definition of Done

- Ingestion flows continuously from generator → Kafka → TimescaleDB with correct per-tenant partitioning
- A deliberately injected spend spike is correctly flagged within one aggregation cycle, using the seasonal-adjusted detector
- A budget-cap-crossing event results in exactly one successful delivery record even when the endpoint fails and retries multiple times, verified via the unique constraint
- Viewer-role users cannot access budget config or admin endpoints — verified via both UI and direct API testing
- Killing and restarting the app mid-processing produces no data loss and no duplicate successful delivery state (outbox + idempotency proven under real failure, not just described)

---

## 10. Explicitly Deferred (v3 candidates)

- Real AWS/GCP billing API integration
- Cost optimization recommendations
- Infrastructure topology visualization
- Horizontal scaling of detection/ingestion consumers across multiple instances
- Rich notification templates beyond generic webhook payloads
