import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ 
  variant = 'button', 
  size = 'md', 
  showLabel = false,
  className = '' 
}: ThemeToggleProps) {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative group ${className}`}>
        <button
          className={`${sizeClasses[size]} flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl`}
          title="Toggle theme"
        >
          {actualTheme === 'dark' ? (
            <Moon className={`${iconSizes[size]} text-indigo-600 dark:text-indigo-400`} />
          ) : (
            <Sun className={`${iconSizes[size]} text-amber-500`} />
          )}
        </button>
        
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl ring-1 ring-gray-200 dark:ring-slate-700 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <button
            onClick={() => setTheme('light')}
            className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
              theme === 'light' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Sun className="h-4 w-4 mr-3" />
            Light
            {theme === 'light' && <div className="ml-auto w-2 h-2 bg-indigo-600 rounded-full"></div>}
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
              theme === 'dark' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Moon className="h-4 w-4 mr-3" />
            Dark
            {theme === 'dark' && <div className="ml-auto w-2 h-2 bg-indigo-600 rounded-full"></div>}
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
              theme === 'system' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Monitor className="h-4 w-4 mr-3" />
            System
            {theme === 'system' && <div className="ml-auto w-2 h-2 bg-indigo-600 rounded-full"></div>}
          </button>
          <div className="border-t border-gray-200 dark:border-slate-600 my-2"></div>
          <div className="px-4 py-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>Keyboard shortcut:</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                ⌘⇧T
              </kbd>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={toggleTheme}
        className={`${sizeClasses[size]} flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl`}
        title={`Switch to ${actualTheme === 'dark' ? 'light' : 'dark'} mode (⌘⇧T)`}
      >
        <div className="relative">
          <Sun className={`${iconSizes[size]} text-amber-500 transition-all duration-300 ${actualTheme === 'dark' ? 'scale-0 rotate-90' : 'scale-100 rotate-0'} absolute inset-0`} />
          <Moon className={`${iconSizes[size]} text-indigo-600 dark:text-indigo-400 transition-all duration-300 ${actualTheme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} />
        </div>
        {showLabel && (
          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {actualTheme === 'dark' ? 'Dark' : 'Light'}
          </span>
        )}
      </button>
      
      {/* Tooltip for keyboard shortcut */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none z-50">
        Press ⌘⇧T to toggle
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    </div>
  );
}
