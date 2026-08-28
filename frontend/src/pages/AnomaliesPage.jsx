import React, { useState, useEffect } from 'react';
import { getAnomalies, acknowledgeAnomaly, resolveAnomaly } from '../api/anomalies';
import { AnomalyCard } from '../components/AnomalyCard';
import { PillButton } from '../components/PillButton';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

export function AnomaliesPage({ onOpenDemoConsole }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('ALL');
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const data = await getAnomalies(filter);
      setAnomalies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching anomalies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [filter]);

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAnomaly(id);
      fetchAnomalies();
    } catch (err) {
      alert(`Could not acknowledge: ${err.message}`);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveAnomaly(id);
      fetchAnomalies();
    } catch (err) {
      alert(`Could not resolve: ${err.message}`);
    }
  };

  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <span className="text-slate-gray text-[13px] uppercase tracking-widest font-medium mb-1 block">
            Automated Alert Center
          </span>
          <h1 className="font-signifier text-4xl font-normal text-ink-black tracking-tight">
            Detected Cost Anomalies
          </h1>
          <p className="text-body text-slate-gray mt-1">
            Two-stage statistical Z-Score evaluation over cyclical multi-week seasonal baselines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PillButton
            variant="peach"
            size="md"
            onClick={onOpenDemoConsole}
            icon={Sparkles}
          >
            Inject Spike Demo
          </PillButton>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-mist-gray pb-4">
        <span className="text-[13px] text-slate-gray font-medium mr-2 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-1.5 text-[14px] font-medium rounded-buttons transition-all ${
              filter === status
                ? 'bg-ink-black text-paper-white'
                : 'bg-mist-gray text-slate-gray hover:text-ink-black'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-gray text-[15px]">
            Loading anomalies...
          </div>
        ) : anomalies.length === 0 ? (
          <div className="py-16 px-6 text-center bg-fog-white rounded-cards border border-dashed border-mist-gray max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-signifier text-2xl font-normal text-ink-black mb-1">
              No anomalies found
            </h3>
            <p className="text-[14px] text-slate-gray mb-6">
              All services are currently tracking their seasonal baselines. Use the Demo Console to inject an artificial spend spike to see real-time detection in action.
            </p>
            <PillButton
              variant="filled"
              size="md"
              onClick={onOpenDemoConsole}
              icon={Sparkles}
            >
              Simulate Spend Spike ($450/hr)
            </PillButton>
          </div>
        ) : (
          anomalies.map((a) => (
            <AnomalyCard
              key={a.id}
              anomaly={a}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              canManage={canManage}
            />
          ))
        )}
      </div>

    </div>
  );
}
