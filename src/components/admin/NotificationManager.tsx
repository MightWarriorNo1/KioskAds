import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Info, CheckCircle, XCircle, Users, Monitor, Palette } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface SystemNotice {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'normal' | 'high' | 'critical';
  is_active: boolean;
  show_on_dashboard: boolean;
  show_on_login: boolean;
  target_roles: string[];
  created_at: string;
  expires_at?: string;
}

interface AdminNotificationSettings {
  cleared_system_notices_at?: string;
  cleared_recent_activity_at?: string;
  cleared_client_activity_at?: string;
  cleared_host_activity_at?: string;
  cleared_designer_activity_at?: string;
}

export default function NotificationManager() {
  const [systemNotices, setSystemNotices] = useState<SystemNotice[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<AdminNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notices, settings] = await Promise.all([
        AdminService.getSystemNotices(),
        AdminService.getAdminNotificationSettings()
      ]);
      setSystemNotices(notices);
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error loading notification data:', error);
      addNotification('error', 'Error', 'Failed to load notification data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSystemNotices = async () => {
    try {
      setClearing('system-notices');
      await AdminService.clearSystemNotices();
      addNotification('success', 'Success', 'System notices cleared successfully');
      await loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error('Error clearing system notices:', error);
      addNotification('error', 'Error', 'Failed to clear system notices');
    } finally {
      setClearing(null);
    }
  };

  const handleClearRecentActivity = async () => {
    try {
      setClearing('recent-activity');
      await AdminService.clearRecentActivity();
      addNotification('success', 'Success', 'Recent activity cleared successfully');
      await loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error('Error clearing recent activity:', error);
      addNotification('error', 'Error', 'Failed to clear recent activity');
    } finally {
      setClearing(null);
    }
  };

  const handleClearUserActivity = async (userType: 'client' | 'host' | 'designer') => {
    try {
      setClearing(`user-${userType}`);
      await AdminService.clearUserActivityNotifications(userType);
      addNotification('success', 'Success', `${userType.charAt(0).toUpperCase() + userType.slice(1)} activity cleared successfully`);
      await loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error(`Error clearing ${userType} activity:`, error);
      addNotification('error', 'Error', `Failed to clear ${userType} activity`);
    } finally {
      setClearing(null);
    }
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return Info;
    }
  };

  const getNoticeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card title="Notification Manager" subtitle="Manage system notices and clear notifications">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Notices */}
      <Card title="System Notices" subtitle="Manage system-wide notices and alerts">
        <div className="space-y-4">
          {systemNotices.length > 0 ? (
            systemNotices.map((notice) => {
              const Icon = getNoticeIcon(notice.type);
              const colorClass = getNoticeColor(notice.type);
              const priorityClass = getPriorityColor(notice.priority);
              
              return (
                <div key={notice.id} className={`p-4 rounded-lg border ${colorClass}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{notice.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityClass}`}>
                            {notice.priority}
                          </span>
                        </div>
                        <p className="text-sm opacity-90">{notice.message}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs opacity-75">
                          <span>Created: {formatDate(notice.created_at)}</span>
                          {notice.expires_at && (
                            <span>Expires: {formatDate(notice.expires_at)}</span>
                          )}
                          {notice.show_on_dashboard && (
                            <span className="px-2 py-1 bg-white/50 rounded">Dashboard</span>
                          )}
                          {notice.show_on_login && (
                            <span className="px-2 py-1 bg-white/50 rounded">Login</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active system notices</p>
            </div>
          )}
          
          <div className="pt-4 border-t">
            <Button
              onClick={handleClearSystemNotices}
              disabled={clearing === 'system-notices' || systemNotices.length === 0}
              variant="danger"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All System Notices</span>
            </Button>
            {notificationSettings?.cleared_system_notices_at && (
              <p className="text-xs text-gray-500 mt-2">
                Last cleared: {formatDate(notificationSettings.cleared_system_notices_at)}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Activity Management */}
      <Card title="Activity Management" subtitle="Clear recent activity and user notifications">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <Monitor className="h-4 w-4" />
              <span>Recent Activity</span>
            </h4>
            <p className="text-sm text-gray-600">Clear admin dashboard recent activity logs</p>
            <Button
              onClick={handleClearRecentActivity}
              disabled={clearing === 'recent-activity'}
              variant="secondary"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Recent Activity</span>
            </Button>
            {notificationSettings?.cleared_recent_activity_at && (
              <p className="text-xs text-gray-500">
                Last cleared: {formatDate(notificationSettings.cleared_recent_activity_at)}
              </p>
            )}
          </div>

          {/* User Activity */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>User Activity</span>
            </h4>
            <p className="text-sm text-gray-600">Clear activity notifications for specific user types</p>
            <div className="space-y-2">
              <Button
                onClick={() => handleClearUserActivity('client')}
                disabled={clearing === 'user-client'}
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Clear Client Activity</span>
              </Button>
              <Button
                onClick={() => handleClearUserActivity('host')}
                disabled={clearing === 'user-host'}
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center space-x-2"
              >
                <Monitor className="h-4 w-4" />
                <span>Clear Host Activity</span>
              </Button>
              <Button
                onClick={() => handleClearUserActivity('designer')}
                disabled={clearing === 'user-designer'}
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center space-x-2"
              >
                <Palette className="h-4 w-4" />
                <span>Clear Designer Activity</span>
              </Button>
            </div>
            <div className="space-y-1 text-xs text-gray-500">
              {notificationSettings?.cleared_client_activity_at && (
                <p>Client: {formatDate(notificationSettings.cleared_client_activity_at)}</p>
              )}
              {notificationSettings?.cleared_host_activity_at && (
                <p>Host: {formatDate(notificationSettings.cleared_host_activity_at)}</p>
              )}
              {notificationSettings?.cleared_designer_activity_at && (
                <p>Designer: {formatDate(notificationSettings.cleared_designer_activity_at)}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
