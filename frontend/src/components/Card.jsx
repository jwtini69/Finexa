import React from 'react';

export function NeutralCard({ children, className = '', padding = 'p-6', ...props }) {
  return (
    <div
      className={`bg-mist-gray rounded-cards transition-all duration-200 ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AccentCard({ children, className = '', padding = 'p-8', ...props }) {
  return (
    <div
      className={`bg-blush-peach text-sienna-brown rounded-cards ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function ArtifactCard({ children, className = '', padding = 'p-6', ...props }) {
  return (
    <div
      className={`bg-paper-white rounded-elevated shadow-artifact border border-black/[0.04] transition-all duration-200 ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
