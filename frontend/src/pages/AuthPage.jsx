import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PillButton } from '../components/PillButton';
import { ArtifactCard, NeutralCard } from '../components/Card';
import { Logo } from '../components/Logo';
import { Sparkles, Shield, ArrowRight, Lock, Mail, Building } from 'lucide-react';

export function AuthPage() {
  const { login, register, quickLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    orgName: 'Acme Cloud Solutions',
    email: 'owner@finexa.dev',
    password: 'password',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register(formData.orgName, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(role);
    } catch (err) {
      setError(err.message || 'Quick demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-white flex flex-col justify-between p-6 sm:p-10 selection:bg-blush-peach selection:text-sienna-brown">
      
      {/* Top Bar Brand */}
      <header className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        <Logo size={36} showBadge />
      </header>

      {/* Center Auth Container */}
      <main className="max-w-md w-full mx-auto my-auto py-12">
        <div className="text-center mb-8">
          <h1 className="font-signifier text-4xl sm:text-5xl font-normal text-ink-black tracking-tight mb-3">
            {isRegister ? 'Register Organization' : 'Welcome to Finexa'}
          </h1>
          <p className="text-body text-slate-gray">
            {isRegister
              ? 'Create a multi-tenant cloud cost optimization workspace'
              : 'Sign in to access your cloud spend analytics & alerts'}
          </p>
        </div>

        {/* Auth Card */}
        <ArtifactCard className="p-8 shadow-xl">
          
          {/* Tab Switcher */}
          <div className="flex p-1 bg-mist-gray rounded-buttons mb-6">
            <button
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 py-1.5 text-[14px] font-medium rounded-buttons transition-all ${
                !isRegister ? 'bg-paper-white text-ink-black shadow-sm' : 'text-slate-gray hover:text-ink-black'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 py-1.5 text-[14px] font-medium rounded-buttons transition-all ${
                isRegister ? 'bg-paper-white text-ink-black shadow-sm' : 'text-slate-gray hover:text-ink-black'
              }`}
            >
              New Organization
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 text-red-800 text-[13px] rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-[13px] font-medium text-ink-black mb-1">
                  Organization Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-gray absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={formData.orgName}
                    onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-ink-black mb-1">
                {isRegister ? 'Owner Email' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-gray absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="owner@finexa.dev"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink-black mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-gray absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
                />
              </div>
            </div>

            <PillButton
              variant="filled"
              size="lg"
              type="submit"
              disabled={loading}
              className="w-full justify-center mt-2"
            >
              {loading
                ? 'Authenticating...'
                : isRegister
                ? 'Create Organization & Sign In'
                : 'Sign In'}
            </PillButton>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-mist-gray">
            <span className="text-[12px] uppercase tracking-wider text-slate-gray font-medium block text-center mb-3">
              One-Click Demo Access
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('owner')}
                className="py-2 px-1 bg-mist-gray hover:bg-blush-peach hover:text-sienna-brown rounded-xl text-center text-[12px] font-medium transition-all"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="py-2 px-1 bg-mist-gray hover:bg-blush-peach hover:text-sienna-brown rounded-xl text-center text-[12px] font-medium transition-all"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('viewer')}
                className="py-2 px-1 bg-mist-gray hover:bg-blush-peach hover:text-sienna-brown rounded-xl text-center text-[12px] font-medium transition-all"
              >
                Viewer
              </button>
            </div>
          </div>

        </ArtifactCard>
      </main>

      {/* Footer */}
      <footer className="max-w-[1200px] w-full mx-auto text-center text-[13px] text-slate-gray">
        Finexa • High-Reliability FinOps & Streaming Cost Architecture
      </footer>

    </div>
  );
}
