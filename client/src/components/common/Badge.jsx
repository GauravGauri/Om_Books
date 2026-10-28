import React from 'react';
import { cn } from '../../utils/cn';

export const Badge = ({ children, variant = 'default', className, ...props }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    primary: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    success: 'bg-green-50 text-green-700 border-green-200 font-medium',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    danger: 'bg-red-50 text-red-700 border-red-200 font-medium',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 font-medium',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium transition-colors',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
