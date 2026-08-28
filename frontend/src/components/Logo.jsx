import React from 'react';

export function Logo({ size = 32, subtitle }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-full bg-ink-black flex items-center justify-center text-paper-white font-signifier font-normal italic"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        F
      </div>
      <div>
        <span className="font-signifier text-[22px] tracking-tight text-ink-black italic font-normal block leading-none">
          Finexa
        </span>
        {subtitle && (
          <span className="text-[11px] text-slate-gray font-normal block mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
