import React, { useState, useEffect } from 'react';
import { Mail, Save, TestTube, Clock, Users, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { CampaignEmailService } from '../../services/campaignEmailService';

interface EmailSettings {
  campaign_emails_enabled: boolean;
  campaign_expiring_days: number;
  campaign_expiring_enabled: boolean;
  campaign_expired_enabled: boolean;
  admin_notifications_enabled: boolean;
  host_notifications_enabled: boolean;
}

export const CampaignEmailSettings: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    campaign_emails_enabled: true,
    campaign_expiring_days: 7,
    campaign_expiring_enabled: true,
    campaign_expired_enabled: true,
    admin_notifications_enabled: true,
    host_notifications_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{status: 'success' | 'error' | 'pending', message: string} | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'campaign_emails_enabled',
          'campaign_expiring_days',
          'campaign_expiring_enabled',
          'campaign_expired_enabled',
          'admin_notifications_enabled',
          'host_notifications_enabled'
        ]);

      if (error) throw error;

      const loadedSettings: EmailSettings = {
        campaign_emails_enabled: true,
        campaign_expiring_days: 7,
        campaign_expiring_enabled: true,
        campaign_expired_enabled: true,
        admin_notifications_enabled: true,
        host_notifications_enabled: true
      };

      data?.forEach(setting => {
        switch (setting.key) {
          case 'campaign_emails_enabled':
            loadedSettings.campaign_emails_enabled = setting.value as boolean;
            break;
          case 'campaign_expiring_days':
            loadedSettings.campaign_expiring_days = setting.value as number;
            break;
          case 'campaign_expiring_enabled':
            loadedSettings.campaign_expiring_enabled = setting.value as boolean;
            break;
          case 'campaign_expired_enabled':
            loadedSettings.campaign_expired_enabled = setting.value as boolean;
            break;
          case 'admin_notifications_enabled':
            loadedSettings.admin_notifications_enabled = setting.value as boolean;
            break;
          case 'host_notifications_enabled':
            loadedSettings.host_notifications_enabled = setting.value as boolean;
            break;
        }
      });

      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const settingsToSave = [
        { key: 'campaign_emails_enabled', value: settings.campaign_emails_enabled, description: 'Enable campaign email notifications', category: 'notifications' },
        { key: 'campaign_expiring_days', value: settings.campaign_expiring_days, description: 'Days before expiry to send notification', category: 'notifications' },
        { key: 'campaign_expiring_enabled', value: settings.campaign_expiring_enabled, description: 'Enable expiring campaign notifications', category: 'notifications' },
        { key: 'campaign_expired_enabled', value: settings.campaign_expired_enabled, description: 'Enable expired campaign notifications', category: 'notifications' },
        { key: 'admin_notifications_enabled', value: settings.admin_notifications_enabled, description: 'Enable admin notifications for campaign events', category: 'notifications' },
        { key: 'host_notifications_enabled', value: settings.host_notifications_enabled, description: 'Enable host notifications for campaign events', category: 'notifications' }
      ];

      const { error } = await supabase
        .from('system_settings')
        .upsert(settingsToSave.map(s => ({
          key: s.key,
          value: s.value,
          description: s.description,
          category: s.category,
          updated_at: new Date().toISOString()
        })));

      if (error) throw error;

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    try {
      setTestResult({ status: 'pending', message: 'Sending test email...' });
      
      const success = await CampaignEmailService.sendTestEmail('active', testEmail);
      
      setTestResult({
        status: success ? 'success' : 'error',
        message: success ? 'Test email sent successfully!' : 'Failed to send test email'
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestResult({
        status: 'error',
        message: 'Error sending test email'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Email Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure email notification preferences for campaign status changes
          </p>
        </div>
      </div>

      {/* Main Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Email Notification Settings</h3>
          
          <div className="space-y-6">
            {/* Enable Campaign Emails */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Enable Campaign Email Notifications</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send email notifications for campaign status changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.campaign_emails_enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, campaign_emails_enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Expiring Campaign Settings */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Expiring Campaign Notifications</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">Enable Expiring Notifications</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Send notifications when campaigns are about to expire</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.campaign_expiring_enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, campaign_expiring_enabled: e.target.checked }))}
                      className="sr-only peer"
                      disabled={!settings.campaign_emails_enabled}
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!settings.campaign_emails_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Days before expiry:</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.campaign_expiring_days}
                    onChange={(e) => setSettings(prev => ({ ...prev, campaign_expiring_days: parseInt(e.target.value) || 7 }))}
                    disabled={!settings.campaign_emails_enabled || !settings.campaign_expiring_enabled}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Expired Campaign Settings */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Expired Campaign Notifications</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Enable Expired Notifications</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Send notifications when campaigns have expired</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.campaign_expired_enabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, campaign_expired_enabled: e.target.checked }))}
                    className="sr-only peer"
                    disabled={!settings.campaign_emails_enabled}
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!settings.campaign_emails_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>
            </div>

            {/* Recipient Settings */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Recipient Settings</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">Admin Notifications</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Send notifications to admins for rejections and expirations</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.admin_notifications_enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, admin_notifications_enabled: e.target.checked }))}
                      className="sr-only peer"
                      disabled={!settings.campaign_emails_enabled}
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!settings.campaign_emails_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">Host Notifications</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Send notifications to hosts when campaigns are approved or active</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.host_notifications_enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, host_notifications_enabled: e.target.checked }))}
                      className="sr-only peer"
                      disabled={!settings.campaign_emails_enabled}
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!settings.campaign_emails_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Email Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Test Email Configuration</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <input
                type="email"
                placeholder="Enter test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendTestEmail}
                disabled={!testEmail || !settings.campaign_emails_enabled}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Send Test Email
              </button>
            </div>
            
            {testResult && (
              <div className={`flex items-center text-sm ${
                testResult.status === 'success' 
                  ? 'text-green-600' 
                  : testResult.status === 'error'
                  ? 'text-red-600'
                  : 'text-yellow-600'
              }`}>
                {testResult.status === 'success' && <CheckCircle className="w-4 h-4 mr-2" />}
                {testResult.status === 'error' && <XCircle className="w-4 h-4 mr-2" />}
                {testResult.status === 'pending' && <Clock className="w-4 h-4 mr-2" />}
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
