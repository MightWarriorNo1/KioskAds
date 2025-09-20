import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

const colorConfig = {
  blue: 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 hover:from-blue-100 hover:to-indigo-200 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200 dark:hover:from-blue-800/40 dark:hover:to-indigo-800/40 border border-blue-200/50 dark:border-blue-600/40',
  green: 'bg-gradient-to-br from-emerald-50 to-green-100 text-emerald-700 hover:from-emerald-100 hover:to-green-200 dark:from-emerald-900/30 dark:to-green-900/30 dark:text-emerald-200 dark:hover:from-emerald-800/40 dark:hover:to-green-800/40 border border-emerald-200/50 dark:border-emerald-600/40',
  purple: 'bg-gradient-to-br from-purple-50 to-violet-100 text-purple-700 hover:from-purple-100 hover:to-violet-200 dark:from-purple-900/30 dark:to-violet-900/30 dark:text-purple-200 dark:hover:from-purple-800/40 dark:hover:to-violet-800/40 border border-purple-200/50 dark:border-purple-600/40',
  orange: 'bg-gradient-to-br from-orange-50 to-amber-100 text-orange-700 hover:from-orange-100 hover:to-amber-200 dark:from-orange-900/30 dark:to-amber-900/30 dark:text-orange-200 dark:hover:from-orange-800/40 dark:hover:to-amber-800/40 border border-orange-200/50 dark:border-orange-600/40',
  red: 'bg-gradient-to-br from-red-50 to-rose-100 text-red-700 hover:from-red-100 hover:to-rose-200 dark:from-red-900/30 dark:to-rose-900/30 dark:text-red-200 dark:hover:from-red-800/40 dark:hover:to-rose-800/40 border border-red-200/50 dark:border-red-600/40'
};

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h3>
      <div className="space-y-4">
        {actions.map((action, index) => {
          const content = (
            <div className="group block p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
              <div className="flex items-center space-x-4">
                <div className={`p-4 rounded-xl transition-all duration-300 shadow-sm ${colorConfig[action.color]} ${action.loading ? 'opacity-50' : ''}`}>
                  <action.icon className={`h-6 w-6 group-hover:scale-110 transition-transform ${action.loading ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {action.description}
                  </p>
                </div>
                <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-all duration-300 group-hover:translate-x-1">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          );

          if (action.onClick) {
            return (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.loading}
                className="w-full text-left"
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={index} to={action.href || '#'}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}