import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id || props.name || `input-${Math.random().toString(36).slice(2)}`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
          {label}
        </label>
      )}
      <input id={inputId} className="input" {...props} />
      {hint && !error && <p className="mt-1 text-xs text-gray-500 dark:text-white">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}



