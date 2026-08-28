import React, { useState, useEffect } from 'react';
import { getCostSummary, getCostTimeseries, getCostBreakdown } from '../api/costs';
import { getAnomalies } from '../api/anomalies';
import { getBudgets } from '../api/budgets';
import { StatCard } from '../components/StatCard';
import { CostChart } from '../components/CostChart';
import { AccentCard, ArtifactCard, NeutralCard } from '../components/Card';
import { PillButton } from '../components/PillButton';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';

export function DashboardPage({ onNavigateToAnomalies, onOpenDemoConsole }) {
  const [range, setRange] = useState('7d');
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [serviceBreakdown, setServiceBreakdown] = useState([]);
  const [resourceBreakdown, setResourceBreakdown] = useState([]);
  const [openAnomaliesCount, setOpenAnomaliesCount] = useState(0);
  const [activeBudgetsCount, setActiveBudgetsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumData, timeData, srvData, resData, anomData, budData] = await Promise.all([
        getCostSummary(range).catch(() => null),
        getCostTimeseries(range, 'hour').catch(() => []),
        getCostBreakdown(range, 'service').catch(() => []),
        getCostBreakdown(range, 'resource').catch(() => []),
        getAnomalies('OPEN').catch(() => []),
        getBudgets().catch(() => []),
      ]);

      setSummary(sumData);
      setTimeseries(Array.isArray(timeData) ? timeData : []);
      setServiceBreakdown(Array.isArray(srvData) ? srvData : []);
      setResourceBreakdown(Array.isArray(resData) ? resData : []);
      setOpenAnomaliesCount(Array.isArray(anomData) ? anomData.length : 0);
      setActiveBudgetsCount(Array.isArray(budData) ? budData.length : 0);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  const currentSpend = Number(summary?.current_spend || 0);
  const previousSpend = Number(summary?.previous_spend || 0);
  const deltaPct = previousSpend > 0
    ? ((currentSpend - previousSpend) / previousSpend) * 100
    : 0;

  return (
    <div className="space-y-12 pb-16">
      
      {/* 1. Steep Editorial Hero Section */}
      <section className="pt-4 pb-2">
        <div className="max-w-[800px]">
          <span className="text-slate-gray text-[14px] uppercase tracking-widest font-medium mb-3 block">
            Cloud Cost Intelligence
          </span>
          <h1 className="font-signifier text-4xl sm:text-5xl md:text-6xl font-normal text-ink-black tracking-tight leading-[1.15]">
            Cloud spend, observed with <span className="italic">precision</span>.
          </h1>
          <p className="text-body text-slate-gray mt-4 max-w-[620px]">
            Real-time streaming cost ingestion via Apache Kafka, continuous rollups in TimescaleDB, and two-stage seasonal baseline anomaly detection.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <PillButton variant="filled" size="md" onClick={onOpenDemoConsole}>
              Open Demo Console →
            </PillButton>
            <PillButton variant="ghost" size="md" onClick={onNavigateToAnomalies}>
              View Anomalies ({openAnomaliesCount})
            </PillButton>
          </div>
        </div>
      </section>

      {/* 2. Executive Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Period Cloud Spend"
          value={`$${currentSpend.toFixed(2)}`}
          delta={deltaPct !== 0 ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%` : undefined}
          deltaType={deltaPct > 20 ? 'alert' : deltaPct < 0 ? 'positive' : 'neutral'}
          subtitle={`vs previous ${range}`}
          icon={DollarSign}
        />

        <StatCard
          title="Top Cost Driver"
          value={summary?.top_cost_driver?.service || 'EC2 Compute'}
          subtitle={summary?.top_cost_driver ? `$${Number(summary.top_cost_driver.cost).toFixed(2)} total` : '6 active services'}
          icon={Server}
        />

        <StatCard
          title="Active Anomalies"
          value={openAnomaliesCount}
          delta={openAnomaliesCount > 0 ? 'Action required' : 'Nominal'}
          deltaType={openAnomaliesCount > 0 ? 'alert' : 'positive'}
          subtitle={openAnomaliesCount > 0 ? 'Unacknowledged spikes' : 'All services normal'}
          icon={AlertTriangle}
        />

        <StatCard
          title="Active Budgets"
          value={activeBudgetsCount}
          subtitle="Monitored with outbox webhooks"
          icon={ShieldCheck}
        />
      </section>

      {/* 3. Time-Series Cost Chart */}
      <section>
        <CostChart
          data={timeseries}
          range={range}
          onRangeChange={setRange}
          loading={loading}
        />
      </section>

      {/* 4. Cost Breakdown Tables & Accent Editorial Card */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Service Breakdown (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <ArtifactCard className="p-0 overflow-hidden">
            <div className="p-6 pb-4 border-b border-mist-gray flex items-center justify-between">
              <div>
                <h3 className="font-signifier text-2xl font-normal text-ink-black">
                  Cost Breakdown by Service
                </h3>
                <p className="text-[13px] text-slate-gray mt-0.5">
                  Aggregated infrastructure spend over selected {range}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-fog-white text-[12px] uppercase tracking-wider text-slate-gray border-b border-mist-gray">
                  <tr>
                    <th className="py-3 px-6 font-medium">Service</th>
                    <th className="py-3 px-6 font-medium">Total Spend</th>
                    <th className="py-3 px-6 font-medium">% Share</th>
                    <th className="py-3 px-6 font-medium">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-gray">
                  {serviceBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-gray">
                        No service data available. Backfill historical records in Demo Console.
                      </td>
                    </tr>
                  ) : (
                    serviceBreakdown.map((s, idx) => {
                      const cost = Number(s.total_cost || s.cost || 0);
                      const pct = currentSpend > 0 ? Math.round((cost / currentSpend) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-fog-white/60 transition-colors">
                          <td className="py-3.5 px-6 font-medium text-ink-black flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sienna-brown" />
                            {s.service_name || s.service}
                          </td>
                          <td className="py-3.5 px-6 font-medium text-ink-black">
                            ${cost.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-6 text-slate-gray">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-mist-gray rounded-full overflow-hidden">
                                <div className="h-full bg-ink-black rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[12px]">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-slate-gray font-mono text-[12px]">
                            {s.event_count || s.count || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </ArtifactCard>
        </div>

        {/* Right: Steep Editorial Accent Card (1 Col) */}
        <div className="flex flex-col gap-6">
          <AccentCard className="flex flex-col justify-between h-full">
            <div>
              <span className="text-[12px] uppercase tracking-widest text-sienna-brown font-semibold mb-2 block">
                Architecture Spotlight
              </span>
              <h4 className="font-sohne text-2xl font-medium text-sienna-brown tracking-tight leading-snug mb-4">
                Seasonal Z-Score & Transactional Outbox
              </h4>
              <p className="text-[15px] leading-relaxed text-sienna-brown/90 mb-4">
                Finexa compares current usage against historical cycle-matched baselines (matching exact hours of weekdays vs weekends) to eliminate false alarms, while using PostgreSQL transactional outbox tables to guarantee exactly-once-effective webhook dispatches.
              </p>
            </div>

            <div className="pt-4 border-t border-sienna-brown/20 flex items-center justify-between">
              <span className="text-[13px] text-sienna-brown font-medium">
                High-Reliability FinOps
              </span>
              <button
                onClick={onOpenDemoConsole}
                className="text-[14px] text-sienna-brown font-medium flex items-center gap-1 hover:underline cursor-pointer"
              >
                Test Spike →
              </button>
            </div>
          </AccentCard>
        </div>

      </section>

    </div>
  );
}
