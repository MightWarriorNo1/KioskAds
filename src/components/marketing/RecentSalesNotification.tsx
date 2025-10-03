import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AdminService, MarketingTool } from '../../services/adminService';
import { BillingService } from '../../services/billingService';

interface RecentSalesNotificationProps {
  onClose?: () => void;
}

interface SaleNotification {
  id: string;
  customerName: string;
  location: string;
  amount: number;
  timeAgo: string;
  campaignName: string;
  profilePicture?: string;
}

export default function RecentSalesNotification({}: RecentSalesNotificationProps) {
  const [marketingTool, setMarketingTool] = useState<MarketingTool | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayedSales, setDisplayedSales] = useState<SaleNotification[]>([]);
  const [closingSales, setClosingSales] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('RecentSalesNotification: Component mounted');
    loadMarketingTool();
    loadRecentSales();
    
    // Cleanup function to prevent multiple calls
    return () => {
      console.log('RecentSalesNotification: Component unmounting');
      setDisplayedSales([]);
      setClosingSales(new Set());
    };
  }, []);

  const loadMarketingTool = async () => {
    try {
      const tools = await AdminService.getMarketingTools();
      const salesNotification = tools.find(tool => 
        tool.type === 'sales_notification' && 
        tool.is_active &&
        (!tool.start_date || new Date(tool.start_date) <= new Date()) &&
        (!tool.end_date || new Date(tool.end_date) >= new Date())
      );
      
      if (salesNotification) {
        console.log('RecentSalesNotification: Found active sales notification tool');
        setMarketingTool(salesNotification);
        const delay = (salesNotification.settings as any)?.displayDelay || 5;
        setTimeout(() => setIsVisible(true), delay * 1000);
      } else {
        console.log('RecentSalesNotification: No active sales notification tool, showing demo');
        // Show demo version if no marketing tool is configured
        setMarketingTool({
          id: 'demo',
          type: 'sales_notification',
          title: 'Recent Sales',
          content: 'Recent sales notifications',
          settings: {
            displayDelay: 3,
            duration: 5,
            showProfilePicture: true,
            showLocation: true,
            timeFrame: 'all'
          },
          is_active: true,
          priority: 0,
          target_audience: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as MarketingTool);
        setTimeout(() => {
          console.log('RecentSalesNotification: Setting demo visible');
          setIsVisible(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error loading marketing tool:', error);
      // Show demo version on error
      setMarketingTool({
        id: 'demo',
        type: 'sales_notification',
        title: 'Recent Sales',
        content: 'Recent sales notifications',
        settings: {
          displayDelay: 3,
          duration: 5,
          showProfilePicture: true,
          showLocation: true,
          timeFrame: 'all'
        },
        is_active: true,
        priority: 0,
        target_audience: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as MarketingTool);
      setTimeout(() => {
        console.log('RecentSalesNotification: Setting error demo visible');
        setIsVisible(true);
      }, 1000);
    }
  };

  const loadRecentSales = async () => {
    if (isLoading) {
      console.log('RecentSalesNotification: Already loading, skipping');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('RecentSalesNotification: Loading recent sales data');
      // Try public method first, fallback to regular method
      const recentSales = await BillingService.getPublicRecentSales(1);
      
      if (recentSales.length === 0) {
        console.log('RecentSalesNotification: No recent sales found, not showing notification');
        setDisplayedSales([]);
        return;
      }

      const salesData: SaleNotification[] = recentSales.map(sale => ({
        id: sale.id,
        customerName: formatUserName(sale.user.full_name),
        location: sale.user.company_name || 'Unknown Location',
        amount: sale.amount,
        timeAgo: formatTimeAgo(sale.payment_date),
        campaignName: formatCampaignName(sale.campaign.name),
        profilePicture: undefined // We don't store profile pictures in the database
      }));
      
      console.log('RecentSalesNotification: Loaded real sales data', salesData);
      
      // Start showing individual notifications (limit to 1)
      if (salesData.length > 0) {
        const limitedSalesData = salesData.slice(0, 1);
        console.log('RecentSalesNotification: Limiting to 1 sale', limitedSalesData);
        startNotificationSequence(limitedSalesData);
      }
    } catch (error) {
      console.error('Error loading recent sales:', error);
      // Don't show notification if there's an error loading real data
      setDisplayedSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNotificationSequence = (salesData: SaleNotification[]) => {
    const settings = marketingTool?.settings as any;
    const delay = settings?.displayDelay || 3; // 3 seconds delay before showing notifications
    
    // Ensure we only show maximum 1 notification
    const limitedSalesData = salesData.slice(0, 1);
    console.log('RecentSalesNotification: Starting sequence with', limitedSalesData.length, 'notification');
    
    // Clear any existing displayed sales first
    setDisplayedSales([]);
    
    // Show all notifications at once after delay
    setTimeout(() => {
      console.log('RecentSalesNotification: Setting displayed sales to', limitedSalesData.length, 'items');
      setDisplayedSales(limitedSalesData);
    }, delay * 1000);
  };

  const formatUserName = (fullName: string) => {
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
    return `${firstName} ${lastName}`;
  };

  const formatCampaignName = (campaignName: string) => {
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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const paymentDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return paymentDate.toLocaleDateString();
  };


  // Remove the cycling effect - we want to show 1 record at once

  const handleCloseSale = (saleId: string) => {
    // Add to closing set to trigger slide-out animation
    setClosingSales(prev => new Set(prev).add(saleId));
    
    // Remove from displayed sales after animation completes
    setTimeout(() => {
      setDisplayedSales(prev => prev.filter(sale => sale.id !== saleId));
      setClosingSales(prev => {
        const newSet = new Set(prev);
        newSet.delete(saleId);
        return newSet;
      });
    }, 300); // Match the animation duration
  };

  console.log('RecentSalesNotification: Render check', { 
    marketingTool: !!marketingTool, 
    displayedSales: displayedSales.length, 
    isVisible 
  });

  if (!marketingTool || displayedSales.length === 0) {
    console.log('RecentSalesNotification: Missing data, not rendering');
    return null;
  }

  if (!isVisible) {
    console.log('RecentSalesNotification: Not visible yet');
    return null;
  }

  console.log('RecentSalesNotification: Rendering notifications');

  const settings = marketingTool.settings as any;
  const showProfilePicture = settings?.showProfilePicture !== false;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] space-y-3" style={{ zIndex: 9999 }}>
      {displayedSales.map((sale, index) => (
        <div
          key={sale.id}
          className={`${
            closingSales.has(sale.id) 
              ? 'animate-slide-out-left' 
              : 'animate-slide-in-left-bounce'
          } bg-white rounded-lg shadow-lg border border-gray-200 p-4 transform transition-all duration-500 ease-out max-w-sm hover:shadow-xl hover:scale-105`}
        style={{
          backgroundColor: settings?.backgroundColor || '#ffffff',
          color: settings?.textColor || '#000000',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            animationDelay: closingSales.has(sale.id) ? '0s' : `${index * 0.2}s`,
        }}
      >
        <div className="flex items-start space-x-3">
            {showProfilePicture && sale.profilePicture && (
            <img
                src={sale.profilePicture}
                alt={sale.customerName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          )}
            {!showProfilePicture && (
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-green-600">
                  {sale.customerName.charAt(0)}
                </span>
              </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium">
                  {sale.customerName} from {sale.location}
              </span>
            </div>
            <div className="text-sm text-gray-600 mb-1">
              just purchased
            </div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                {sale.campaignName}
            </div>
            <div className="text-xs text-gray-500">
                {sale.timeAgo}
            </div>
          </div>
          <button
              onClick={() => handleCloseSale(sale.id)}
            className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      ))}
    </div>
  );
}

