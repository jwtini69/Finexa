import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PillButton } from './PillButton';
import { Logo } from './Logo';
import { Sparkles, LogOut } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, onOpenDemoConsole, openAnomaliesCount = 0 }) {
  const { user, org, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-paper-white/90 backdrop-blur-md border-b border-black/[0.05] dark:border-white/[0.08] transition-colors">
      <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-8 lg:gap-10">
          <div
            className="cursor-pointer transition-transform active:scale-95 shrink-0"
            onClick={() => setActiveTab('overview')}
          >
            <Logo size={34} showBadge />
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`text-[15px] font-sohne transition-colors py-1 relative cursor-pointer bg-transparent border-none ${
                activeTab === 'overview'
                  ? 'text-ink-black font-medium'
                  : 'text-slate-gray hover:text-ink-black'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <span className="absolute bottom-[-18px] left-0 right-0 h-[2px] bg-ink-black rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('anomalies')}
              className={`text-[15px] font-sohne transition-colors py-1 flex items-center gap-1.5 relative cursor-pointer bg-transparent border-none ${
                activeTab === 'anomalies'
                  ? 'text-ink-black font-medium'
                  : 'text-slate-gray hover:text-ink-black'
              }`}
            >
              Anomalies
              {openAnomaliesCount > 0 && (
                <span className="px-1.5 py-0.2 bg-blush-peach text-sienna-brown text-[11px] font-semibold rounded-full border border-sienna-brown/20">
                  {openAnomaliesCount}
                </span>
              )}
              {activeTab === 'anomalies' && (
                <span className="absolute bottom-[-18px] left-0 right-0 h-[2px] bg-ink-black rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('budgets')}
              className={`text-[15px] font-sohne transition-colors py-1 relative cursor-pointer bg-transparent border-none ${
                activeTab === 'budgets'
                  ? 'text-ink-black font-medium'
                  : 'text-slate-gray hover:text-ink-black'
              }`}
            >
              Budgets &amp; Webhooks
              {activeTab === 'budgets' && (
                <span className="absolute bottom-[-18px] left-0 right-0 h-[2px] bg-ink-black rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`text-[15px] font-sohne transition-colors py-1 relative cursor-pointer bg-transparent border-none ${
                activeTab === 'team'
                  ? 'text-ink-black font-medium'
                  : 'text-slate-gray hover:text-ink-black'
              }`}
            >
              Team
              {activeTab === 'team' && (
                <span className="absolute bottom-[-18px] left-0 right-0 h-[2px] bg-ink-black rounded-full" />
              )}
            </button>
          </nav>
        </div>

        {/* Right: Tenant, Demo Control, and User Actions */}
        <div className="flex items-center gap-3">
          {/* Demo Control Trigger */}
          <PillButton
            variant="peach"
            size="sm"
            onClick={onOpenDemoConsole}
            icon={Sparkles}
          >
            Demo Console
          </PillButton>

          {/* Org & User Badges */}
          {user && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-mist-gray rounded-buttons text-[13px] border border-black/[0.04] dark:border-white/[0.08]">
              <span className="font-medium text-ink-black truncate max-w-[130px]">
                {org?.name || 'Organization'}
              </span>
              <span className="text-slate-gray">•</span>
              <span className="uppercase text-[11px] tracking-wider text-sienna-brown font-semibold px-2 py-0.5 bg-blush-peach/80 rounded-full border border-sienna-brown/20">
                {user.role}
              </span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            title="Log out"
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-gray hover:text-ink-black hover:bg-mist-gray dark:hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
