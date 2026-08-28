import React from 'react';

export function PillButton({
  children,
  variant = 'filled', // 'filled' | 'ghost' | 'peach' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  icon: Icon,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-sohne font-normal rounded-buttons transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none";

  const sizeStyles = {
    sm: "px-3.5 py-1 text-[14px] gap-1.5 h-[32px]",
    md: "px-5 py-2 text-[15px] gap-2 h-[40px]",
    lg: "px-7 py-2.5 text-[16px] gap-2.5 h-[48px]",
  };

  const variantStyles = {
    filled: "bg-ink-black text-paper-white hover:bg-ink-black/90 active:scale-[0.98] border border-transparent",
    ghost: "bg-transparent text-ink-black border border-ink-black hover:bg-mist-gray/60 active:scale-[0.98]",
    peach: "bg-blush-peach text-sienna-brown border border-sienna-brown/20 hover:bg-blush-peach/90 active:scale-[0.98]",
    subtle: "bg-mist-gray text-ink-black border border-transparent hover:bg-mist-gray/80 active:scale-[0.98]",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:scale-[0.98]",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
