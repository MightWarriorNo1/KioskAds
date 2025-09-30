import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AdminService, MarketingTool } from '../../services/adminService';

interface RecentSalesNotificationProps {
  onClose?: () => void;
}

interface SaleNotification {
  id: string;
  customerName: string;
  location: string;
  amount: number;
  timeAgo: string;
  profilePicture?: string;
}

export default function RecentSalesNotification({ onClose }: RecentSalesNotificationProps) {
  const [marketingTool, setMarketingTool] = useState<MarketingTool | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSale, setCurrentSale] = useState<SaleNotification | null>(null);
  const [sales, setSales] = useState<SaleNotification[]>([]);

  useEffect(() => {
    console.log('RecentSalesNotification: Component mounted');
    loadMarketingTool();
    generateMockSales();
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

  const generateMockSales = () => {
    const mockSales: SaleNotification[] = [
      {
        id: '1',
        customerName: 'Anna',
        location: 'Montreal',
        amount: 149.99,
        timeAgo: 'Today',
        profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face'
      },
      {
        id: '2',
        customerName: 'Tom',
        location: 'New York',
        amount: 89.50,
        timeAgo: '3 days ago',
        profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face'
      },
      {
        id: '3',
        customerName: 'Sara',
        location: 'Paris',
        amount: 299.00,
        timeAgo: '2 months ago',
        profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face'
      },
      {
        id: '4',
        customerName: 'Mike',
        location: 'London',
        amount: 75.25,
        timeAgo: '1 week ago',
        profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
      },
      {
        id: '5',
        customerName: 'Emma',
        location: 'Tokyo',
        amount: 199.99,
        timeAgo: '2 weeks ago',
        profilePicture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face'
      }
    ];
    
    setSales(mockSales);
    setCurrentSale(mockSales[0]);
  };

  useEffect(() => {
    if (!marketingTool || !isVisible) return;

    const duration = (marketingTool.settings as any)?.duration || 5;
    const interval = setInterval(() => {
      setCurrentSale(prev => {
        const currentIndex = sales.findIndex(sale => sale.id === prev?.id);
        const nextIndex = (currentIndex + 1) % sales.length;
        return sales[nextIndex];
      });
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [marketingTool, isVisible, sales]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  console.log('RecentSalesNotification: Render check', { 
    marketingTool: !!marketingTool, 
    currentSale: !!currentSale, 
    isVisible 
  });

  if (!marketingTool || !currentSale) {
    console.log('RecentSalesNotification: Missing data, not rendering');
    return null;
  }

  if (!isVisible) {
    console.log('RecentSalesNotification: Not visible yet');
    return null;
  }

  console.log('RecentSalesNotification: Rendering notification');

  const settings = marketingTool.settings as any;
  const showProfilePicture = settings?.showProfilePicture !== false;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] max-w-sm" style={{ zIndex: 9999 }}>
      <div 
        className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 transform transition-all duration-300 ease-in-out"
        style={{
          backgroundColor: settings?.backgroundColor || '#ffffff',
          color: settings?.textColor || '#000000',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="flex items-start space-x-3">
          {showProfilePicture && currentSale.profilePicture && (
            <img
              src={currentSale.profilePicture}
              alt={currentSale.customerName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium">
                {currentSale.customerName} from {currentSale.location}
              </span>
            </div>
            <div className="text-sm text-gray-600 mb-1">
              just purchased
            </div>
            <div className="text-xs text-gray-500">
              {currentSale.timeAgo}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

