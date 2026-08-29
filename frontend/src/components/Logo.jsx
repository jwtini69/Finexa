import React from 'react';

export function Logo({ size = 32, subtitle, className = '', showBadge = false }) {
  const iconSize = size;
  const fontSize = Math.round(size * 0.72);

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Modern Cloud + 'F' Fusion Logomark */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Base Dark Squircle */}
          <rect
            width="40"
            height="40"
            rx="11"
            className="fill-[#17191c] dark:fill-[#20242c]"
          />

          {/* Cloud Silhouette Boundary (Subtle hairline contour) */}
          <path
            d="M 23 12 C 26.5 12 29.5 14.5 30 18 C 32.5 18.5 34 20.8 34 23.5 C 34 26.5 31.5 29 28.5 29 H 24"
            stroke="#777b86"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.4"
          />

          {/* The Structural 'F' Spine (Left boundary of the Cloud) */}
          <path
            d="M 11.5 10.5 C 11.5 9.1 12.6 8 14 8 H 15 C 16.4 8 17.5 9.1 17.5 10.5 V 29.5 C 17.5 30.9 16.4 32 15 32 H 14 C 12.6 32 11.5 30.9 11.5 29.5 V 10.5 Z"
            fill="#ffffff"
          />

          {/* Top Cloud Dome that flows into the upper 'F' Crossbar */}
          <path
            d="M 17.5 8 H 22.5 C 26.5 8 29.5 10.5 30 14 C 30.4 16.8 28.5 19 25.5 19 H 17.5 V 8 Z"
            fill="#ffffff"
          />

          {/* Inner Negative Cut to define the Cloud Arch and 'F' top bar */}
          <path
            d="M 17.5 13.5 H 22 C 23.8 13.5 24.8 14.6 24.6 15.8 C 24.4 16.8 23.4 17.5 22 17.5 H 17.5 V 13.5 Z"
            className="fill-[#17191c] dark:fill-[#20242c]"
          />

          {/* Middle Analytical Cloud Beam ('F' middle arm in Blush Peach) */}
          <path
            d="M 17.5 21.5 H 25 C 26.4 21.5 27.5 22.6 27.5 24 C 27.5 25.4 26.4 26.5 25 26.5 H 17.5 V 21.5 Z"
            fill="#fbe1d1"
          />

          {/* Cloud Apex Metric Node (Sienna Brown Focal Point) */}
          <circle
            cx="22.5"
            cy="8"
            r="1.75"
            fill="#fbe1d1"
            stroke="#17191c"
            strokeWidth="0.8"
          />
        </svg>
      </div>

      {/* Brand Wordmark & Optically Calibrated FinOps Badge */}
      <div className="flex flex-col justify-center">
        <div className="inline-flex items-center gap-2">
          <span
            className="font-signifier italic font-normal text-ink-black tracking-[-0.035em] leading-none"
            style={{ fontSize: `${fontSize}px` }}
          >
            Finexa
          </span>
          {showBadge && (
            <span className="shrink-0 text-[10px] uppercase tracking-widest text-slate-gray px-2 py-0.5 bg-mist-gray rounded-full font-medium leading-none border border-black/[0.05] dark:border-white/[0.08] relative -top-[1px]">
              FinOps
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[11px] text-slate-gray font-normal tracking-normal leading-tight mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
