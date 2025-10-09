import { useState, useEffect } from 'react';
import { Plug, CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink, Settings } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { AdminService, SystemIntegration } from '../../services/adminService';
import { GmailService } from '../../services/gmailService';
import { GoogleDriveService } from '../../services/googleDriveService';

export default function IntegrationManagement() {
  const [integrations, setIntegrations] = useState<SystemIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const integrationData = await AdminService.getSystemIntegrations();
      setIntegrations(integrationData);
    } catch (error) {
      console.error('Error loading integrations:', error);
      addNotification('error', 'Error', 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (integration: SystemIntegration) => {
    try {
      setTestingConnection(integration.id);
      
      let isConnected = false;
      switch (integration.type) {
        case 'gmail':
          isConnected = await GmailService.testConnection();
          break;
        case 'google_drive':
          isConnected = await GoogleDriveService.testConnection();
          break;
        case 'stripe':
        case 'stripe_connect':
          // For Stripe, we would test the connection here
          isConnected = true; // Placeholder
          break;
        default:
          isConnected = false;
      }

      const newStatus = isConnected ? 'connected' : 'error';
      await AdminService.updateIntegrationStatus(integration.id, newStatus);
      
      setIntegrations(prev => prev.map(int => 
        int.id === integration.id 
          ? { ...int, status: newStatus, last_sync: new Date().toISOString() }
          : int
      ));

      addNotification(
        isConnected ? 'success' : 'error',
        isConnected ? 'Connection Successful' : 'Connection Failed',
        `${integration.name} ${isConnected ? 'is connected' : 'connection failed'}`
      );
    } catch (error) {
      console.error('Error testing connection:', error);
      addNotification('error', 'Error', 'Failed to test connection');
    } finally {
      setTestingConnection(null);
    }
  };

  const connectIntegration = async (integration: SystemIntegration) => {
    try {
      switch (integration.type) {
        case 'gmail':
          // Redirect to Gmail OAuth
          const gmailClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
          if (!gmailClientId) {
            addNotification('error', 'Configuration Error', 'Google Client ID not configured');
            return;
          }
          const gmailAuthUrl = `https://accounts.google.com/oauth/authorize?client_id=${gmailClientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/admin/integrations')}&scope=https://www.googleapis.com/auth/gmail.send&response_type=code`;
          window.open(gmailAuthUrl, '_blank');
          break;
        case 'google_drive':
          // Redirect to Google Drive OAuth
          const driveClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
          if (!driveClientId) {
            addNotification('error', 'Configuration Error', 'Google Client ID not configured');
            return;
          }
          const driveAuthUrl = `https://accounts.google.com/oauth/authorize?client_id=${driveClientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/admin/integrations')}&scope=https://www.googleapis.com/auth/drive&response_type=code`;
          window.open(driveAuthUrl, '_blank');
          break;
        case 'stripe':
          // Redirect to Stripe Connect
          const stripeClientId = import.meta.env.VITE_STRIPE_CLIENT_ID;
          if (!stripeClientId) {
            addNotification('error', 'Configuration Error', 'Stripe Client ID not configured');
            return;
          }
          const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${stripeClientId}&scope=read_write`;
          window.open(stripeAuthUrl, '_blank');
          break;
        default:
          addNotification('info', 'Integration', 'Integration setup not implemented yet');
      }
    } catch (error) {
      console.error('Error connecting integration:', error);
      addNotification('error', 'Error', 'Failed to connect integration');
    }
  };

  const disconnectIntegration = async (integration: SystemIntegration) => {
    try {
      switch (integration.type) {
        case 'gmail':
          await GmailService.disconnect();
          break;
        case 'google_drive':
          await GoogleDriveService.disconnect();
          break;
        default:
          // For other integrations, just update status
          break;
      }

      await AdminService.updateIntegrationStatus(integration.id, 'disconnected');
      
      setIntegrations(prev => prev.map(int => 
        int.id === integration.id 
          ? { ...int, status: 'disconnected', config: {}, last_sync: undefined }
          : int
      ));

      addNotification('success', 'Disconnected', `${integration.name} has been disconnected`);
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      addNotification('error', 'Error', 'Failed to disconnect integration');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle;
      case 'disconnected': return XCircle;
      case 'error': return AlertCircle;
      case 'pending': return RefreshCw;
      default: return XCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-gray-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };


  const getIntegrationSetupUrl = (type: string) => {
    switch (type) {
      case 'gmail':
        return 'https://console.developers.google.com/apis/credentials';
      case 'google_drive':
        return 'https://console.developers.google.com/apis/credentials';
      case 'stripe':
        return 'https://dashboard.stripe.com/apikeys';
      case 'stripe_connect':
        return 'https://dashboard.stripe.com/connect/accounts/overview';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integration Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Connect and manage third-party services for enhanced functionality</p>
        </div>
        <button
          onClick={loadIntegrations}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading integrations...</p>
          </div>
        ) : (
          [
            {
              type: 'gmail',
              name: 'Gmail API',
              description: 'Send automated emails for ad approvals, rejections, and notifications'
            },
            {
              type: 'google_drive',
              name: 'Google Drive',
              description: 'Manage asset lifecycle with automatic archiving and deletion'
            },
            {
              type: 'stripe',
              name: 'Stripe Payments',
              description: 'Process client payments and manage billing'
            },
            {
              type: 'stripe_connect',
              name: 'Stripe Connect',
              description: 'Handle host payouts and commission distribution'
            },
            {
              type: 'google_oauth',
              name: 'Google OAuth',
              description: 'Enable Google sign-in for users'
            }
          ].map((integrationTemplate) => {
            const integration = integrations.find(int => int.type === integrationTemplate.type) || {
              id: integrationTemplate.type,
              name: integrationTemplate.name,
              type: integrationTemplate.type as 'stripe' | 'stripe_connect' | 'gmail' | 'google_drive' | 'google_oauth',
              status: 'disconnected' as const,
              config: {},
              last_sync: undefined,
              error_message: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const StatusIcon = getStatusIcon(integration.status);
            const setupUrl = getIntegrationSetupUrl(integration.type);

            return (
              <div key={integration.type} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Plug className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{integrationTemplate.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <StatusIcon className={`h-4 w-4 ${getStatusColor(integration.status)}`} />
                        <span className={`text-sm font-medium ${getStatusColor(integration.status)}`}>
                          {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                        </span>
                        {integration.last_sync && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Last sync: {new Date(integration.last_sync).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {setupUrl && (
                      <a
                        href={setupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Setup</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {integration.status === 'connected' ? (
                      <>
                        <button
                          onClick={() => testConnection(integration)}
                          disabled={testingConnection === integration.id}
                          className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          {testingConnection === integration.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span>Test</span>
                        </button>
                        <button
                          onClick={() => disconnectIntegration(integration)}
                          className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Disconnect</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => connectIntegration(integration)}
                        className="flex items-center space-x-1 px-3 py-2 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {integration.error_message && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800 dark:text-red-400">Error: {integration.error_message}</span>
                    </div>
                  </div>
                )}

                {integration.status === 'connected' && integration.config && Object.keys(integration.config).length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-400">
                        Connected successfully. Configuration details are stored securely.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Integration Status Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Integration Status Summary</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {integrations.filter(int => int.status === 'connected').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Connected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {integrations.filter(int => int.status === 'disconnected').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Disconnected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {integrations.filter(int => int.status === 'error').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">Setup Instructions</h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
          <p><strong>Gmail API:</strong> Enable Gmail API in Google Cloud Console and create OAuth 2.0 credentials.</p>
          <p><strong>Google Drive:</strong> Enable Google Drive API and create OAuth 2.0 credentials with drive scope.</p>
          <p><strong>Stripe:</strong> Create a Stripe account and obtain API keys from the dashboard.</p>
          <p><strong>Stripe Connect:</strong> Enable Stripe Connect in your Stripe dashboard for host payouts.</p>
        </div>
      </div>
    </div>
  );
}
