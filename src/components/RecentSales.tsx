import { useState, useEffect, useCallback } from 'react';
import { BillingService, RecentSale } from '../services/billingService';
import { useNotification } from '../contexts/NotificationContext';
import Card from './ui/Card';
import { ShoppingCart, Clock, RefreshCw } from 'lucide-react';
import { getCurrentCaliforniaTime, formatCaliforniaDate } from '../utils/dateUtils';

interface RecentSalesProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export default function RecentSales({ 
  limit = 3, 
  showHeader = true, 
  className = '' 
}: RecentSalesProps) {
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addNotification } = useNotification();

  const loadRecentSales = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      // Try public method first, fallback to regular method
      const sales = await BillingService.getPublicRecentSales(limit);
      setRecentSales(sales);
    } catch (error) {
      console.error('Error loading recent sales:', error);
      addNotification('error', 'Error', 'Failed to load recent sales');
      // Set empty array on error to show "no sales" state
      setRecentSales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit, addNotification]);

  useEffect(() => {
    loadRecentSales();
  }, [loadRecentSales]);

  const handleRefresh = () => {
    loadRecentSales(true);
  };

  const formatUserName = (fullName: string, address?: string) => {
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
    
    if (address) {
      return `${firstName} ${lastName} from ${address}`;
    }
    
    // If no address, just show the name
    return `${firstName} ${lastName}`;
  };

  const formatCampaignName = (campaignName: string) => {
    // Map campaign names to more user-friendly display names
    const campaignMappings: { [key: string]: string } = {
      'Vertical Ad Creation': 'Vertical Ad Creation',
      'Vertical Ad Creation - Photo': 'Vertical Ad Creation - Photo',
      'Vertical Ad Creation - Video': 'Vertical Ad Creation - Video',
      '1 Week Ad Campaign': '1 Week Ad Campaign',
      '1 Month Ad Campaign': '1 Month Ad Campaign',
      'Custom Ad Campaign': 'Custom Ad Campaign',
      'Premium Ad Package': 'Premium Ad Package'
    };

    return campaignMappings[campaignName] || campaignName;
  };

  const formatCustomAdName = (customAdName: string) => {
    // Custom ad names are already formatted correctly from the service
    return customAdName;
  };

  const getDisplayName = (sale: RecentSale) => {
    // Handle campaign payments
    if (sale.payment_type === 'campaign' && sale.campaign) {
      return formatCampaignName(sale.campaign.name);
    } 
    // Handle custom ad payments
    else if (sale.payment_type === 'custom_ad' && sale.custom_ad) {
      return formatCustomAdName(sale.custom_ad.name);
    }
    // Fallback: try to get name from description or use a generic name
    else if (sale.description) {
      return sale.description;
    }
    // Last resort: use payment type to create a meaningful name
    else if (sale.payment_type === 'campaign') {
      return 'Ad Campaign';
    }
    else if (sale.payment_type === 'custom_ad') {
      return 'Custom Ad Service';
    }
    // Final fallback
    return 'Ad Service';
  };

  const formatTimeAgo = (dateString: string) => {
    const now = getCurrentCaliforniaTime();
    const paymentDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return formatCaliforniaDate(paymentDate);
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        {showHeader && (
          <div className="flex items-center mb-6">
            <ShoppingCart className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sales</h3>
          </div>
        )}
        <div className="space-y-4">
          {[...Array(limit)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (recentSales.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        {showHeader && (
          <div className="flex items-center mb-6">
            <ShoppingCart className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sales</h3>
          </div>
        )}
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No recent sales to display</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <ShoppingCart className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sales</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            title="Refresh recent sales"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        {recentSales.map((sale) => (
          <div key={sale.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatUserName(sale.user.full_name, sale.user.address)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">just purchased</span>
              </div>
              
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {getDisplayName(sale)}
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeAgo(sale.payment_date)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ${sale.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
