import React from 'react';
import { cn } from '../../utils/cn';

export const Button = React.forwardRef(
  ({ children, variant = 'primary', size = 'md', className, disabled, isLoading, icon: Icon, ...props }, ref) => {
    const variants = {
      primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-[0.99]',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
      outline: 'bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
      dark: 'bg-slate-900 hover:bg-slate-800 text-white',
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs font-medium rounded-md gap-1.5',
      md: 'px-3.5 py-2 text-sm font-medium rounded-lg gap-2',
      lg: 'px-4.5 py-2.5 text-base font-medium rounded-lg gap-2.5',
      icon: 'p-2 rounded-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed select-none font-medium',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && Icon && <Icon className="w-4 h-4" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
