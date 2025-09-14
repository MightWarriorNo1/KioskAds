import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105',
  secondary: 'bg-white/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-100 border border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-50 dark:hover:bg-slate-600/90 hover:border-slate-300 dark:hover:border-slate-500 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105',
  ghost: 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300 hover:scale-105',
  danger: 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 shadow-lg hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300 hover:scale-105',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs font-medium rounded-lg',
  md: 'px-6 py-3 text-sm font-semibold rounded-xl',
  lg: 'px-8 py-4 text-base font-bold rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  loading = false,
  children,
  ...props
}: ButtonProps) {
  const classes = `${variantClass[variant]} ${sizeClass[size]} inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`.trim();
  const { disabled, ...restProps } = props;
  const isDisabled = Boolean(disabled) || Boolean(loading);
  return (
    <button className={classes} {...restProps} aria-busy={loading} disabled={isDisabled}>
      {leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2 flex items-center">{rightIcon}</span>}
    </button>
  );
}



