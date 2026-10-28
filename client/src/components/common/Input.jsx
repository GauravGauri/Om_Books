import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(
  ({ label, error, helperText, icon: Icon, className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1 w-full', containerClassName)}>
        {label && <label className="text-xs font-semibold text-slate-700 tracking-wide">{label}</label>}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500',
              Icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2',
              error && 'border-red-400 focus:ring-red-400/20 focus:border-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-500">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
