import React from 'react';
import { ArtifactCard } from './Card';
import { PillButton } from './PillButton';
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock } from 'lucide-react';

export function AnomalyCard({
  anomaly,
  onAcknowledge,
  onResolve,
  canManage = true,
}) {
  const isCritical = anomaly.severity === 'CRITICAL';
  const isHigh = anomaly.severity === 'HIGH';

  const severityStyles = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-200',
    HIGH: 'bg-blush-peach text-sienna-brown border-sienna-brown/20',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-mist-gray text-slate-gray border-transparent',
  };

  const statusStyles = {
    OPEN: 'bg-red-500/10 text-red-700',
    ACKNOWLEDGED: 'bg-amber-500/10 text-amber-700',
    RESOLVED: 'bg-emerald-500/10 text-emerald-700',
  };

  const dateStr = new Date(anomaly.detected_at || anomaly.timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ArtifactCard className={`transition-all duration-200 ${isCritical ? 'border-sienna-brown/20' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Metadata & Severity */}
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCritical ? 'bg-blush-peach text-sienna-brown' : 'bg-mist-gray text-slate-gray'}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-sohne font-medium text-base text-ink-black">
                {anomaly.service_name} • {anomaly.resource_id}
              </span>
              <span className={`text-[11px] font-medium uppercase px-2 py-0.5 rounded-full border ${severityStyles[anomaly.severity] || severityStyles.MEDIUM}`}>
                {anomaly.severity}
              </span>
              <span className={`text-[11px] font-medium uppercase px-2 py-0.5 rounded-full ${statusStyles[anomaly.status] || statusStyles.OPEN}`}>
                {anomaly.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-slate-gray">
              <Clock className="w-3.5 h-3.5" />
              <span>Detected {dateStr}</span>
              <span>•</span>
              <span>Z-Score: <strong className="text-ink-black">{Number(anomaly.z_score).toFixed(2)}σ</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Cost Comparison Metrics */}
        <div className="flex items-center gap-6 bg-fog-white px-4 py-2.5 rounded-xl border border-black/[0.03]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-gray font-normal">
              Expected Baseline
            </div>
            <div className="text-[15px] font-medium text-slate-gray">
              ${Number(anomaly.expected_cost).toFixed(2)}/hr
            </div>
          </div>

          <div className="text-slate-gray text-lg font-light">→</div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-sienna-brown font-medium">
              Actual Spike
            </div>
            <div className="text-[17px] font-medium text-ink-black">
              ${Number(anomaly.actual_cost).toFixed(2)}/hr
              <span className="text-[12px] text-red-600 font-medium ml-1.5">
                (+{Number(anomaly.deviation_percentage).toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        {canManage && (
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {anomaly.status === 'OPEN' && (
              <PillButton
                variant="subtle"
                size="sm"
                onClick={() => onAcknowledge(anomaly.id)}
              >
                Acknowledge
              </PillButton>
            )}

            {anomaly.status !== 'RESOLVED' && (
              <PillButton
                variant="ghost"
                size="sm"
                onClick={() => onResolve(anomaly.id)}
                icon={CheckCircle2}
              >
                Resolve
              </PillButton>
            )}
          </div>
        )}

      </div>
    </ArtifactCard>
  );
}
