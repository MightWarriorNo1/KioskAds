import { useState, useEffect } from 'react';
import { AdminService, MarketingTool } from '../../services/adminService';
import RecentSalesNotification from './RecentSalesNotification';
import PopupMarketingTool from './PopupMarketingTool';

export default function MarketingOverlays() {
  const [marketingTools, setMarketingTools] = useState<MarketingTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketingTools();
  }, []);

  const loadMarketingTools = async () => {
    try {
      setLoading(true);
      console.log('MarketingOverlays: Loading marketing tools...');
      const toolsData = await AdminService.getMarketingTools();
      console.log('MarketingOverlays: All marketing tools:', toolsData);
      
      // Filter active tools that are currently valid
      const now = new Date();
      const activeTools = toolsData.filter(tool => 
        tool.is_active &&
        (!tool.start_date || new Date(tool.start_date) <= now) &&
        (!tool.end_date || new Date(tool.end_date) >= now)
      );
      
      console.log('MarketingOverlays: Active tools:', activeTools);
      setMarketingTools(activeTools);
    } catch (error) {
      console.error('Error loading marketing tools:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  const hasPopup = marketingTools.some(tool => tool.type === 'popup');
  console.log('MarketingOverlays: hasPopup:', hasPopup, 'marketingTools:', marketingTools);

  return (
    <>
      {/* Popup Marketing Tool - Overlay - Always show, component handles demo fallback */}
      <PopupMarketingTool />
      
      {/* Recent Sales Notification - Bottom left - Always show for demo */}
      <RecentSalesNotification />
    </>
  );
}

