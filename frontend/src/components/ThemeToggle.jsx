import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      className={`w-9 h-9 flex items-center justify-center rounded-full text-slate-gray hover:text-ink-black hover:bg-mist-gray dark:hover:bg-white/10 dark:text-ash-gray dark:hover:text-paper-white transition-all cursor-pointer border border-black/[0.04] dark:border-white/[0.08] bg-transparent ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-blush-peach transition-transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-ink-black transition-transform rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
