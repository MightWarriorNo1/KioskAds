import React from 'react';

export function getPasswordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 5);
}

export default function PasswordStrength({ password }: { password: string }) {
  const score = getPasswordScore(password);
  const colors = ['bg-gray-200 dark:bg-gray-600', 'bg-red-400', 'bg-yellow-400', 'bg-amber-500', 'bg-green-500', 'bg-emerald-600'];
  const textColors = ['text-gray-500 dark:text-gray-400', 'text-red-500', 'text-yellow-600', 'text-amber-600', 'text-green-600', 'text-emerald-600'];
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  
  if (!password) return null;
  
  return (
    <div className="mt-3" aria-live="polite">
      <div className="flex gap-1.5">
        {[0,1,2,3,4].map((i) => (
          <div 
            key={i} 
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : 'bg-gray-200 dark:bg-gray-600'}`} 
          />
        ))}
      </div>
      <div className={`mt-2 text-xs font-medium ${textColors[score]} transition-colors duration-300`}>
        Password strength: {labels[score]}
      </div>
    </div>
  );
}


