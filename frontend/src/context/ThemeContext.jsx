import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }) {
  const [theme] = useState('light');

  useEffect(() => {
    // Explicitly lock theme to Light mode ("warm paper with blush peach")
    const root = document.documentElement;
    root.classList.remove('dark');
    try {
      localStorage.setItem('finexa_theme', 'light');
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {}, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
