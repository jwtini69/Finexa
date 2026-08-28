import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArtifactCard } from './Card';

export function CostChart({ data = [], range = '7d', onRangeChange, loading = false }) {
  const formattedData = data.map((item) => {
    const dateObj = new Date(item.bucket_start || item.timestamp);
    return {
      ...item,
      timeLabel: range === '24h'
        ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', hour: range === '7d' ? '2-digit' : undefined }),
      cost: Number(item.total_cost || item.cost || 0),
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ink-black text-paper-white p-3 rounded-xl shadow-xl text-[13px] border border-white/10">
          <p className="text-slate-gray text-[11px] mb-1">{label}</p>
          <p className="font-medium text-base text-paper-white">
            ${Number(payload[0].value).toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ArtifactCard className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-signifier text-2xl font-normal text-ink-black tracking-tight">
            Hourly Cloud Spend
          </h3>
          <p className="text-[14px] text-slate-gray mt-0.5">
            Real-time multi-cloud continuous aggregates from TimescaleDB
          </p>
        </div>

        {/* Range Selector Pills */}
        <div className="flex items-center gap-1 bg-mist-gray p-1 rounded-buttons self-start sm:self-auto">
          {['24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-3 py-1 text-[13px] font-medium rounded-buttons transition-all ${
                range === r
                  ? 'bg-paper-white text-ink-black shadow-sm'
                  : 'text-slate-gray hover:text-ink-black'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[280px]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-gray text-[14px]">
            Loading time-series data...
          </div>
        ) : formattedData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-fog-white rounded-2xl border border-dashed border-mist-gray">
            <p className="text-ink-black font-medium text-[15px] mb-1">No usage records found</p>
            <p className="text-slate-gray text-[13px] max-w-sm">
              Use the <span className="text-sienna-brown font-medium">Demo Console</span> in the top right to backfill 14 days of realistic cloud history.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbe1d1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#fbe1d1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f2f3" />
              <XAxis
                dataKey="timeLabel"
                stroke="#979799"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#979799"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#5d2a1a"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#costGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </ArtifactCard>
  );
}
