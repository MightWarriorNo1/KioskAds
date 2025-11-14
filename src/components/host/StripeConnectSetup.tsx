import React, { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, AlertCircle, Loader2, CreditCard, DollarSign, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { StripeConnectService } from '../../services/stripeConnectService';
import { supabase } from '../../lib/supabaseClient';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface StripeConnectSetupProps {
  onSetupComplete?: () => void;
}

export default function StripeConnectSetup({ onSetupComplete }: StripeConnectSetupProps) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasAccountId, setHasAccountId] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccountStatus = async () => {
      if (!user?.id) return;
      
      try {
        const enabled = await StripeConnectService.isStripeConnectEnabled(user.id);
        setIsEnabled(enabled);
        
        // Check if user has a Stripe Connect account ID (even if not fully enabled)
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_connect_account_id')
          .eq('id', user.id)
          .single();
        
        setHasAccountId(!!profile?.stripe_connect_account_id);
        
        if (enabled || profile?.stripe_connect_account_id) {
          try {
            const status = await StripeConnectService.getAccountStatus(user.id);
            setAccountStatus(status);
          } catch (statusError: any) {
            // Handle case where account doesn't exist or is invalid
            // This can happen if the Stripe account was deleted, revoked, or is invalid
            console.warn('Could not retrieve Stripe account status:', statusError);
            // Clear the account ID if it's invalid
            const errorMessage = statusError?.message || '';
            if (statusError?.status === 404 ||
                errorMessage.includes('not found') || 
                errorMessage.includes('deleted') ||
                errorMessage.includes('access has been revoked') ||
                errorMessage.includes('does not have access to account') ||
                errorMessage.includes('account no longer exists')) {
              setHasAccountId(false);
              setAccountStatus(null);
              // Optionally show a notification to the user
              if (errorMessage.includes('access has been revoked') || 
                  errorMessage.includes('does not have access')) {
                addNotification('warning', 'Stripe Connect Disconnected', 
                  'Your Stripe Connect account has been disconnected. Please set it up again to receive payouts.');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking account status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAccountStatus();
  }, [user?.id]);

  const handleConnectStripe = async () => {
    if (!user?.id) return;
    
    setIsConnecting(true);
    
    try {
      const { url } = await StripeConnectService.createAccountLink(
        user.id,
        `${window.location.origin}/host/payouts?setup=complete`,
        `${window.location.origin}/host/payouts?setup=complete`
      );
      
      // Open in same window to handle redirect properly
      window.location.href = url;
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      addNotification('error', 'Setup Failed', 'Failed to setup Stripe Connect. Please try again.');
      setIsConnecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
            <AlertCircle className="h-3 w-3 mr-1" />
            Incomplete
          </span>
        );
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Checking Stripe Connect status...</span>
        </div>
      </Card>
    );
  }

  if ((isEnabled && accountStatus?.details_submitted) || hasAccountId) {
    return (
      <Card className="p-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-200">
                {accountStatus?.details_submitted ? 'Stripe Connect Active' : 'Stripe Connect Setup In Progress'}
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {accountStatus?.details_submitted 
                  ? 'Your account is set up and ready to receive payouts'
                  : 'Please complete the Stripe Connect onboarding process to enable payouts'
                }
              </p>
            </div>
          </div>
          {getStatusBadge(accountStatus?.details_submitted ? 'completed' : 'pending')}
        </div>
        
        {accountStatus && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Charges: {accountStatus.charges_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Payouts: {accountStatus.payouts_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Country: {accountStatus.country?.toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        {hasAccountId && !accountStatus?.details_submitted && (
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleConnectStripe}
              disabled={isConnecting}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/20"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Continuing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Continue Setup
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-medium text-orange-800 dark:text-orange-200">Stripe Connect Setup Required</h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Set up Stripe Connect to receive automatic payouts from your ad revenue. This secure process takes just a few minutes.
            </p>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                <CheckCircle className="h-4 w-4" />
                <span>Secure payment processing</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                <CheckCircle className="h-4 w-4" />
                <span>Automatic weekly/monthly payouts</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                <CheckCircle className="h-4 w-4" />
                <span>Direct deposit to your bank account</span>
              </div>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleConnectStripe}
          disabled={isConnecting}
          className="ml-4"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Setup Stripe Connect
            </>
          )}
        </Button>
      </div>
      
      {accountStatus && !accountStatus.details_submitted && (
        <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Setup Incomplete:</strong> Please complete the Stripe Connect onboarding process to enable payouts.
          </p>
        </div>
      )}
    </Card>
  );
}
