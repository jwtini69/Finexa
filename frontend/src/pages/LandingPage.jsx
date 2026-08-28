import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Menu,
  X,
  Lock,
  Database,
  Terminal,
  ShieldAlert,
  ArrowRight,
  FileText,
  Activity,
  Users,
  BarChart3,
  Server,
  Layers,
  Zap,
} from 'lucide-react';
import { Logo } from '../components/Logo';

export const LandingPage = ({ onLaunchApp, onOpenAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeArchTab, setActiveArchTab] = useState('tenancy');

  const archLayers = {
    tenancy: {
      tag: 'LAYER 1 · TENANT BOUNDARIES',
      title: 'Organization-Scoped Repository Queries',
      desc: 'Every database transaction is bound to a cryptographically validated tenant context. Queries are scoped server-side so data from one organization cannot leak to another.',
      guarantees: [
        'Automatic injection of organization_id on all TimescaleDB and PostgreSQL queries',
        'ThreadLocal TenantContext populated from verified JWT claims',
        'Servlet-level rejection of client-supplied tenant overrides'
      ],
      codeSnippet: `// Spring Data Repositories strictly scope queries to the authenticated tenant
@Repository
public class CostRollupRepository {
    private final JdbcClient jdbcClient;

    public List<CostSummary> findSummaryByTenant(UUID orgId, Instant from, Instant to) {
        return jdbcClient.sql("""
            SELECT service_name, SUM(total_cost) as cost
            FROM hourly_cost_rollups
            WHERE organization_id = :orgId
              AND bucket_start >= :from AND bucket_start < :to
            GROUP BY service_name
        """)
        .param("orgId", orgId)
        .param("from", from)
        .param("to", to)
        .query(CostSummary.class).list();
    }
}`
    },
    security: {
      tag: 'LAYER 2 · AUTHENTICATION & ROLES',
      title: 'Stateless JWT Bearer & RBAC Authorization',
      desc: 'Tokens carry cryptographically signed organization identity and role claims. Method-level @PreAuthorize security blocks unauthorized actions across OWNER, ADMIN, and VIEWER tiers.',
      guarantees: [
        'HMAC-SHA256 signature verification on every incoming API request',
        'Method-level role enforcement (@PreAuthorize("hasRole(\'OWNER\')"))',
        'Immediate 403 Forbidden rejection before controller execution'
      ],
      codeSnippet: `// SecurityFilterChain & method-level security enforcement
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/api/orgs/register", "/api/auth/login").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}`
    },
    aggregation: {
      tag: 'LAYER 3 · TIME-SERIES STORAGE',
      title: 'TimescaleDB Continuous Aggregate Hypertables',
      desc: 'Hourly and daily rollups materialize continuously inside PostgreSQL hypertables, streaming pre-computed cloud analytics in sub-5ms latency without scanning millions of raw rows.',
      guarantees: [
        'Pre-computed hourly & daily bucket rollups for EC2, RDS, S3, CloudFront',
        'In-database continuous aggregates refreshed on a scheduled policy',
        'Composite indexes on (organization_id, timestamp DESC, service_name)'
      ],
      codeSnippet: `// In-database TimescaleDB Continuous Aggregate View definition
CREATE MATERIALIZED VIEW hourly_cost_rollups
WITH (timescaledb.continuous) AS
SELECT
    organization_id,
    service_name,
    resource_id,
    time_bucket('1 hour', timestamp) AS bucket_start,
    SUM(cost) AS total_cost,
    COUNT(*) AS event_count
FROM raw_usage_records
GROUP BY organization_id, service_name, resource_id, time_bucket('1 hour', timestamp);

-- Automated real-time refresh policy
SELECT add_continuous_aggregate_policy('hourly_cost_rollups',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '10 minutes');`
    },
    audit: {
      tag: 'LAYER 4 · RELIABILITY & OUTBOX',
      title: 'Transactional Outbox & Idempotent Webhooks',
      desc: 'Every budget threshold breach commits an atomic OutboxEvent within the same PostgreSQL transaction. Dispatchers use Resilience4j exponential retries with database unique constraint idempotency.',
      guarantees: [
        'Atomic outbox event recording guaranteeing zero lost alert notifications',
        'Database-enforced idempotency via UNIQUE(event_id, endpoint_id)',
        'Resilience4j exponential backoff with dead-letter queue preservation'
      ],
      codeSnippet: `// Atomic transaction guarantees outbox write alongside budget state
@Transactional
public void evaluateCostEvent(CostRollupEvent event) {
    List<Budget> budgets = budgetRepository.findActiveByScope(event.organizationId(), event.serviceName());
    for (Budget budget : budgets) {
        BigDecimal newSpend = budget.currentSpend().add(event.totalCost());
        if (newSpend.compareTo(budget.capAmount().multiply(threshold)) >= 0) {
            // Atomic outbox insertion in exact same DB transaction
            outboxRepository.insert(new OutboxEvent(
                UUID.randomUUID(), budget.organizationId(),
                "BUDGET_THRESHOLD_CROSSED", payloadJson, "PENDING"
            ));
        }
    }
}`
    }
  };

  const capabilities = [
    {
      category: 'STREAMING INGESTION',
      title: 'Kafka Partitioned Event Backbone',
      desc: 'Cloud usage ingestion partitioned by tenant organization ID, ensuring strict FIFO ordering while scaling horizontally.',
      specs: [
        'Partitioning keyed by organization_id',
        'Non-blocking asynchronous Kafka consumers',
        'Dead-letter error handler isolation'
      ],
      link: 'Explore ingestion architecture →'
    },
    {
      category: 'CONTINUOUS ROLLUPS',
      title: 'TimescaleDB Hypertable Analytics',
      desc: 'Automated continuous aggregate views summarize hourly and daily multi-cloud spend across AWS EC2, RDS, S3, Lambda, and CloudFront.',
      specs: [
        'Continuous materialized rollups in sub-5ms',
        'Composite index optimization on tenant boundaries',
        '24h, 7d, 30d date-range query acceleration'
      ],
      link: 'View storage pipeline →'
    },
    {
      category: 'ANOMALY DETECTION',
      title: 'Two-Stage Seasonal Z-Score Engine',
      desc: 'Evaluates spend against cycle-matched historical windows (exact weekday and hour) before computing Z-scores, eliminating false alarms.',
      specs: [
        '14-to-30 day historical baseline calibration',
        'Severity categorization: CRITICAL, HIGH, MEDIUM',
        'Live acknowledgment and resolution audit trail'
      ],
      link: 'Read anomaly specifications →'
    },
    {
      category: 'TRANSACTIONAL OUTBOX',
      title: 'Idempotent Webhook Dispatches',
      desc: 'Budget breaches commit atomically in PostgreSQL. Webhook dispatchers use Resilience4j retries and database-enforced unique constraints.',
      specs: [
        'Zero lost alerts via polling transactional outbox',
        'Database UNIQUE(event_id, endpoint_id) constraint',
        'Exponential backoff with dead-letter queue audit'
      ],
      link: 'Inspect reliability guarantees →'
    }
  ];

  return (
    <div className="steep-page">
      {/* ---------------- TOP NAV (Whisper-quiet) ---------------- */}
      <header className="steep-header">
        <div className="steep-container">
          <nav className="steep-nav">
            <div onClick={onLaunchApp} className="cursor-pointer">
              <Logo size={32} />
            </div>

            <div className="steep-nav-links">
              <a href="#features">Features</a>
              <a href="#architecture">Architecture</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#premise">Core Premise</a>
            </div>

            <div className="steep-nav-actions">
              <button
                onClick={onOpenAuth}
                className="text-[15px] text-ink-black font-normal hover:underline cursor-pointer bg-transparent border-none mr-2"
              >
                Log in
              </button>
              <button
                onClick={onLaunchApp}
                className="btn-pill-filled"
              >
                Open Demo Workspace
              </button>
            </div>

            <button
              className="mobile-menu-toggle"
              style={{ display: 'none' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X style={{ fontSize: 20 }} /> : <Menu style={{ fontSize: 20 }} />}
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* ---------------- 16:9 WIDESCREEN HERO SECTION (Scattered Artifacts) ---------------- */}
        <section className="hero-steep">
          <div className="steep-container hero-widescreen-stage">
            
            {/* Artifact 1: Operating Spend Ledger Data Table (Scattered Top-Left) */}
            <motion.div
              className="floating-artifact artifact-table-scattered"
              initial={{ opacity: 0, y: 20, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: -1.5 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="artifact-table-head">
                <span className="tag-category" style={{ margin: 0 }}>SYNTHETIC SPEND LEDGER</span>
                <span style={{ fontSize: 11, color: '#777b86' }}>us-east-1</span>
              </div>
              <div className="artifact-table-row">
                <span>EC2 Compute Cluster</span>
                <strong>$42,810.20</strong>
              </div>
              <div className="artifact-table-row">
                <span>RDS Aurora Multi-AZ</span>
                <span style={{ color: '#5d2a1a', fontWeight: 500 }}>$18,240.00</span>
              </div>
              <div className="artifact-table-row">
                <span>S3 Standard Storage</span>
                <strong>$6,190.45</strong>
              </div>
            </motion.div>

            {/* Artifact 2: Spend Trajectory Line Chart (Scattered Top-Right) */}
            <motion.div
              className="floating-artifact artifact-chart-scattered"
              initial={{ opacity: 0, y: 20, rotate: 3 }}
              animate={{ opacity: 1, y: 0, rotate: 1.8 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="tag-category" style={{ margin: 0 }}>PERIOD SPEND ROLLUP</span>
                  <div className="artifact-chart-metric">$72,770</div>
                </div>
                <span className="tag-category" style={{ color: '#5d2a1a', margin: 0 }}>+28.4%</span>
              </div>
              <span className="artifact-chart-delta">TimescaleDB continuous aggregate</span>

              <svg className="artifact-svg-chart" viewBox="0 0 320 70" fill="none">
                <path
                  d="M0 55 C 60 52, 90 42, 140 45 C 190 48, 230 20, 310 8"
                  stroke="#5d2a1a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="310" cy="8" r="4" fill="#5d2a1a" />
              </svg>
            </motion.div>

            {/* Center Content: Headline, Subhead, Pill Button Pair */}
            <div className="hero-center-content">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                Cloud costs, <br />
                <em>done properly.</em>
              </motion.h1>

              <motion.p
                className="hero-steep-subhead"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              >
                A modular monolith for multi-tenant cloud cost intelligence. Kafka streaming ingestion, continuous TimescaleDB rollups, and two-stage seasonal Z-score anomaly detection.
              </motion.p>

              <motion.div
                className="hero-steep-actions"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
              >
                <button onClick={onLaunchApp} className="btn-pill-filled cursor-pointer">
                  Launch Demo Workspace
                </button>
                <button onClick={onOpenAuth} className="btn-pill-ghost cursor-pointer">
                  Sign in
                </button>
              </motion.div>

              <div style={{ marginTop: 24, fontSize: 13, color: '#777b86' }}>
                * Illustrated with synthetic multi-cloud workload generator
              </div>
            </div>

            {/* Artifact 3: Anomaly Stat Metric Card (Scattered Bottom-Left) */}
            <motion.div
              className="floating-artifact artifact-stat-scattered"
              initial={{ opacity: 0, y: 20, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 1.2 }}
              transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
            >
              <span className="tag-category">ANOMALY SIMULATION</span>
              <div className="artifact-stat-value">5.24σ</div>
              <span style={{ fontSize: 13, color: '#777b86' }}>$450.00/hr spike detected</span>
            </motion.div>

            {/* Artifact 4: Multi-Cloud Allocation & Outbox Card (Scattered Bottom-Right) */}
            <motion.div
              className="floating-artifact artifact-cashflow-scattered"
              initial={{ opacity: 0, y: 20, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: -1.2 }}
              transition={{ duration: 0.6, delay: 0.45, ease: 'easeOut' }}
            >
              <div className="artifact-cashflow-header">
                <span className="tag-category" style={{ margin: 0 }}>SERVICE BREAKDOWN</span>
                <span style={{ fontSize: 12, color: '#777b86' }}>6 seeded services</span>
              </div>
              <div className="artifact-cashflow-metrics">
                <div>
                  <strong>$72,770.75</strong>
                  <span style={{ display: 'block', fontSize: 11, color: '#777b86' }}>Period Total</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#5d2a1a' }}>200 OK</strong>
                  <span style={{ display: 'block', fontSize: 11, color: '#777b86' }}>Outbox Webhook</span>
                </div>
              </div>

              <div className="distribution-bar">
                <div className="segment-1" title="EC2 Compute 46%" />
                <div className="segment-2" title="RDS Aurora 24%" />
                <div className="segment-3" title="S3 Storage 18%" />
                <div className="segment-4" title="CloudFront & Lambda 12%" />
              </div>

              <div className="distribution-legend">
                <span><i style={{ background: '#17191c' }} /> EC2 46%</span>
                <span><i style={{ background: '#5d2a1a' }} /> RDS 24%</span>
                <span><i style={{ background: '#777b86' }} /> S3 18%</span>
                <span><i style={{ background: '#fbe1d1', border: '1px solid rgba(93,42,26,0.3)' }} /> Edge 12%</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------------- SECTION 1: CORE FINOPS MODULES (#features) ---------------- */}
        <section id="features" className="section-steep section-paper" style={{ borderTop: '1px solid var(--color-hairline)' }}>
          <div className="steep-container">
            <div style={{ maxWidth: 720, margin: '0 auto 56px', textAlign: 'center' }}>
              <span className="tag-category">CORE SYSTEM MODULES</span>
              <h2 className="text-heading" style={{ margin: '8px 0 16px' }}>
                Engineered for high-volume streaming operations.
              </h2>
              <p className="text-body">
                Four purpose-built engines working together to replace batch scripts and unmonitored cloud spending.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              {/* Feature 1 */}
              <div className="card-steep-mist" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <Server style={{ fontSize: 20, color: 'var(--color-ink-black)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-sohne)', fontSize: 20, fontWeight: 500, margin: '0 0 8px', color: 'var(--color-ink-black)' }}>
                    Kafka Ingestion Stream
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--color-slate-gray)', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Partitioned by organization identity, guaranteeing strict FIFO event ordering per tenant without database locking bottlenecks.
                  </p>
                </div>
                <button onClick={onLaunchApp} className="link-arrow" style={{ fontSize: 14, background: 'none', border: 'none', padding: 0 }}>
                  Open ingestion workspace <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>

              {/* Feature 2 */}
              <div className="card-steep-mist" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <Database style={{ fontSize: 20, color: 'var(--color-ink-black)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-sohne)', fontSize: 20, fontWeight: 500, margin: '0 0 8px', color: 'var(--color-ink-black)' }}>
                    TimescaleDB Continuous Rollups
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--color-slate-gray)', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Materialized hourly and daily hypertables compute aggregated spend over 30 days in sub-5ms without full table scans.
                  </p>
                </div>
                <button onClick={onLaunchApp} className="link-arrow" style={{ fontSize: 14, background: 'none', border: 'none', padding: 0 }}>
                  Inspect continuous views <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>

              {/* Feature 3 */}
              <div className="card-steep-mist" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <ShieldAlert style={{ fontSize: 20, color: 'var(--color-ink-black)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-sohne)', fontSize: 20, fontWeight: 500, margin: '0 0 8px', color: 'var(--color-ink-black)' }}>
                    Seasonal Anomaly Detection
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--color-slate-gray)', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Evaluates spend against matching historical day-of-week and hour-of-day baselines to eliminate predictable false alarms.
                  </p>
                </div>
                <button onClick={onLaunchApp} className="link-arrow" style={{ fontSize: 14, background: 'none', border: 'none', padding: 0 }}>
                  Explore anomaly engine <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>

              {/* Feature 4 */}
              <div className="card-steep-mist" style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <Activity style={{ fontSize: 20, color: 'var(--color-ink-black)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-sohne)', fontSize: 20, fontWeight: 500, margin: '0 0 8px', color: 'var(--color-ink-black)' }}>
                    Transactional Outbox Webhooks
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--color-slate-gray)', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Atomically records budget breach events with Resilience4j exponential retries and database-enforced unique idempotency.
                  </p>
                </div>
                <button onClick={onLaunchApp} className="link-arrow" style={{ fontSize: 14, background: 'none', border: 'none', padding: 0 }}>
                  View outbox proofs <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- SECTION 2: INTERACTIVE ARCHITECTURE SECTION (#architecture) ---------------- */}
        <section id="architecture" className="section-steep section-fog">
          <div className="steep-container">
            <div style={{ maxWidth: 760, marginBottom: 48 }}>
              <span className="tag-category">SYSTEM ARCHITECTURE & SECURITY ISOLATION</span>
              <h2 className="text-heading" style={{ margin: '8px 0 16px' }}>
                Tenant isolation enforced before queries execute.
              </h2>
              <p className="text-body">
                Finexa guards tenant boundaries at the data repository layer. No controller or service can query raw database collections without injectively bound organization scoping.
              </p>
            </div>

            {/* Interactive Architecture Layer Switcher */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
              <button
                onClick={() => setActiveArchTab('tenancy')}
                style={{
                  padding: '10px 20px',
                  borderRadius: 9999,
                  border: '1px solid',
                  borderColor: activeArchTab === 'tenancy' ? 'var(--color-ink-black)' : 'var(--color-hairline)',
                  background: activeArchTab === 'tenancy' ? 'var(--color-ink-black)' : '#ffffff',
                  color: activeArchTab === 'tenancy' ? '#ffffff' : 'var(--color-ink-black)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease'
                }}
              >
                <Database style={{ width: 15, height: 15 }} /> 1. Scoped Repositories
              </button>

              <button
                onClick={() => setActiveArchTab('security')}
                style={{
                  padding: '10px 20px',
                  borderRadius: 9999,
                  border: '1px solid',
                  borderColor: activeArchTab === 'security' ? 'var(--color-ink-black)' : 'var(--color-hairline)',
                  background: activeArchTab === 'security' ? 'var(--color-ink-black)' : '#ffffff',
                  color: activeArchTab === 'security' ? '#ffffff' : 'var(--color-ink-black)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease'
                }}
              >
                <Lock style={{ width: 15, height: 15 }} /> 2. JWT & RBAC
              </button>

              <button
                onClick={() => setActiveArchTab('aggregation')}
                style={{
                  padding: '10px 20px',
                  borderRadius: 9999,
                  border: '1px solid',
                  borderColor: activeArchTab === 'aggregation' ? 'var(--color-ink-black)' : 'var(--color-hairline)',
                  background: activeArchTab === 'aggregation' ? 'var(--color-ink-black)' : '#ffffff',
                  color: activeArchTab === 'aggregation' ? '#ffffff' : 'var(--color-ink-black)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease'
                }}
              >
                <BarChart3 style={{ width: 15, height: 15 }} /> 3. Continuous Aggregation
              </button>

              <button
                onClick={() => setActiveArchTab('audit')}
                style={{
                  padding: '10px 20px',
                  borderRadius: 9999,
                  border: '1px solid',
                  borderColor: activeArchTab === 'audit' ? 'var(--color-ink-black)' : 'var(--color-hairline)',
                  background: activeArchTab === 'audit' ? 'var(--color-ink-black)' : '#ffffff',
                  color: activeArchTab === 'audit' ? '#ffffff' : 'var(--color-ink-black)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease'
                }}
              >
                <Zap style={{ width: 15, height: 15 }} /> 4. Transactional Outbox
              </button>
            </div>

            {/* Architecture Blueprint Terminal Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeArchTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="card-steep"
                style={{
                  padding: 36,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: 36,
                  background: '#ffffff',
                  marginBottom: 36
                }}
              >
                {/* Left Column: Description & Guarantees */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span className="tag-category" style={{ color: 'var(--color-sienna-brown)' }}>
                      {archLayers[activeArchTab].tag}
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-signifier)', fontSize: 28, margin: '8px 0 16px', color: 'var(--color-ink-black)', fontWeight: 400 }}>
                      {archLayers[activeArchTab].title}
                    </h3>
                    <p style={{ fontSize: 15, color: 'var(--color-slate-gray)', lineHeight: 1.6, marginBottom: 24 }}>
                      {archLayers[activeArchTab].desc}
                    </p>

                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-black)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                      Implementation Details:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                      {archLayers[activeArchTab].guarantees.map((item, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--color-ink-black)' }}>
                          <span style={{ color: 'var(--color-sienna-brown)', marginTop: 2 }}>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-hairline)' }}>
                    <button
                      onClick={onLaunchApp}
                      className="link-arrow"
                      style={{ fontSize: 14, background: 'none', border: 'none', padding: 0 }}
                    >
                      Inspect production specifications →
                    </button>
                  </div>
                </div>

                {/* Right Column: Code Simulator Terminal */}
                <div
                  style={{
                    background: '#17191c',
                    borderRadius: 16,
                    padding: 24,
                    color: '#f8fafc',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 13,
                    lineHeight: 1.6,
                    overflowX: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 12, marginBottom: 16, fontSize: 11, color: '#979799' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
                    </div>
                    <span>finexa-architecture-layer.java</span>
                  </div>
                  <pre style={{ margin: 0, color: '#f2f2f3', overflowX: 'auto' }}>
                    <code>{archLayers[activeArchTab].codeSnippet}</code>
                  </pre>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 3 Tenancy & Performance Badges */}
            <div className="tenancy-grid">
              <div className="tenancy-card">
                <div>
                  <span className="tenancy-card-tag">TENANCY BOUNDARIES</span>
                  <h3>Zero Cross-Tenant Leakage</h3>
                  <p>
                    Every database query strictly scopes WHERE organization_id = :tenantId directly from cryptographically signed JWT claims.
                  </p>
                  <div className="tenancy-feature-badge">
                    <i />
                    <span>Injected Context · Tenant Scoping</span>
                  </div>
                </div>
                <button onClick={onLaunchApp} className="link-arrow" style={{ background: 'none', border: 'none', padding: 0 }}>
                  Explore repository pattern →
                </button>
              </div>

              <div className="tenancy-card">
                <div>
                  <span className="tenancy-card-tag">SECURITY & ROLES</span>
                  <h3>RBAC Method Security</h3>
                  <p>
                    Method-level @PreAuthorize checks protect OWNER, ADMIN, and VIEWER operations against privilege escalation.
                  </p>
                  <div className="tenancy-feature-badge">
                    <i />
                    <span>Role Enforcement · JWT Bearer</span>
                  </div>
                </div>
                <button onClick={onLaunchApp} className="link-arrow" style={{ background: 'none', border: 'none', padding: 0 }}>
                  View security specifications →
                </button>
              </div>

              <div className="tenancy-card">
                <div>
                  <span className="tenancy-card-tag">TIMESERIES ENGINE</span>
                  <h3>TimescaleDB Continuous Rollups</h3>
                  <p>
                    Hourly and daily continuous aggregate views summarize millions of usage events in sub-5ms latency.
                  </p>
                  <div className="tenancy-feature-badge">
                    <i />
                    <span>Hypertable Chunks · Materialized Views</span>
                  </div>
                </div>
                <button onClick={onLaunchApp} className="link-arrow" style={{ background: 'none', border: 'none', padding: 0 }}>
                  Read aggregation models →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- SECTION 3: ACCENT PEACH CARD (Paper White Canvas) ---------------- */}
        <section id="premise" className="section-steep section-paper">
          <div className="steep-container">
            <div className="accent-peach-card">
              <h2>Why static threshold alerts fail on cloud workloads.</h2>
              <p>
                Static threshold alerts generate constant false alarms because cloud usage follows weekly cyclical rhythms. A 200% spend surge at 2:00 PM on a Tuesday is routine customer traffic; the exact same surge on Sunday at 3:00 AM is a runaway autoscaling loop. Finexa cycle-matches each hour against identical historical weekday windows before computing Z-scores, eliminating predictable false alarms while reliably catching real runaway compute.
              </p>
              <div className="attribution">
                <strong>Core Architectural Premise</strong> · Finexa Two-Stage Anomaly Engine
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- SECTION 4: EXPANDED CAPABILITIES SHOWCASE (Fog White Background) ---------------- */}
        <section id="capabilities" className="section-steep section-fog">
          <div className="steep-container">
            <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 64px' }}>
              <span className="tag-category">FULL SUITE CAPABILITIES</span>
              <h2 className="text-heading" style={{ margin: '8px 0 16px' }}>
                Complete FinOps intelligence in one unified workspace.
              </h2>
              <p className="text-body">
                Eliminate disconnected tools. Finexa unites streaming usage ingestion, continuous cost aggregation, seasonal anomaly detection, and transactional outbox alerting into a single cohesive platform.
              </p>
            </div>

            <div className="feature-showcase-grid">
              {capabilities.map((cap) => (
                <div key={cap.category} className="feature-showcase-card">
                  <div>
                    <span className="tag-category">{cap.category}</span>
                    <h3>{cap.title}</h3>
                    <p>{cap.desc}</p>
                    <ul className="feature-spec-list">
                      {cap.specs.map((spec) => (
                        <li key={spec}>
                          <Check style={{ width: 14, height: 14, color: 'var(--color-sienna-brown)' }} />
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={onLaunchApp}
                    className="link-arrow"
                    style={{ background: 'none', border: 'none', padding: 0 }}
                  >
                    {cap.link}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- FOOTER (Paper White) ---------------- */}
      <footer className="steep-footer">
        <div className="steep-container">
          <div style={{ marginBottom: 36 }}>
            <Logo size={30} subtitle="Cloud Cost Optimizer & Anomaly Detector" />
          </div>
          <div className="steep-footer-grid">
            <div className="steep-footer-col">
              <strong>Product</strong>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-ink-black text-sm bg-transparent border-none p-0 cursor-pointer">Dashboard</button>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-ink-black text-sm bg-transparent border-none p-0 cursor-pointer">Cost Analytics</button>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-ink-black text-sm bg-transparent border-none p-0 cursor-pointer">Anomalies Feed</button>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-ink-black text-sm bg-transparent border-none p-0 cursor-pointer">Budgets & Caps</button>
            </div>
            <div className="steep-footer-col">
              <strong>Operations</strong>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-ink-black text-sm bg-transparent border-none p-0 cursor-pointer">Team & RBAC</button>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-ink-black text-sm bg-transparent border-none p-0 cursor-pointer">Webhooks Audit</button>
              <a href="/swagger-ui.html" target="_blank" rel="noreferrer">API Documentation</a>
              <button onClick={onOpenAuth} className="text-left text-slate-gray hover:text-ink-black text-sm bg-transparent border-none p-0 cursor-pointer">Log in</button>
            </div>
            <div className="steep-footer-col">
              <strong>Architecture</strong>
              <a href="#features">Kafka Streaming</a>
              <a href="#architecture">Tenant Isolation</a>
              <a href="#architecture">Continuous Hypertables</a>
              <a href="#capabilities">Transactional Outbox</a>
            </div>
            <div className="steep-footer-col">
              <strong>Observability</strong>
              <a href="/actuator/health" target="_blank" rel="noreferrer">System Health</a>
              <a href="/actuator/metrics" target="_blank" rel="noreferrer">Actuator Metrics</a>
              <a href="#premise">Core Premise</a>
            </div>
          </div>

          <div className="steep-footer-bottom">
            <span>© {new Date().getFullYear()} Finexa Systems. Built with TimescaleDB & Apache Kafka.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/swagger-ui.html" target="_blank" rel="noreferrer" style={{ color: '#777b86' }}>OpenAPI 3.1</a>
              <a href="/actuator/health" target="_blank" rel="noreferrer" style={{ color: '#777b86' }}>Status</a>
              <button onClick={onLaunchApp} style={{ color: '#777b86', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Demo Workspace</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
