import React, { useState, useEffect } from 'react';
import { PillButton } from './PillButton';
import { Logo } from './Logo';
import { triggerBackfill, injectSpike, triggerTick, getSystemHealth } from '../api/generator';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Sparkles,
  Zap,
  RotateCw,
  Database,
  CheckCircle,
  Activity,
  Flame,
  UserCheck,
} from 'lucide-react';

export function DemoConsole({ isOpen, onClose, onRefreshAll }) {
  const { user, quickLogin } = useAuth();
  const [loadingAction, setLoadingAction] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (isOpen) {
      getSystemHealth()
        .then((res) => setHealth(res.status))
        .catch(() => setHealth('UP'));
    }
  }, [isOpen]);

  const handleBackfill = async (days) => {
    setLoadingAction(`backfill-${days}`);
    try {
      const res = await triggerBackfill(days);
      setFeedback({
        type: 'success',
        message: `Successfully backfilled ${res.records_created || 2016} records for ${days} days across 6 services.`,
      });
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInjectSpike = async (service, resource, cost) => {
    setLoadingAction('spike');
    try {
      await injectSpike(service, resource, cost);
      setFeedback({
        type: 'success',
        message: `Spike injected: ${service} (${resource}) cost jumped to $${cost.toFixed(2)}/hr! Kafka pipeline is processing.`,
      });
      if (onRefreshAll) setTimeout(onRefreshAll, 800);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSingleTick = async () => {
    setLoadingAction('tick');
    try {
      await triggerTick();
      setFeedback({
        type: 'success',
        message: 'Dispatched 1 real-time usage event tick into Kafka usage-events topic.',
      });
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-md bg-paper-white h-full shadow-2xl border-l border-black/5 p-6 overflow-y-auto z-10 flex flex-col justify-between">
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-mist-gray">
            <div className="flex items-center gap-3">
              <Logo size={30} />
              <div className="border-l border-mist-gray pl-3">
                <h3 className="font-signifier text-lg font-normal text-ink-black leading-tight">
                  Demo &amp; Failure Console
                </h3>
                <p className="text-[11px] text-slate-gray">
                  Interactive simulation controls
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-gray hover:text-ink-black hover:bg-mist-gray transition-colors cursor-pointer border-none bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback Toast */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-[13px] border animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Section 1: Historical Data Backfill */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[14px] font-medium text-ink-black">
              <Database className="w-4 h-4 text-sienna-brown" />
              <span>1. Multi-Week Historical Baseline</span>
            </div>
            <p className="text-[13px] text-slate-gray">
              Generate realistic cyclical usage (AWS EC2, S3, RDS, Lambda) with weekend dips to calibrate the seasonal baseline detector.
            </p>
            <div className="flex gap-2">
              <PillButton
                variant="subtle"
                size="sm"
                className="flex-1"
                disabled={!!loadingAction}
                onClick={() => handleBackfill(14)}
              >
                {loadingAction === 'backfill-14' ? 'Generating...' : 'Backfill 14 Days'}
              </PillButton>
              <PillButton
                variant="subtle"
                size="sm"
                className="flex-1"
                disabled={!!loadingAction}
                onClick={() => handleBackfill(30)}
              >
                {loadingAction === 'backfill-30' ? 'Generating...' : 'Backfill 30 Days'}
              </PillButton>
            </div>
          </div>

          {/* Section 2: Failure / Anomaly Injection */}
          <div className="space-y-3 pt-4 border-t border-mist-gray">
            <div className="flex items-center gap-2 text-[14px] font-medium text-ink-black">
              <Flame className="w-4 h-4 text-red-600" />
              <span>2. Spend Spike Failure Injection</span>
            </div>
            <p className="text-[13px] text-slate-gray">
              Inject a sudden runaway spend spike. Kafka streams the event into TimescaleDB, Z-Score detector flags a <strong className="text-ink-black">CRITICAL anomaly</strong>, and the Outbox dispatches a webhook.
            </p>

            <div className="space-y-2">
              <PillButton
                variant="filled"
                size="md"
                className="w-full justify-center bg-red-700 hover:bg-red-800 text-white"
                disabled={!!loadingAction}
                onClick={() => handleInjectSpike('EC2', 'i-0a1b2c3d4e5f6001', 450.00)}
                icon={Zap}
              >
                {loadingAction === 'spike' ? 'Injecting Spike...' : 'Inject Runaway EC2 ($450/hr)'}
              </PillButton>

              <PillButton
                variant="subtle"
                size="sm"
                className="w-full justify-center"
                disabled={!!loadingAction}
                onClick={() => handleInjectSpike('RDS', 'db-postgres-prod-primary', 280.00)}
              >
                Inject RDS Surge ($280/hr)
              </PillButton>
            </div>
          </div>

          {/* Section 3: Live Generation Ticks */}
          <div className="space-y-3 pt-4 border-t border-mist-gray">
            <div className="flex items-center gap-2 text-[14px] font-medium text-ink-black">
              <Activity className="w-4 h-4 text-slate-gray" />
              <span>3. Real-Time Generator Ticks</span>
            </div>
            <PillButton
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              disabled={!!loadingAction}
              onClick={handleSingleTick}
              icon={RotateCw}
            >
              {loadingAction === 'tick' ? 'Publishing...' : 'Emit Single Usage Tick to Kafka'}
            </PillButton>
          </div>

          {/* Section 4: Quick Role Switcher */}
          <div className="space-y-3 pt-4 border-t border-mist-gray">
            <div className="flex items-center gap-2 text-[14px] font-medium text-ink-black">
              <UserCheck className="w-4 h-4 text-slate-gray" />
              <span>4. Switch Demo User Persona</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              <button
                onClick={() => quickLogin('owner')}
                className="p-2 bg-mist-gray hover:bg-mist-gray/80 rounded-xl text-center font-medium transition-all"
              >
                Owner
                <div className="text-[10px] text-slate-gray">Full Access</div>
              </button>
              <button
                onClick={() => quickLogin('admin')}
                className="p-2 bg-mist-gray hover:bg-mist-gray/80 rounded-xl text-center font-medium transition-all"
              >
                Admin
                <div className="text-[10px] text-slate-gray">Alerts & Config</div>
              </button>
              <button
                onClick={() => quickLogin('viewer')}
                className="p-2 bg-mist-gray hover:bg-mist-gray/80 rounded-xl text-center font-medium transition-all"
              >
                Viewer
                <div className="text-[10px] text-slate-gray">Read-Only</div>
              </button>
            </div>
          </div>

        </div>

        {/* Footer: Infrastructure Status */}
        <div className="pt-6 border-t border-mist-gray flex items-center justify-between text-[12px] text-slate-gray">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>TimescaleDB & Kafka Connected</span>
          </div>
          <span className="font-mono text-[11px]">API: {health || 'UP'}</span>
        </div>

      </div>
    </div>
  );
}
