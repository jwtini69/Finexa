import React from 'react';
import { ArtifactCard } from './Card';
import { PillButton } from './PillButton';
import { Trash2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export function BudgetCard({ budget, onDelete, canManage = true }) {
  const cap = Number(budget.cap_amount || 0);
  const current = Number(budget.current_spend || 0);
  const percentage = cap > 0 ? Math.min(100, Math.round((current / cap) * 100)) : 0;
  const isExceeded = current >= cap;
  const isWarning = percentage >= 80 && !isExceeded;

  const thresholds = budget.threshold_percentages
    ? budget.threshold_percentages.split(',').map((t) => t.trim())
    : ['80', '100'];

  return (
    <ArtifactCard className="flex flex-col justify-between gap-5">
      {/* Top: Header & Scope */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-sohne font-medium text-lg text-ink-black">
              {budget.name}
            </h4>
            <span
              className={`text-[11px] font-medium uppercase px-2 py-0.5 rounded-full ${
                isExceeded
                  ? 'bg-red-100 text-red-800'
                  : isWarning
                  ? 'bg-blush-peach text-sienna-brown'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {isExceeded ? 'EXCEEDED' : isWarning ? 'WARNING' : 'ACTIVE'}
            </span>
          </div>

          <div className="text-[13px] text-slate-gray">
            Scope: <span className="text-ink-black font-medium">{budget.scope_type}</span>{' '}
            {budget.scope_value && `(${budget.scope_value})`} • Period:{' '}
            <span className="text-ink-black font-medium">{budget.period}</span>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => onDelete(budget.id)}
            title="Delete budget"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-gray hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Center: Progress Bar & Spend Metrics */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-[24px] font-sohne font-medium text-ink-black">
            ${current.toFixed(2)}{' '}
            <span className="text-[14px] text-slate-gray font-normal">
              / ${cap.toFixed(2)}
            </span>
          </div>
          <span className="text-[14px] font-medium text-ink-black">
            {percentage}%
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="relative w-full h-3 bg-mist-gray rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isExceeded
                ? 'bg-red-600'
                : isWarning
                ? 'bg-sienna-brown'
                : 'bg-ink-black'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Threshold Markers */}
        <div className="flex items-center justify-between text-[11px] text-slate-gray pt-0.5">
          <span>$0</span>
          <span>Alerts configured at: {thresholds.join('%, ')}%</span>
          <span>${cap.toFixed(0)}</span>
        </div>
      </div>
    </ArtifactCard>
  );
}
