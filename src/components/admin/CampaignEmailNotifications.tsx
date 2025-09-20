import React, { useState, useEffect } from 'react';
import { Mail, Send, Settings, TestTube, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { GmailService } from '../../services/gmailService';
import { CampaignEmailService } from '../../services/campaignEmailService';

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body_html: string;
  is_active: boolean;
}

interface EmailTestResult {
  status: 'success' | 'error' | 'pending';
  message: string;
}

export const CampaignEmailNotifications: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, EmailTestResult>>({});
  const [testEmail, setTestEmail] = useState('');
  const [gmailStatus, setGmailStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    loadTemplates();
    checkGmailStatus();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .like('type', 'campaign_%')
        .order('type');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGmailStatus = async () => {
    try {
      setGmailStatus('checking');
      const isConnected = await GmailService.testConnection();
      setGmailStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setGmailStatus('disconnected');
    }
  };

  const sendTestEmail = async (templateType: string) => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    try {
      setTestResults(prev => ({
        ...prev,
        [templateType]: { status: 'pending', message: 'Sending test email...' }
      }));

      const status = templateType.replace('campaign_', '') as 'approved' | 'rejected' | 'active' | 'expiring' | 'expired' | 'paused' | 'resumed';
      const success = await CampaignEmailService.sendTestEmail(status, testEmail);

      setTestResults(prev => ({
        ...prev,
        [templateType]: {
          status: success ? 'success' : 'error',
          message: success ? 'Test email sent successfully!' : 'Failed to send test email'
        }
      }));
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestResults(prev => ({
        ...prev,
        [templateType]: {
          status: 'error',
          message: 'Error sending test email'
        }
      }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'campaign_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'campaign_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'campaign_active':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'campaign_expiring':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'campaign_expired':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'campaign_paused':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'campaign_resumed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Mail className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (type: string) => {
    switch (type) {
      case 'campaign_approved':
        return 'Campaign Approved';
      case 'campaign_rejected':
        return 'Campaign Rejected';
      case 'campaign_active':
        return 'Campaign Active';
      case 'campaign_expiring':
        return 'Campaign Expiring Soon';
      case 'campaign_expired':
        return 'Campaign Expired';
      case 'campaign_paused':
        return 'Campaign Paused';
      case 'campaign_resumed':
        return 'Campaign Resumed';
      default:
        return type;
    }
  };

  const getGmailStatusColor = () => {
    switch (gmailStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50';
      case 'disconnected':
        return 'text-red-600 bg-red-50';
      case 'checking':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Email Notifications</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage email notifications for campaign status changes
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getGmailStatusColor()}`}>
            Gmail: {gmailStatus === 'checking' ? 'Checking...' : gmailStatus}
          </div>
        </div>
      </div>

      {/* Test Email Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Test Email Configuration</h3>
        <div className="flex items-center space-x-4">
          <input
            type="email"
            placeholder="Enter test email address"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={checkGmailStatus}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <Settings className="w-4 h-4 mr-2 inline" />
            Check Gmail
          </button>
        </div>
      </div>

      {/* Email Templates */}
      <div className="grid gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(template.type)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getStatusLabel(template.type)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {template.subject}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    template.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Template Preview */}
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Email Preview:</h4>
                <div 
                  className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: template.body_html }}
                />
              </div>

              {/* Test Email Section */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => sendTestEmail(template.type)}
                    disabled={!testEmail || gmailStatus !== 'connected'}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Send Test Email
                  </button>
                  {testResults[template.type] && (
                    <div className={`flex items-center text-sm ${
                      testResults[template.type].status === 'success' 
                        ? 'text-green-600' 
                        : testResults[template.type].status === 'error'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {testResults[template.type].status === 'success' && <CheckCircle className="w-4 h-4 mr-1" />}
                      {testResults[template.type].status === 'error' && <XCircle className="w-4 h-4 mr-1" />}
                      {testResults[template.type].status === 'pending' && <Clock className="w-4 h-4 mr-1" />}
                      {testResults[template.type].message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">How It Works</h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>• <strong>Campaign Approved:</strong> Sent when an admin approves a campaign</p>
          <p>• <strong>Campaign Rejected:</strong> Sent when an admin rejects a campaign</p>
          <p>• <strong>Campaign Active:</strong> Sent when a campaign becomes active</p>
          <p>• <strong>Campaign Expiring Soon:</strong> Sent 7 days before campaign end date</p>
          <p>• <strong>Campaign Expired:</strong> Sent when a campaign reaches its end date</p>
          <p>• <strong>Campaign Paused:</strong> Sent when a campaign is paused</p>
          <p>• <strong>Campaign Resumed:</strong> Sent when a paused campaign is resumed</p>
        </div>
        <div className="mt-4 text-sm text-blue-700 dark:text-blue-300">
          <p><strong>Recipients:</strong> Campaign owner (client), relevant hosts, and admins (for rejections/expirations)</p>
        </div>
      </div>
    </div>
  );
};
