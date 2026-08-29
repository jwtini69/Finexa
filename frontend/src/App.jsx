import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { DemoConsole } from './components/DemoConsole';
import { DashboardPage } from './pages/DashboardPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { TeamPage } from './pages/TeamPage';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { Logo } from './components/Logo';
import { getAnomalies } from './api/anomalies';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [view, setView] = useState('landing'); // 'landing' | 'auth' | 'app'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'anomalies' | 'budgets' | 'team'
  const [isDemoConsoleOpen, setIsDemoConsoleOpen] = useState(false);
  const [openAnomaliesCount, setOpenAnomaliesCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isAuthenticated && view === 'auth') {
      setView('app');
    }
  }, [isAuthenticated]);

  const fetchUnreadAnomalies = () => {
    if (isAuthenticated) {
      getAnomalies('OPEN')
        .then((res) => {
          if (Array.isArray(res)) setOpenAnomaliesCount(res.length);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchUnreadAnomalies();
    const interval = setInterval(fetchUnreadAnomalies, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshKey]);

  const handleRefreshAll = () => {
    setRefreshKey((k) => k + 1);
    fetchUnreadAnomalies();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-white flex items-center justify-center text-slate-gray">
        <div className="flex flex-col items-center gap-3">
          <Logo size={44} showBadge />
          <span className="text-[13px] text-slate-gray mt-2 animate-pulse">Initializing FinOps Workspace...</span>
        </div>
      </div>
    );
  }

  // 1. Landing Page View (Always renders when view === 'landing')
  if (view === 'landing') {
    return (
      <LandingPage
        onLaunchApp={() => setView(isAuthenticated ? 'app' : 'auth')}
        onOpenAuth={() => setView('auth')}
      />
    );
  }

  // 2. Authentication Screen
  if (!isAuthenticated) {
    return (
      <div>
        <div className="bg-fog-white border-b border-mist-gray px-6 py-2.5 flex items-center justify-between text-[13px] text-slate-gray">
          <button
            onClick={() => setView('landing')}
            className="hover:text-ink-black font-medium transition-colors cursor-pointer bg-transparent border-none"
          >
            ← Return to Landing Page
          </button>
          <span>Finexa Authentication</span>
        </div>
        <AuthPage onLoginSuccess={() => setView('app')} />
      </div>
    );
  }

  // 3. Authenticated Workspace
  return (
    <div className="min-h-screen bg-paper-white flex flex-col justify-between selection:bg-blush-peach selection:text-sienna-brown">
      <div>
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenDemoConsole={() => setIsDemoConsoleOpen(true)}
          openAnomaliesCount={openAnomaliesCount}
        />

        {/* Main Content Area */}
        <main className="max-w-[1200px] mx-auto px-6 pt-8">
          {activeTab === 'overview' && (
            <DashboardPage
              key={refreshKey}
              onNavigateToAnomalies={() => setActiveTab('anomalies')}
              onOpenDemoConsole={() => setIsDemoConsoleOpen(true)}
            />
          )}

          {activeTab === 'anomalies' && (
            <AnomaliesPage
              key={refreshKey}
              onOpenDemoConsole={() => setIsDemoConsoleOpen(true)}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsPage key={refreshKey} />
          )}

          {activeTab === 'team' && (
            <TeamPage key={refreshKey} />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-mist-gray py-8 mt-16 bg-fog-white">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-slate-gray">
          <div className="flex items-center gap-3">
            <span className="font-signifier italic text-base text-ink-black">Finexa</span>
            <span>•</span>
            <span>Cloud Cost Optimizer & Anomaly Detector</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('landing')}
              className="hover:text-ink-black text-[13px] text-slate-gray"
            >
              View Landing Page
            </button>
            <span>•</span>
            <a href="/swagger-ui.html" target="_blank" rel="noreferrer" className="hover:text-ink-black">
              API Docs
            </a>
          </div>
        </div>
      </footer>

      {/* Demo Console Drawer */}
      <DemoConsole
        isOpen={isDemoConsoleOpen}
        onClose={() => setIsDemoConsoleOpen(false)}
        onRefreshAll={handleRefreshAll}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
