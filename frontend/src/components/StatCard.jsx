import React from 'react';
import { ArtifactCard } from './Card';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';

export function StatCard({
  title,
  value,
  delta,
  deltaType = 'neutral', // 'positive' | 'negative' | 'alert' | 'neutral'
  subtitle,
  icon: Icon,
  className = '',
}) {
  const deltaColors = {
    positive: 'text-emerald-700 bg-emerald-50',
    negative: 'text-slate-gray bg-mist-gray',
    alert: 'text-sienna-brown bg-blush-peach',
    neutral: 'text-slate-gray bg-mist-gray',
  };

  return (
    <ArtifactCard className={`relative overflow-hidden flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[14px] text-slate-gray font-normal">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-full bg-mist-gray flex items-center justify-center text-slate-gray">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[32px] font-sohne font-medium text-ink-black tracking-tight leading-none">
          {value}
        </div>

        {(delta || subtitle) && (
          <div className="flex items-center gap-2 pt-1">
            {delta && (
              <span className={`inline-flex items-center text-[12px] font-medium px-2 py-0.5 rounded-full ${deltaColors[deltaType]}`}>
                {delta}
              </span>
            )}
            {subtitle && (
              <span className="text-[13px] text-slate-gray">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </ArtifactCard>
  );
}
