import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray' | 'gold' | 'success' | 'danger' | 'neutral' | 'warning';
  className?: string;
}

export function Badge({ children, variant = 'green', className }: BadgeProps) {
  const styles: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    yellow: 'bg-amber-100 text-amber-800 border-amber-300',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    red: 'bg-rose-100 text-rose-800 border-rose-300',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    gray: 'bg-slate-100 text-slate-700 border-slate-300',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
    gold: 'bg-amber-400 text-amber-950 font-bold border-amber-500 shadow-sm',
  };

  const selectedStyle = styles[variant] || styles.green;

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', selectedStyle, className)}>
      {children}
    </span>
  );
}
