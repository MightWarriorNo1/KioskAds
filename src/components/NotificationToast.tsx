import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotification, NotificationType } from '../contexts/NotificationContext';

const typeConfig = {
  success: { 
    icon: CheckCircle, 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-200', 
    iconColor: 'text-green-600',
    progressColor: 'bg-green-500'
  },
  error: { 
    icon: AlertCircle, 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-200', 
    iconColor: 'text-red-600',
    progressColor: 'bg-red-500'
  },
  warning: { 
    icon: AlertTriangle, 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-200', 
    iconColor: 'text-yellow-600',
    progressColor: 'bg-yellow-500'
  },
  info: { 
    icon: Info, 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-200', 
    iconColor: 'text-blue-600',
    progressColor: 'bg-blue-500'
  }
};

export default function NotificationToast() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-[60] space-y-3 max-w-sm">
      {notifications.map(notification => {
        const config = typeConfig[notification.type];
        const Icon = config.icon;

        return (
          <div
            key={notification.id}
            className={`${config.bgColor} ${config.borderColor} border rounded-xl shadow-lg transform transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 dark:bg-gray-800 dark:border-gray-700`}
            style={{
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border dark:bg-gray-900 dark:border-gray-700`}>
                  <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0`} />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{notification.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{notification.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-3 inline-flex text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 rounded-full p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-b-xl overflow-hidden">
              <div 
                className={`h-full ${config.progressColor} transition-all duration-5000 ease-linear`}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        );
      })}
      
    </div>
  );
}