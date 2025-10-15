import { useState, useEffect, useCallback } from 'react';
import { Mail, Bell, AlertCircle, Settings, Clock, Users, Send, Plus, X, CheckCircle } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';

interface NotificationConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'email' | 'push' | 'sms';
}

interface DailyEmailSettings {
  enabled: boolean;
  time: string;
  recipients: string[];
}

interface EmailConfigSettings {
  fromEmail: string;
  replyToEmail: string;
}

interface NotificationSettingsProps {
  onSave?: (saveFunction: () => Promise<void>) => void;
  onHasChanges?: (hasChanges: boolean) => void;
}

export default function NotificationSettings({ onSave, onHasChanges }: NotificationSettingsProps = {}) {
  const { addNotification } = useNotification();
  const [configs, setConfigs] = useState<NotificationConfig[]>([
    {
      id: 'order-confirmation',
      name: 'Order Confirmation',
      description: 'Send email confirmation when an order is placed',
      enabled: true,
      type: 'email'
    },
    {
      id: 'payment-received',
      name: 'Payment Received',
      description: 'Notify when payment is successfully processed',
      enabled: true,
      type: 'email'
    },
    {
      id: 'order-shipped',
      name: 'Order Shipped',
      description: 'Send tracking information when order ships',
      enabled: true,
      type: 'email'
    },
    {
      id: 'low-inventory',
      name: 'Low Inventory Alert',
      description: 'Alert when inventory levels are low',
      enabled: false,
      type: 'email'
    },
    {
      id: 'system-maintenance',
      name: 'System Maintenance',
      description: 'Notify about scheduled maintenance windows',
      enabled: true,
      type: 'email'
    },
    {
      id: 'security-alerts',
      name: 'Security Alerts',
      description: 'Critical security notifications',
      enabled: true,
      type: 'email'
    }
  ]);

  
  const [dailyEmailSettings, setDailyEmailSettings] = useState<DailyEmailSettings>({
    enabled: false,
    time: '09:00',
    recipients: []
  });
  const [emailConfigSettings, setEmailConfigSettings] = useState<EmailConfigSettings>({
    fromEmail: 'noreply@yourcompany.com',
    replyToEmail: 'support@yourcompany.com'
  });
  const [newRecipient, setNewRecipient] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await AdminService.getSystemSettings();
      
      // Load daily email settings
      const enabledSetting = settings.find(s => s.key === 'daily_pending_review_email_enabled');
      const timeSetting = settings.find(s => s.key === 'daily_pending_review_email_time');
      const recipientsSetting = settings.find(s => s.key === 'daily_pending_review_email_recipients');

      setDailyEmailSettings({
        enabled: enabledSetting?.value === 'true' || enabledSetting?.value === true,
        time: timeSetting?.value || '09:00',
        recipients: Array.isArray(recipientsSetting?.value) 
          ? recipientsSetting.value 
          : (recipientsSetting?.value ? JSON.parse(recipientsSetting.value) : [])
      });

      // Load email configuration settings
      const fromEmailSetting = settings.find(s => s.key === 'email_from_address');
      const replyToEmailSetting = settings.find(s => s.key === 'email_reply_to_address');

      setEmailConfigSettings({
        fromEmail: fromEmailSetting?.value || 'noreply@yourcompany.com',
        replyToEmail: replyToEmailSetting?.value || 'support@yourcompany.com'
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      addNotification('error', 'Error', 'Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setConfigs(prev => 
      prev.map(config => 
        config.id === id 
          ? { ...config, enabled: !config.enabled }
          : config
      )
    );
    onHasChanges?.(true);
  };

  const handleSave = useCallback(async () => {
    try {
      
      // Save daily email settings
      await Promise.all([
        AdminService.updateSystemSetting('daily_pending_review_email_enabled', dailyEmailSettings.enabled),
        AdminService.updateSystemSetting('daily_pending_review_email_time', dailyEmailSettings.time),
        AdminService.updateSystemSetting('daily_pending_review_email_recipients', dailyEmailSettings.recipients),
        AdminService.updateSystemSetting('email_from_address', emailConfigSettings.fromEmail),
        AdminService.updateSystemSetting('email_reply_to_address', emailConfigSettings.replyToEmail)
      ]);

      addNotification('success', 'Success', 'Notification settings saved successfully');
      onHasChanges?.(false);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      addNotification('error', 'Error', 'Failed to save notification settings');
    } finally {
    }
  }, [dailyEmailSettings, emailConfigSettings]);

  // Expose save function to parent
  useEffect(() => {
    if (onSave) {
      onSave(handleSave);
    }
    // We intentionally depend only on stable callback identity from useCallback and onSave
  }, [onSave, handleSave]);

  const handleDailyEmailToggle = () => {
    setDailyEmailSettings(prev => ({ ...prev, enabled: !prev.enabled }));
    onHasChanges?.(true);
  };

  const handleTimeChange = (time: string) => {
    setDailyEmailSettings(prev => ({ ...prev, time }));
    onHasChanges?.(true);
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !dailyEmailSettings.recipients.includes(newRecipient.trim())) {
      setDailyEmailSettings(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient.trim()]
      }));
      setNewRecipient('');
      onHasChanges?.(true);
    }
  };

  const removeRecipient = (email: string) => {
    setDailyEmailSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
    onHasChanges?.(true);
  };

  const handleFromEmailChange = (email: string) => {
    setEmailConfigSettings(prev => ({ ...prev, fromEmail: email }));
    onHasChanges?.(true);
  };

  const handleReplyToEmailChange = (email: string) => {
    setEmailConfigSettings(prev => ({ ...prev, replyToEmail: email }));
    onHasChanges?.(true);
  };

  const sendTestEmail = async () => {
    try {
      setIsSendingTest(true);
      await AdminService.sendDailyPendingReviewEmail();
      addNotification('success', 'Success', 'Test email sent successfully');
    } catch (error) {
      console.error('Error sending test email:', error);
      addNotification('error', 'Error', 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'push':
        return <Bell className="h-4 w-4" />;
      case 'sms':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'text-blue-600 bg-blue-100';
      case 'push':
        return 'text-green-600 bg-green-100';
      case 'sms':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Notification Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure how and when users receive notifications
        </p>
      </div>

      {/* Daily Pending Ad Review Email Configuration */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Daily Pending Ad Review Email
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automated daily email notifications for pending ad reviews
              </p>
            </div>
          </div>
          
          <button
            onClick={handleDailyEmailToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              dailyEmailSettings.enabled
                ? 'bg-purple-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                dailyEmailSettings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {dailyEmailSettings.enabled && (
          <div className="space-y-6">
            {/* Time Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="h-4 w-4 inline mr-2" />
                Daily Email Time
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="time"
                  value={dailyEmailSettings.time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  (24-hour format)
                </span>
              </div>
            </div>

            {/* Recipients Management */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="h-4 w-4 inline mr-2" />
                Email Recipients
              </label>
              
              {/* Add Recipient */}
              <div className="flex space-x-2 mb-3">
                <input
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="Enter admin email address"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                />
                <button
                  onClick={addRecipient}
                  disabled={!newRecipient.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Recipients List */}
              <div className="space-y-2">
                {dailyEmailSettings.recipients.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No recipients added yet
                  </p>
                ) : (
                  dailyEmailSettings.recipients.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-900 dark:text-white">{email}</span>
                      </div>
                      <button
                        onClick={() => removeRecipient(email)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Test Email Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                  Test Configuration
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Send a test email to verify your settings
                </p>
              </div>
              <button
                onClick={sendTestEmail}
                disabled={isSendingTest || dailyEmailSettings.recipients.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>{isSendingTest ? 'Sending...' : 'Send Test Email'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* General Notification Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          General Notifications
        </h4>
        {configs.map((config) => (
          <div
            key={config.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${getTypeColor(config.type)}`}>
                  {getTypeIcon(config.type)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {config.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {config.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {config.type}
                </span>
                
                <button
                  onClick={() => handleToggle(config.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    config.enabled
                      ? 'bg-purple-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Email Configuration */}
      {/* <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">
          Email Configuration
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Email Address
            </label>
            <input
              type="email"
              value={emailConfigSettings.fromEmail}
              onChange={(e) => handleFromEmailChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reply-To Email Address
            </label>
            <input
              type="email"
              value={emailConfigSettings.replyToEmail}
              onChange={(e) => handleReplyToEmailChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div> */}

    </div>
  );
}