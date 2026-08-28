import React, { useState, useEffect } from 'react';
import { getBudgets, createBudget, deleteBudget } from '../api/budgets';
import { getWebhooks, createWebhook, deleteWebhook, getWebhookDeliveries } from '../api/webhooks';
import { BudgetCard } from '../components/BudgetCard';
import { WebhookAuditTable } from '../components/WebhookAuditTable';
import { ArtifactCard } from '../components/Card';
import { PillButton } from '../components/PillButton';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Plus, Shield, Bell, Trash2, Globe } from 'lucide-react';

export function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);

  // Form states
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    scope_type: 'ORGANIZATION',
    scope_value: '',
    cap_amount: '1000',
    period: 'DAILY',
    threshold_percentages: '80,100',
  });

  const [webhookForm, setWebhookForm] = useState({
    url: '',
    secret: 'whsec_secretkey123',
    events: 'BUDGET_THRESHOLD_CROSSED,ANOMALY_DETECTED',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budData, whData, delData] = await Promise.all([
        getBudgets().catch(() => []),
        getWebhooks().catch(() => []),
        getWebhookDeliveries().catch(() => []),
      ]);
      setBudgets(Array.isArray(budData) ? budData : []);
      setWebhooks(Array.isArray(whData) ? whData : []);
      setDeliveries(Array.isArray(delData) ? delData : []);
    } catch (err) {
      console.error('Error fetching budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    try {
      await createBudget({
        ...budgetForm,
        cap_amount: parseFloat(budgetForm.cap_amount),
      });
      setIsBudgetModalOpen(false);
      setBudgetForm({
        name: '',
        scope_type: 'ORGANIZATION',
        scope_value: '',
        cap_amount: '1000',
        period: 'DAILY',
        threshold_percentages: '80,100',
      });
      fetchData();
    } catch (err) {
      alert(`Could not create budget: ${err.message}`);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      try {
        await deleteBudget(id);
        fetchData();
      } catch (err) {
        alert(`Could not delete: ${err.message}`);
      }
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    try {
      await createWebhook(webhookForm);
      setIsWebhookModalOpen(false);
      setWebhookForm({
        url: '',
        secret: 'whsec_secretkey123',
        events: 'BUDGET_THRESHOLD_CROSSED,ANOMALY_DETECTED',
      });
      fetchData();
    } catch (err) {
      alert(`Could not create webhook: ${err.message}`);
    }
  };

  const handleDeleteWebhook = async (id) => {
    if (confirm('Delete this webhook endpoint?')) {
      try {
        await deleteWebhook(id);
        fetchData();
      } catch (err) {
        alert(`Could not delete: ${err.message}`);
      }
    }
  };

  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-12 pb-16">
      
      {/* 1. Budgets Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-slate-gray text-[13px] uppercase tracking-widest font-medium mb-1 block">
              Cost Controls
            </span>
            <h1 className="font-signifier text-4xl font-normal text-ink-black tracking-tight">
              Spend Budgets & Caps
            </h1>
            <p className="text-body text-slate-gray mt-1">
              Transactional budget threshold evaluation with automated outbox alert dispatch
            </p>
          </div>

          {canManage && (
            <PillButton
              variant="filled"
              size="md"
              onClick={() => setIsBudgetModalOpen(true)}
              icon={Plus}
            >
              Create Budget
            </PillButton>
          )}
        </div>

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-fog-white rounded-cards border border-dashed border-mist-gray">
              <p className="text-slate-gray text-[15px] mb-4">
                No active budgets configured for this organization.
              </p>
              {canManage && (
                <PillButton
                  variant="subtle"
                  size="md"
                  onClick={() => setIsBudgetModalOpen(true)}
                  icon={Plus}
                >
                  Create Your First Budget
                </PillButton>
              )}
            </div>
          ) : (
            budgets.map((b) => (
              <BudgetCard
                key={b.id}
                budget={b}
                onDelete={handleDeleteBudget}
                canManage={canManage}
              />
            ))
          )}
        </div>
      </section>

      {/* 2. Webhooks Section */}
      <section className="space-y-6 pt-6 border-t border-mist-gray">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-slate-gray text-[13px] uppercase tracking-widest font-medium mb-1 block">
              Integrations
            </span>
            <h2 className="font-signifier text-3xl font-normal text-ink-black tracking-tight">
              Webhook Endpoints
            </h2>
            <p className="text-[14px] text-slate-gray mt-1">
              Registered HTTPS webhook destinations with Resilience4j exponential backoff retries
            </p>
          </div>

          {canManage && (
            <PillButton
              variant="ghost"
              size="md"
              onClick={() => setIsWebhookModalOpen(true)}
              icon={Plus}
            >
              Add Webhook Endpoint
            </PillButton>
          )}
        </div>

        {/* Webhooks List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {webhooks.length === 0 ? (
            <div className="col-span-full py-8 text-center bg-fog-white rounded-cards border border-dashed border-mist-gray">
              <p className="text-slate-gray text-[14px]">
                No webhook endpoints registered. Add a Slack, PagerDuty, or webhook URL to receive instant alerts.
              </p>
            </div>
          ) : (
            webhooks.map((wh) => (
              <ArtifactCard key={wh.id} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mist-gray flex items-center justify-center text-slate-gray shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-mono text-[14px] font-medium text-ink-black truncate max-w-[280px]">
                      {wh.url}
                    </div>
                    <div className="text-[12px] text-slate-gray mt-0.5">
                      Subscribed to: <span className="text-ink-black">{wh.events || 'ALL'}</span>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-gray hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </ArtifactCard>
            ))
          )}
        </div>
      </section>

      {/* 3. Transactional Outbox Deliveries Audit Table */}
      <section className="pt-6 border-t border-mist-gray">
        <WebhookAuditTable deliveries={deliveries} loading={loading} />
      </section>

      {/* Create Budget Modal */}
      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Create Spend Budget"
      >
        <form onSubmit={handleCreateBudget} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink-black mb-1">
              Budget Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Production EC2 Monthly Cap"
              value={budgetForm.name}
              onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-ink-black mb-1">
                Scope Type
              </label>
              <select
                value={budgetForm.scope_type}
                onChange={(e) => setBudgetForm({ ...budgetForm, scope_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
              >
                <option value="ORGANIZATION">ORGANIZATION</option>
                <option value="SERVICE">SERVICE</option>
                <option value="RESOURCE">RESOURCE</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink-black mb-1">
                Scope Value
              </label>
              <input
                type="text"
                placeholder={budgetForm.scope_type === 'SERVICE' ? 'e.g. EC2' : 'All'}
                disabled={budgetForm.scope_type === 'ORGANIZATION'}
                value={budgetForm.scope_value}
                onChange={(e) => setBudgetForm({ ...budgetForm, scope_value: e.target.value })}
                className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-ink-black mb-1">
                Cap Amount ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={budgetForm.cap_amount}
                onChange={(e) => setBudgetForm({ ...budgetForm, cap_amount: e.target.value })}
                className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink-black mb-1">
                Period
              </label>
              <select
                value={budgetForm.period}
                onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value })}
                className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
              >
                <option value="DAILY">DAILY</option>
                <option value="MONTHLY">MONTHLY</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink-black mb-1">
              Threshold Percentages (comma separated)
            </label>
            <input
              type="text"
              required
              placeholder="80,100"
              value={budgetForm.threshold_percentages}
              onChange={(e) => setBudgetForm({ ...budgetForm, threshold_percentages: e.target.value })}
              className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <PillButton variant="ghost" size="md" onClick={() => setIsBudgetModalOpen(false)}>
              Cancel
            </PillButton>
            <PillButton variant="filled" size="md" type="submit">
              Save Budget
            </PillButton>
          </div>
        </form>
      </Modal>

      {/* Register Webhook Modal */}
      <Modal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        title="Register Webhook Endpoint"
      >
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink-black mb-1">
              Destination URL
            </label>
            <input
              type="url"
              required
              placeholder="https://hooks.slack.com/services/..."
              value={webhookForm.url}
              onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
              className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink-black mb-1">
              Webhook Secret (for HMAC signing)
            </label>
            <input
              type="text"
              required
              value={webhookForm.secret}
              onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
              className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink-black mb-1">
              Subscribed Events
            </label>
            <input
              type="text"
              required
              value={webhookForm.events}
              onChange={(e) => setWebhookForm({ ...webhookForm, events: e.target.value })}
              className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <PillButton variant="ghost" size="md" onClick={() => setIsWebhookModalOpen(false)}>
              Cancel
            </PillButton>
            <PillButton variant="filled" size="md" type="submit">
              Register Webhook
            </PillButton>
          </div>
        </form>
      </Modal>

    </div>
  );
}
