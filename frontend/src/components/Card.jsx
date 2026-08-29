import React from 'react';

export function NeutralCard({ children, className = '', padding = 'p-6', ...props }) {
  return (
    <div
      className={`bg-mist-gray rounded-cards border border-black/[0.04] dark:border-white/[0.08] transition-all duration-200 ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AccentCard({ children, className = '', padding = 'p-8', ...props }) {
  return (
    <div
      className={`bg-blush-peach text-sienna-brown rounded-cards border border-sienna-brown/20 shadow-sm ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function ArtifactCard({ children, className = '', padding = 'p-6', ...props }) {
  return (
    <div
      className={`bg-paper-white rounded-elevated shadow-artifact border border-black/[0.04] dark:border-white/[0.08] transition-all duration-200 ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
