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
  ExternalLink,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { Logo } from '../components/Logo';

function GithubIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export const LandingPage = ({ onLaunchApp, onOpenAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeArchTab, setActiveArchTab] = useState('tenancy');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Toggle FAQ Accordion
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const githubUrl = 'https://github.com/jwtini69/Finexa';

  // 1. Architecture Snippets (Technical Credibility Section)
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

  // 2. FAQs List
  const faqs = [
    {
      q: 'How does Finexa enforce multi-tenant data isolation?',
      a: 'Every incoming request passes through the TenantFilter servlet filter which extracts the organization_id from cryptographically verified JWT claims and binds it to a ThreadLocal TenantContext. All database queries in Spring Data repositories inject WHERE organization_id = :tenantId directly, making client-side overrides impossible.'
    },
    {
      q: 'Which cloud providers and multi-cloud services are supported?',
      a: 'Finexa natively ingests AWS Cost and Usage Reports (CUR), GCP Cloud Billing BigQuery exports, and Azure Cost Management feeds. The data schema supports multi-service breakdowns across EC2, Aurora RDS, S3, CloudFront, Lambda, and custom infrastructure tags.'
    },
    {
      q: 'What happens if a Slack or PagerDuty webhook fails during a network blip?',
      a: 'Finexa uses the Transactional Outbox pattern. Alerts are committed to the outbox_events table in the same atomic database transaction as the budget evaluation. A scheduled dispatcher delivers events with Resilience4j exponential backoff. Database-level UNIQUE(event_id, endpoint_id) constraints prevent duplicate delivery even under concurrent retries.'
    },
    {
      q: 'Can Finexa be self-hosted locally?',
      a: 'Yes. The entire infrastructure stack (TimescaleDB / PostgreSQL, Apache Kafka KRaft mode, Redis, Spring Boot backend, and React frontend) is fully containerized and can be launched in a single command using docker compose up -d.'
    },
    {
      q: 'How does two-stage seasonal baseline detection eliminate false alarms?',
      a: 'Static threshold alerts fail because cloud workloads follow weekly cycles. Finexa matches the current hour against identical historical windows (e.g. Tuesday 14:00 vs. past Tuesdays at 14:00) before computing the rolling Z-score. This eliminates 2 AM weekend false alarms while reliably catching real runaway compute.'
    }
  ];

  return (
    <div className="steep-page selection:bg-blush-peach selection:text-sienna-brown">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVBAR (Whisper-Quiet Frosted Glass)
      ────────────────────────────────────────────────────────────── */}
      <header className="steep-header">
        <div className="steep-container">
          <nav className="steep-nav">
            {/* Brand Logo */}
            <div onClick={onLaunchApp} className="cursor-pointer transition-transform active:scale-95">
              <Logo size={34} showBadge />
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8 text-[15px] text-ink-black font-normal">
              <a href="#how-it-works" className="hover:text-sienna-brown transition-colors">How It Works</a>
              <a href="#features" className="hover:text-sienna-brown transition-colors">Features</a>
              <a href="#architecture" className="hover:text-sienna-brown transition-colors">Architecture</a>
              <a href="#demo-section" className="hover:text-sienna-brown transition-colors">Simulator</a>
              <a href="#faq" className="hover:text-sienna-brown transition-colors">FAQ</a>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-4">
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[15px] text-ink-black hover:text-sienna-brown transition-colors font-normal"
              >
                <GithubIcon className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <button
                onClick={onOpenAuth}
                className="px-4 py-1.5 text-[14px] text-ink-black font-normal rounded-full border border-ink-black/25 hover:border-ink-black hover:bg-mist-gray/60 transition-all cursor-pointer bg-transparent"
              >
                Log in
              </button>
              <button
                onClick={onLaunchApp}
                className="btn-pill-filled text-[15px]"
              >
                View Demo Console →
              </button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              className="flex md:hidden p-2 rounded-lg text-ink-black hover:bg-blush-peach/40 transition-colors cursor-pointer border-none bg-transparent"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute top-full left-0 right-0 bg-paper-white border-b border-blush-peach px-6 py-5 shadow-lg flex flex-col gap-4 z-50"
            >
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-base text-ink-black py-1 hover:text-sienna-brown">How It Works</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base text-ink-black py-1 hover:text-sienna-brown">Features</a>
              <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="text-base text-ink-black py-1 hover:text-sienna-brown">Architecture</a>
              <a href="#demo-section" onClick={() => setMobileMenuOpen(false)} className="text-base text-ink-black py-1 hover:text-sienna-brown">Simulator</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-base text-ink-black py-1 hover:text-sienna-brown">FAQ</a>
              <div className="pt-3 border-t border-blush-peach flex flex-col gap-2.5">
                <a href={githubUrl} target="_blank" rel="noreferrer" className="btn-pill-ghost w-full justify-center gap-2">
                  <GithubIcon className="w-4 h-4" /> View on GitHub
                </a>
                <button
                  onClick={() => { setMobileMenuOpen(false); onLaunchApp(); }}
                  className="btn-pill-filled w-full justify-center"
                >
                  View Demo Console →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* ─────────────────────────────────────────────────────────────
            1. HERO SECTION (Above the fold: Outcome-led headline + Hero Visual)
        ────────────────────────────────────────────────────────────── */}
        <section className="hero-steep pt-14 pb-20 relative">
          {/* Subtle Warm Focal Glow & Defined Ledger Grid Pattern */}
          <div className="hero-glow-wash" />
          <div className="hero-grid-pattern" />

          <div className="steep-container relative z-10">
            
            {/* Centerpiece Text */}
            <div className="hero-center-content max-w-[820px] mx-auto text-center space-y-6 mb-14">
              
              {/* Highlight Tag with Peach Tint */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blush-peach/70 border border-sienna-brown/20 shadow-sm rounded-buttons text-[13px] text-sienna-brown font-medium">
                <span className="w-2 h-2 rounded-full bg-sienna-brown animate-pulse" />
                <span>Distributed Cloud Cost Intelligence</span>
              </div>

              {/* Outcome-first Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="font-signifier text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-normal text-ink-black tracking-[-2px] leading-[1.08]"
              >
                Catch cloud cost anomalies <br className="hidden sm:inline" />
                <span className="italic font-normal text-ink-black">before they hit your bill.</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
                className="text-body-lg text-slate-gray max-w-[660px] mx-auto leading-relaxed"
              >
                Real-time anomaly detection across AWS &amp; GCP with automatic budget-cap alerts your engineering team can actually act on.
              </motion.p>

              {/* Primary & Secondary CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
                className="flex flex-wrap items-center justify-center gap-4 pt-2"
              >
                <button
                  onClick={onLaunchApp}
                  className="btn-pill-filled text-[16px] px-8 h-[46px] cursor-pointer shadow-md"
                >
                  View Demo Console →
                </button>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pill-ghost text-[16px] px-7 h-[46px] inline-flex items-center gap-2 hover:bg-blush-peach/40 hover:border-sienna-brown/40"
                >
                  <GithubIcon className="w-4 h-4" />
                  <span>View on GitHub</span>
                </a>
              </motion.div>
            </div>

            {/* Hero Visual: Live Anomaly Spike Detection Artifact Card (16:9 Widescreen) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
              className="max-w-5xl lg:max-w-6xl mx-auto bg-paper-white rounded-cards border border-sienna-brown/20 p-6 sm:p-10 shadow-xl relative"
            >
              {/* Header inside visual */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-blush-peach/60 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-3 py-0.5 bg-blush-peach text-sienna-brown text-[11px] font-semibold uppercase rounded-full border border-sienna-brown/20">
                      5.24σ Critical Anomaly
                    </span>
                    <span className="text-[12px] text-slate-gray font-mono">#anom-9f8e2a</span>
                  </div>
                  <h3 className="font-signifier text-2xl text-ink-black font-normal">
                    EC2 Runaway Workload Spike Caught in Real-Time
                  </h3>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1 bg-blush-peach/40 border border-sienna-brown/20 rounded-buttons text-[13px] text-sienna-brown font-medium">
                  <span className="w-2 h-2 rounded-full bg-sienna-brown animate-ping" />
                  <span>Outbox Webhook 200 OK</span>
                </div>
              </div>

              {/* Visual Graph & Comparison Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-blush-peach/60">
                <div className="p-4 bg-fog-white rounded-xl border border-mist-gray">
                  <div className="text-[12px] uppercase text-slate-gray font-medium mb-1">Expected Baseline</div>
                  <div className="text-2xl font-medium text-slate-gray">$75.20<span className="text-sm font-normal">/hr</span></div>
                  <div className="text-[12px] text-slate-gray mt-1">14-day Tuesday 14:00 cycle</div>
                </div>

                <div className="p-4 rounded-xl border border-sienna-brown/30 bg-blush-peach/40">
                  <div className="text-[12px] uppercase text-sienna-brown font-semibold mb-1">Actual Spike Caught</div>
                  <div className="text-2xl font-semibold text-ink-black">$450.00<span className="text-sm text-sienna-brown font-medium">/hr (+498%)</span></div>
                  <div className="text-[12px] text-sienna-brown font-medium mt-1">Flagged in under 3 seconds</div>
                </div>

                <div className="p-4 bg-fog-white rounded-xl border border-mist-gray">
                  <div className="text-[12px] uppercase text-slate-gray font-medium mb-1">Outbox Reliability</div>
                  <div className="text-2xl font-medium text-ink-black">100%<span className="text-sm text-sienna-brown font-medium"> Delivered</span></div>
                  <div className="text-[12px] text-slate-gray mt-1">Resilience4j Idempotent Dispatch</div>
                </div>
              </div>

              {/* Chart Line in Sienna Brown with Peach fill */}
              <div className="pt-4">
                <div className="flex justify-between items-center text-[12px] text-slate-gray mb-2">
                  <span>Spend Trajectory &amp; Automated Cap Threshold</span>
                  <span className="font-mono text-sienna-brown font-semibold">Z-Score: +5.24σ</span>
                </div>
                <svg viewBox="0 0 760 100" className="w-full h-20 overflow-visible">
                  <defs>
                    <linearGradient id="peachGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbe1d1" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#fbe1d1" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  {/* Fill below line */}
                  <path d="M 0 75 C 100 74, 250 72, 400 70 C 500 70, 560 68, 620 68 C 650 68, 680 20, 760 15 L 760 100 L 0 100 Z" fill="url(#peachGradient)" />
                  {/* Baseline path */}
                  <path d="M 0 75 C 100 74, 250 72, 400 70 C 500 70, 560 68, 620 68 C 650 68, 680 20, 760 15" fill="none" stroke="#5d2a1a" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="760" cy="15" r="5" fill="#5d2a1a" />
                  {/* Threshold dashed line */}
                  <line x1="0" y1="50" x2="760" y2="50" stroke="#777b86" strokeDasharray="4 4" strokeWidth="1" />
                  <text x="10" y="44" fill="#5d2a1a" fontSize="10" fontFamily="monospace" fontWeight="500">BUDGET CAP THRESHOLD ($100/hr)</text>
                </svg>
              </div>

            </motion.div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            2. TRUST / CREDIBILITY STRIP (Tech Stack Social Proof in Peach)
        ────────────────────────────────────────────────────────────── */}
        <section className="bg-blush-peach/30 py-10 border-y border-blush-peach/70">
          <div className="steep-container">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              <div className="text-[13px] uppercase tracking-widest text-sienna-brown font-semibold">
                ENGINEERED FOR STREAMING SCALE
              </div>

              {/* Badges / Metric Strip */}
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[14px] text-ink-black font-medium">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-sienna-brown" />
                  <span>Apache Kafka (KRaft Partitioned)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sienna-brown" />
                  <span>TimescaleDB Hypertables</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sienna-brown" />
                  <span>Sub-5ms Query Rollups</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-sienna-brown" />
                  <span>Transactional Outbox (Resilience4j)</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. HOW IT WORKS (Positioned directly after Trust Strip)
        ────────────────────────────────────────────────────────────── */}
        <section id="how-it-works" className="section-steep bg-blush-peach/15 border-b border-blush-peach/40 scroll-mt-28">
          <div className="steep-container">
            
            <div className="max-w-2xl mb-16">
              <span className="inline-block px-3.5 py-1 bg-blush-peach text-sienna-brown border border-sienna-brown/20 rounded-buttons text-[12px] font-semibold uppercase tracking-wider">
                HOW IT WORKS
              </span>
              <h2 className="text-heading mt-3">
                From raw cloud record to verified resolution.
              </h2>
              <p className="text-body mt-3">
                Four decoupled subsystems running in deterministic sequence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Step 1 */}
              <div className="bg-paper-white rounded-cards p-6 border border-blush-peach/60 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 bg-blush-peach text-sienna-brown font-bold rounded-full mb-3 inline-block">
                    STEP 01
                  </span>
                  <h3 className="text-[18px] font-medium text-ink-black mb-2">
                    Ingest
                  </h3>
                  <p className="text-[14px] text-slate-gray leading-relaxed mb-4">
                    Usage records stream through Apache Kafka, partitioned per organization ID for strict FIFO ordering.
                  </p>
                </div>
                <div className="p-3 bg-blush-peach/20 rounded-lg font-mono text-[11px] text-sienna-brown border border-blush-peach/60">
                  topic: usage-events [KRaft]
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-paper-white rounded-cards p-6 border border-blush-peach/60 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 bg-blush-peach text-sienna-brown font-bold rounded-full mb-3 inline-block">
                    STEP 02
                  </span>
                  <h3 className="text-[18px] font-medium text-ink-black mb-2">
                    Detect
                  </h3>
                  <p className="text-[14px] text-slate-gray leading-relaxed mb-4">
                    Two-stage seasonal baseline Z-score analysis flags real statistical anomalies (&gt; 3.0σ), never routine traffic cycles.
                  </p>
                </div>
                <div className="p-3 bg-blush-peach/40 rounded-lg font-mono text-[11px] text-sienna-brown border border-sienna-brown/25 font-semibold">
                  Z = (Actual - μ) / σ &gt; 3.0σ
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-paper-white rounded-cards p-6 border border-blush-peach/60 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 bg-blush-peach text-sienna-brown font-bold rounded-full mb-3 inline-block">
                    STEP 03
                  </span>
                  <h3 className="text-[18px] font-medium text-ink-black mb-2">
                    Alert
                  </h3>
                  <p className="text-[14px] text-slate-gray leading-relaxed mb-4">
                    Transactional outbox commits alert records atomically in PostgreSQL. Webhooks retry with Resilience4j backoff.
                  </p>
                </div>
                <div className="p-3 bg-blush-peach/20 rounded-lg font-mono text-[11px] text-sienna-brown border border-blush-peach/60">
                  UNIQUE(event_id, endpoint_id)
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-paper-white rounded-cards p-6 border border-blush-peach/60 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 bg-blush-peach text-sienna-brown font-bold rounded-full mb-3 inline-block">
                    STEP 04
                  </span>
                  <h3 className="text-[18px] font-medium text-ink-black mb-2">
                    Triage
                  </h3>
                  <p className="text-[14px] text-slate-gray leading-relaxed mb-4">
                    On-call engineers acknowledge anomalies and log post-mortem resolution notes right from the workspace dashboard.
                  </p>
                </div>
                <div className="p-3 bg-blush-peach/30 rounded-lg font-mono text-[11px] text-sienna-brown border border-sienna-brown/20 font-medium">
                  Status: ACKNOWLEDGED → RESOLVED
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. THE PROBLEM SECTION
        ────────────────────────────────────────────────────────────── */}
        <section className="section-steep section-paper">
          <div className="steep-container">
            
            <div className="max-w-2xl mx-auto text-center mb-16">
              <span className="inline-block px-3.5 py-1 bg-blush-peach text-sienna-brown border border-sienna-brown/20 rounded-buttons text-[12px] font-semibold uppercase tracking-wider">
                THE CORE PROBLEM
              </span>
              <h2 className="text-heading mt-3">
                Why cloud costs get out of control.
              </h2>
              <p className="text-body mt-3">
                Traditional cloud cost monitoring fails engineering teams at three critical inflection points.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Problem 1 */}
              <div className="bg-fog-white rounded-cards p-8 border border-blush-peach/50 flex flex-col justify-between hover:border-sienna-brown/30 transition-all">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blush-peach flex items-center justify-center mb-5 shadow-sm border border-sienna-brown/15">
                    <AlertTriangle className="w-5 h-5 text-sienna-brown" />
                  </div>
                  <h3 className="text-[20px] font-medium text-ink-black mb-3">
                    The Day-30 Invoice Shock
                  </h3>
                  <p className="text-[15px] text-slate-gray leading-relaxed">
                    Teams learn about a broken worker loop or unattached EBS volumes 30 days after the overspend began — when the monthly AWS invoice lands.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-blush-peach/40 rounded-xl border border-sienna-brown/15 text-[13px] text-sienna-brown font-medium">
                  Finexa solution: Streaming sub-second Kafka ingestion.
                </div>
              </div>

              {/* Problem 2 */}
              <div className="bg-fog-white rounded-cards p-8 border border-blush-peach/50 flex flex-col justify-between hover:border-sienna-brown/30 transition-all">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blush-peach flex items-center justify-center mb-5 shadow-sm border border-sienna-brown/15">
                    <Radio className="w-5 h-5 text-sienna-brown" />
                  </div>
                  <h3 className="text-[20px] font-medium text-ink-black mb-3">
                    Static Threshold Alert Fatigue
                  </h3>
                  <p className="text-[15px] text-slate-gray leading-relaxed">
                    Setting naive "$200/hr" rules causes 2 AM false alarms during regular weekday peaks, while completely missing real $200/hr loops on quiet Sundays.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-blush-peach/40 rounded-xl border border-sienna-brown/15 text-[13px] text-sienna-brown font-medium">
                  Finexa solution: 14-day cycle-matched seasonal Z-scores.
                </div>
              </div>

              {/* Problem 3 */}
              <div className="bg-fog-white rounded-cards p-8 border border-blush-peach/50 flex flex-col justify-between hover:border-sienna-brown/30 transition-all">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blush-peach flex items-center justify-center mb-5 shadow-sm border border-sienna-brown/15">
                    <FileText className="w-5 h-5 text-sienna-brown" />
                  </div>
                  <h3 className="text-[20px] font-medium text-ink-black mb-3">
                    Spreadsheet Reconciliation Lag
                  </h3>
                  <p className="text-[15px] text-slate-gray leading-relaxed">
                    Engineering leads spend hours debugging gigantic CSV billing exports instead of triaging the root cause with live infrastructure context.
                  </p>
                </div>
                <div className="mt-6 p-3 bg-blush-peach/40 rounded-xl border border-sienna-brown/15 text-[13px] text-sienna-brown font-medium">
                  Finexa solution: Sub-5ms continuous TimescaleDB rollups.
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. FEATURE DEEP-DIVE / USE CASES (Ordered by Buyer Priority)
        ────────────────────────────────────────────────────────────── */}
        <section id="features" className="section-steep section-fog scroll-mt-28">
          <div className="steep-container">
            
            <div className="max-w-2xl mb-16">
              <span className="inline-block px-3.5 py-1 bg-blush-peach text-sienna-brown border border-sienna-brown/20 rounded-buttons text-[12px] font-semibold uppercase tracking-wider">
                FEATURE MODULES
              </span>
              <h2 className="text-heading mt-3">
                Built for infrastructure engineering.
              </h2>
              <p className="text-body mt-3">
                Explore the four primary operational modules inside the Finexa platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Feature 1: Anomaly Detection Engine (Priority #1) */}
              <div className="bg-paper-white rounded-cards p-8 border border-blush-peach/60 flex flex-col justify-between hover:border-sienna-brown/30 transition-all shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-0.5 bg-blush-peach text-sienna-brown text-[11px] font-semibold uppercase rounded-full border border-sienna-brown/20">
                      Primary Engine
                    </span>
                  </div>
                  <h3 className="text-2xl font-medium text-ink-black mb-3">
                    Seasonal Anomaly Detection &amp; Triage
                  </h3>
                  <p className="text-[15px] text-slate-gray leading-relaxed mb-6">
                    Flags runaway spend across AWS EC2, Aurora RDS, and S3 using 14-day cycle matching. On-call engineers can acknowledge, inspect baseline differentials, and resolve incidents with post-mortem notes.
                  </p>
                </div>
                <button
                  onClick={onLaunchApp}
                  className="link-arrow text-[15px] font-medium text-sienna-brown hover:text-ink-black"
                >
                  Explore anomalies module →
                </button>
              </div>

              {/* Feature 2: Real-time Analytics (Priority #2) */}
              <div className="bg-paper-white rounded-cards p-8 border border-blush-peach/60 flex flex-col justify-between hover:border-sienna-brown/30 transition-all shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-0.5 bg-blush-peach text-sienna-brown text-[11px] font-semibold uppercase rounded-full border border-sienna-brown/20">
                      Storage Engine
                    </span>
                  </div>
                  <h3 className="text-2xl font-medium text-ink-black mb-3">
                    TimescaleDB Continuous Cost Analytics
                  </h3>
                  <p className="text-[15px] text-slate-gray leading-relaxed mb-6">
                    Materialized hourly and daily continuous aggregate views allow querying 30 days of multi-cloud metrics in sub-5ms latency without scanning terabytes of raw logs.
                  </p>
                </div>
                <button
                  onClick={onLaunchApp}
                  className="link-arrow text-[15px] font-medium text-sienna-brown hover:text-ink-black"
                >
                  View continuous rollups →
                </button>
              </div>

              {/* Feature 3: Budgets & Webhooks (Priority #3) */}
              <div className="bg-paper-white rounded-cards p-8 border border-blush-peach/60 flex flex-col justify-between hover:border-sienna-brown/30 transition-all shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-0.5 bg-blush-peach text-sienna-brown text-[11px] font-semibold uppercase rounded-full border border-sienna-brown/20">
                      Reliability
                    </span>
                  </div>
                  <h3 className="text-2xl font-medium text-ink-black mb-3">
                    Budget Caps &amp; Transactional Outbox
                  </h3>
                  <p className="text-[15px] text-slate-gray leading-relaxed mb-6">
                    Configure service-level budget caps with 80%, 90%, and 100% threshold alert triggers. Webhooks dispatch to Slack/PagerDuty with exponential retries and idempotency locks.
                  </p>
                </div>
                <button
                  onClick={onLaunchApp}
                  className="link-arrow text-[15px] font-medium text-sienna-brown hover:text-ink-black"
                >
                  Inspect budget enforcement →
                </button>
              </div>

              {/* Feature 4: Team RBAC (Priority #4) */}
              <div className="bg-paper-white rounded-cards p-8 border border-blush-peach/60 flex flex-col justify-between hover:border-sienna-brown/30 transition-all shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-0.5 bg-blush-peach text-sienna-brown text-[11px] font-semibold uppercase rounded-full border border-sienna-brown/20">
                      Tenancy
                    </span>
                  </div>
                  <h3 className="text-2xl font-medium text-ink-black mb-3">
                    Multi-Tenant Organization &amp; RBAC
                  </h3>
                  <p className="text-[15px] text-slate-gray leading-relaxed mb-6">
                    Strict organization boundaries enforced at the servlet layer via JWT claims. Role-based access control grants explicit permissions across OWNER, ADMIN, and VIEWER tiers.
                  </p>
                </div>
                <button
                  onClick={onLaunchApp}
                  className="link-arrow text-[15px] font-medium text-sienna-brown hover:text-ink-black"
                >
                  View team security →
                </button>
              </div>

            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. TECHNICAL CREDIBILITY & ARCHITECTURE (Interactive Terminal)
        ────────────────────────────────────────────────────────────── */}
        <section id="architecture" className="section-steep bg-blush-peach/15 border-y border-blush-peach/40 scroll-mt-28">
          <div className="steep-container">
            
            <div className="max-w-2xl mb-12">
              <span className="inline-block px-3.5 py-1 bg-blush-peach text-sienna-brown border border-sienna-brown/20 rounded-buttons text-[12px] font-semibold uppercase tracking-wider">
                SYSTEM ARCHITECTURE &amp; RELIABILITY
              </span>
              <h2 className="text-heading mt-3">
                Engineered for reliability in production.
              </h2>
              <p className="text-body mt-3">
                Explore the four internal layers that guarantee zero lost alerts and strict multi-tenant isolation.
              </p>
            </div>

            {/* Interactive Architecture Layer Switcher */}
            <div className="flex gap-2.5 flex-wrap mb-8">
              <button
                onClick={() => setActiveArchTab('tenancy')}
                className={`px-5 py-2.5 rounded-buttons text-[14px] font-medium cursor-pointer transition-all flex items-center gap-2 ${
                  activeArchTab === 'tenancy'
                    ? 'bg-blush-peach text-sienna-brown border border-sienna-brown/40 shadow-sm font-semibold'
                    : 'bg-paper-white text-ink-black border border-blush-peach hover:bg-blush-peach/40'
                }`}
              >
                <Database className="w-4 h-4 text-sienna-brown" /> 1. Scoped Repositories
              </button>

              <button
                onClick={() => setActiveArchTab('security')}
                className={`px-5 py-2.5 rounded-buttons text-[14px] font-medium cursor-pointer transition-all flex items-center gap-2 ${
                  activeArchTab === 'security'
                    ? 'bg-blush-peach text-sienna-brown border border-sienna-brown/40 shadow-sm font-semibold'
                    : 'bg-paper-white text-ink-black border border-blush-peach hover:bg-blush-peach/40'
                }`}
              >
                <Lock className="w-4 h-4 text-sienna-brown" /> 2. JWT &amp; RBAC
              </button>

              <button
                onClick={() => setActiveArchTab('aggregation')}
                className={`px-5 py-2.5 rounded-buttons text-[14px] font-medium cursor-pointer transition-all flex items-center gap-2 ${
                  activeArchTab === 'aggregation'
                    ? 'bg-blush-peach text-sienna-brown border border-sienna-brown/40 shadow-sm font-semibold'
                    : 'bg-paper-white text-ink-black border border-blush-peach hover:bg-blush-peach/40'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-sienna-brown" /> 3. Continuous Aggregation
              </button>

              <button
                onClick={() => setActiveArchTab('audit')}
                className={`px-5 py-2.5 rounded-buttons text-[14px] font-medium cursor-pointer transition-all flex items-center gap-2 ${
                  activeArchTab === 'audit'
                    ? 'bg-blush-peach text-sienna-brown border border-sienna-brown/40 shadow-sm font-semibold'
                    : 'bg-paper-white text-ink-black border border-blush-peach hover:bg-blush-peach/40'
                }`}
              >
                <Zap className="w-4 h-4 text-sienna-brown" /> 4. Transactional Outbox
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
                className="bg-paper-white rounded-cards border border-blush-peach/70 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 shadow-sm"
              >
                {/* Left: Description & Guarantees */}
                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-[12px] uppercase tracking-wider font-semibold text-sienna-brown">
                      {archLayers[activeArchTab].tag}
                    </span>
                    <h3 className="font-signifier text-2xl sm:text-3xl text-ink-black font-normal mt-2 mb-4">
                      {archLayers[activeArchTab].title}
                    </h3>
                    <p className="text-[15px] text-slate-gray leading-relaxed mb-6">
                      {archLayers[activeArchTab].desc}
                    </p>

                    <div className="text-[13px] font-semibold text-sienna-brown uppercase tracking-wider mb-3">
                      Implementation Details:
                    </div>
                    <ul className="space-y-2.5 text-[14px] text-ink-black">
                      {archLayers[activeArchTab].guarantees.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-sienna-brown font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-6 border-t border-blush-peach/60">
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="link-arrow text-[14px] font-medium text-sienna-brown hover:text-ink-black"
                    >
                      View implementation on GitHub →
                    </a>
                  </div>
                </div>

                {/* Right: Code Simulator Terminal */}
                <div className="bg-ink-black rounded-2xl p-5 text-[#f8fafc] font-mono text-[13px] leading-relaxed overflow-x-auto border border-white/10 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 text-[11px] text-ash-gray">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                    </div>
                    <span className="text-blush-peach">finexa-architecture-layer.java</span>
                  </div>
                  <pre className="m-0 text-mist-gray overflow-x-auto">
                    <code>{archLayers[activeArchTab].codeSnippet}</code>
                  </pre>
                </div>
              </motion.div>
            </AnimatePresence>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            7. DEMO CONSOLE CTA (Dedicated Mid-Page Banner in Full Peach - 16:9 Widescreen)
        ────────────────────────────────────────────────────────────── */}
        <section id="demo-section" className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 scroll-mt-28">
          <div className="bg-blush-peach rounded-cards p-8 sm:p-12 border border-sienna-brown/25 shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-paper-white/90 rounded-buttons text-[12px] text-sienna-brown font-semibold mb-3 border border-sienna-brown/20 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interactive Failure Simulator</span>
              </div>
              <h3 className="font-signifier text-3xl sm:text-4xl text-sienna-brown font-normal leading-tight mb-3">
                Test runaway compute spikes with live demo data.
              </h3>
              <p className="text-[16px] text-sienna-brown/95 leading-relaxed">
                Open the built-in Demo Console to inject artificial $450/hr compute spikes, simulate outbox webhook retry failures, and switch between Owner, Admin, and Viewer personas.
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={onLaunchApp}
                className="bg-ink-black text-paper-white rounded-buttons px-8 h-[48px] text-[16px] font-medium hover:bg-ink-black/90 active:scale-98 transition-all cursor-pointer shadow-md"
              >
                Open Demo Console &amp; Simulate Spikes →
              </button>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            8. FAQ SECTION (Accordion with Peach Highlights)
        ────────────────────────────────────────────────────────────── */}
        <section id="faq" className="section-steep section-paper scroll-mt-28">
          <div className="steep-container max-w-[860px]">
            
            <div className="text-center mb-14">
              <span className="inline-block px-3.5 py-1 bg-blush-peach text-sienna-brown border border-sienna-brown/20 rounded-buttons text-[12px] font-semibold uppercase tracking-wider">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="text-heading mt-3">
                Frequently asked questions.
              </h2>
              <p className="text-body mt-3">
                Details on multi-tenancy, reliability engineering, and local deployment.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className={`border rounded-2xl p-5 transition-all ${
                      isOpen
                        ? 'border-sienna-brown/30 bg-blush-peach/25 shadow-sm'
                        : 'border-blush-peach/60 bg-fog-white hover:border-blush-peach'
                    }`}
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between text-left font-medium text-[17px] text-ink-black cursor-pointer bg-transparent border-none p-0"
                    >
                      <span className={isOpen ? 'text-sienna-brown font-semibold' : 'text-ink-black'}>{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-sienna-brown' : 'text-slate-gray'
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pt-3 text-[15px] text-slate-gray leading-relaxed border-t border-sienna-brown/15 mt-3"
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            9. FINAL CTA SECTION
        ────────────────────────────────────────────────────────────── */}
        <section className="bg-ink-black text-paper-white py-20">
          <div className="steep-container text-center space-y-6 max-w-2xl mx-auto">
            
            <h2 className="font-signifier text-4xl sm:text-5xl font-normal text-paper-white tracking-tight">
              Ready to explore your cloud spend ledger?
            </h2>
            
            <p className="text-slate-gray text-body">
              Experience the complete Finexa workspace with pre-seeded demo accounts and failure simulation tools.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={onLaunchApp}
                className="bg-blush-peach text-sienna-brown rounded-buttons px-8 h-[46px] text-[16px] font-semibold hover:bg-blush-peach/90 active:scale-98 transition-all cursor-pointer shadow-md"
              >
                Launch Demo Workspace →
              </button>
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-transparent text-paper-white border border-white/30 rounded-buttons px-7 h-[46px] text-[16px] font-normal hover:bg-white/10 transition-all inline-flex items-center gap-2"
              >
                <GithubIcon className="w-4 h-4" />
                <span>View on GitHub</span>
              </a>
            </div>

          </div>
        </section>

      </main>

      {/* ─────────────────────────────────────────────────────────────
          10. FOOTER (Credibility & Repository Links)
      ────────────────────────────────────────────────────────────── */}
      <footer className="steep-footer border-t border-blush-peach/60">
        <div className="steep-container">
          
          <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Logo size={32} subtitle="Cloud Cost Optimizer & Anomaly Detector" />
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[14px] text-ink-black hover:text-sienna-brown transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              <span>jwtini69/Finexa</span>
            </a>
          </div>

          <div className="steep-footer-grid">
            <div className="steep-footer-col">
              <strong>Product Modules</strong>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-sienna-brown text-sm bg-transparent border-none p-0 cursor-pointer transition-colors">Live Dashboard</button>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-sienna-brown text-sm bg-transparent border-none p-0 cursor-pointer transition-colors">Anomalies Triage</button>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-sienna-brown text-sm bg-transparent border-none p-0 cursor-pointer transition-colors">Budget Caps</button>
              <button onClick={onLaunchApp} className="text-left text-slate-gray hover:text-sienna-brown text-sm bg-transparent border-none p-0 cursor-pointer transition-colors">Team &amp; RBAC</button>
            </div>

            <div className="steep-footer-col">
              <strong>Architecture</strong>
              <a href="#how-it-works" className="hover:text-sienna-brown transition-colors">Kafka Partitioning</a>
              <a href="#architecture" className="hover:text-sienna-brown transition-colors">TimescaleDB Rollups</a>
              <a href="#architecture" className="hover:text-sienna-brown transition-colors">Seasonal Z-Scores</a>
              <a href="#architecture" className="hover:text-sienna-brown transition-colors">Transactional Outbox</a>
            </div>

            <div className="steep-footer-col">
              <strong>Observability &amp; API</strong>
              <a href="/swagger-ui.html" target="_blank" rel="noreferrer" className="hover:text-sienna-brown transition-colors">OpenAPI 3.1 Docs</a>
              <a href="/actuator/health" target="_blank" rel="noreferrer" className="hover:text-sienna-brown transition-colors">Actuator Health</a>
              <a href="/actuator/metrics" target="_blank" rel="noreferrer" className="hover:text-sienna-brown transition-colors">Metrics Endpoint</a>
              <button onClick={onOpenAuth} className="text-left text-slate-gray hover:text-sienna-brown text-sm bg-transparent border-none p-0 cursor-pointer transition-colors">Demo Login</button>
            </div>

            <div className="steep-footer-col">
              <strong>Repository</strong>
              <a href={githubUrl} target="_blank" rel="noreferrer" className="hover:text-sienna-brown transition-colors">GitHub Repository</a>
              <a href={`${githubUrl}#readme`} target="_blank" rel="noreferrer" className="hover:text-sienna-brown transition-colors">Architecture Spec</a>
              <a href={`${githubUrl}/issues`} target="_blank" rel="noreferrer" className="hover:text-sienna-brown transition-colors">Issue Tracker</a>
              <a href={githubUrl} target="_blank" rel="noreferrer" className="hover:text-sienna-brown transition-colors">Apache 2.0 License</a>
            </div>
          </div>

          <div className="steep-footer-bottom flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-slate-gray pt-8 border-t border-blush-peach/60">
            <span>© {new Date().getFullYear()} Finexa — Distributed Systems &amp; FinOps Portfolio Project by <a href="https://github.com/jwtini69" target="_blank" rel="noreferrer" className="text-sienna-brown underline font-medium hover:text-ink-black">jwtini69</a>.</span>
            <div className="flex gap-6">
              <a href="/swagger-ui.html" target="_blank" rel="noreferrer" className="hover:text-sienna-brown">Swagger UI</a>
              <a href={githubUrl} target="_blank" rel="noreferrer" className="hover:text-sienna-brown">GitHub</a>
              <button onClick={onLaunchApp} className="hover:text-sienna-brown bg-transparent border-none p-0 cursor-pointer text-slate-gray">Workspace</button>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
