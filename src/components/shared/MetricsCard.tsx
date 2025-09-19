import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange';
  onClick?: () => void;
}

const colorConfig = {
  blue: 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200 border border-blue-200/50 dark:border-blue-600/40',
  green: 'bg-gradient-to-br from-emerald-50 to-green-100 text-emerald-700 dark:from-emerald-900/30 dark:to-green-900/30 dark:text-emerald-200 border border-emerald-200/50 dark:border-emerald-600/40',
  purple: 'bg-gradient-to-br from-purple-50 to-violet-100 text-purple-700 dark:from-purple-900/30 dark:to-violet-900/30 dark:text-purple-200 border border-purple-200/50 dark:border-purple-600/40',
  orange: 'bg-gradient-to-br from-orange-50 to-amber-100 text-orange-700 dark:from-orange-900/30 dark:to-amber-900/30 dark:text-orange-200 border border-orange-200/50 dark:border-orange-600/40'
};

export default function MetricsCard({ title, value, change, changeType, icon: Icon, color, onClick }: MetricsCardProps) {
  return (
    <div 
      className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-105 transform hover:-translate-y-1' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1 sm:mb-2 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</p>
          <p className={`text-xs sm:text-sm font-medium ${changeType === 'positive' ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'} truncate`}>
            {change}
          </p>
        </div>
        <div className={`p-3 sm:p-4 rounded-xl ${colorConfig[color]} shadow-lg flex-shrink-0 ml-2`}>
          <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
        </div>
      </div>
    </div>
  );
}