import React from 'react';
import { ArtifactCard } from './Card';
import { CheckCircle2, AlertOctagon, RotateCw, ExternalLink } from 'lucide-react';

export function WebhookAuditTable({ deliveries = [], loading = false }) {
  return (
    <ArtifactCard className="overflow-hidden p-0">
      <div className="p-6 pb-4 border-b border-mist-gray flex items-center justify-between">
        <div>
          <h4 className="font-signifier text-xl font-normal text-ink-black tracking-tight">
            Transactional Webhook Deliveries
          </h4>
          <p className="text-[13px] text-slate-gray mt-0.5">
            Idempotent outbox dispatcher audit trail with Resilience4j retry logs
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-fog-white text-[12px] uppercase tracking-wider text-slate-gray border-b border-mist-gray">
            <tr>
              <th className="py-3 px-6 font-medium">Status</th>
              <th className="py-3 px-6 font-medium">Event Type</th>
              <th className="py-3 px-6 font-medium">HTTP Code</th>
              <th className="py-3 px-6 font-medium">Attempts</th>
              <th className="py-3 px-6 font-medium">Endpoint URL</th>
              <th className="py-3 px-6 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-gray text-ink-black">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-gray">
                  Loading delivery logs...
                </td>
              </tr>
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-gray">
                  No webhook delivery attempts recorded yet.
                </td>
              </tr>
            ) : (
              deliveries.map((d) => {
                const isSuccess = d.status === 'SUCCESS';
                const isDeadLetter = d.status === 'DEAD_LETTER' || d.status === 'FAILED';

                return (
                  <tr key={d.id} className="hover:bg-fog-white/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-0.5 rounded-full ${
                          isSuccess
                            ? 'bg-emerald-50 text-emerald-700'
                            : isDeadLetter
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertOctagon className="w-3.5 h-3.5" />
                        )}
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[13px] text-ink-black">
                      {d.event_type || 'BUDGET_THRESHOLD_CROSSED'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`font-mono text-[13px] font-medium ${
                          d.http_status_code >= 200 && d.http_status_code < 300
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        {d.http_status_code || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-gray">
                      {d.attempt_count} {d.attempt_count > 1 ? 'retries' : 'try'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-gray font-mono text-[12px] truncate max-w-[200px]" title={d.endpoint_url}>
                      {d.endpoint_url || 'https://hooks.slack.com/...'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-gray text-[13px]">
                      {new Date(d.delivered_at || d.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </ArtifactCard>
  );
}
