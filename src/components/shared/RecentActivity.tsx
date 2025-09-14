import React from 'react';
import { CheckCircle, Info, AlertTriangle, Clock } from 'lucide-react';

interface Activity {
  action: string;
  time: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface RecentActivityProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
  onViewAllClick?: () => void;
}

const typeConfig = {
  success: { 
    icon: CheckCircle, 
    color: 'text-emerald-600 dark:text-emerald-300', 
    bgColor: 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-200/50 dark:border-emerald-600/40' 
  },
  info: { 
    icon: Info, 
    color: 'text-blue-600 dark:text-blue-300', 
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-600/40' 
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-amber-600 dark:text-amber-300', 
    bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-200/50 dark:border-amber-600/40' 
  },
  error: { 
    icon: AlertTriangle, 
    color: 'text-red-600 dark:text-red-300', 
    bgColor: 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border border-red-200/50 dark:border-red-600/40' 
  }
};

export default function RecentActivity({ activities, onActivityClick, onViewAllClick }: RecentActivityProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const config = typeConfig[activity.type];
          const Icon = config.icon;
          
          return (
            <div 
              key={index} 
              className={`flex items-start space-x-4 group hover:bg-slate-50 dark:hover:bg-slate-700/50 p-3 rounded-xl transition-all duration-300 ${onActivityClick ? 'cursor-pointer hover:scale-105' : ''}`}
              onClick={() => onActivityClick?.(activity)}
            >
              <div className={`p-3 rounded-xl ${config.bgColor} group-hover:scale-110 transition-transform shadow-sm`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {activity.action}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${config.color.replace('text-', 'bg-').replace('-600', '-500').replace('-400', '-400')} shadow-sm`}></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* View All Link */}
      <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <button 
          className="text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 font-semibold transition-all duration-200 hover:scale-105 flex items-center space-x-1"
          onClick={onViewAllClick}
        >
          <span>View all activity</span>
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}