import React, { useState, useEffect } from 'react';
import { AdminService, MarketingTool } from '../../services/adminService';
import RecentSalesNotification from './RecentSalesNotification';
import PopupMarketingTool from './PopupMarketingTool';
import BannerMarketing from './BannerMarketing';

export default function MarketingOverlays() {
  const [marketingTools, setMarketingTools] = useState<MarketingTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketingTools();
  }, []);

  const loadMarketingTools = async () => {
    try {
      setLoading(true);
      const toolsData = await AdminService.getMarketingTools();
      
      // Filter active tools that are currently valid
      const now = new Date();
      const activeTools = toolsData.filter(tool => 
        tool.is_active &&
        (!tool.start_date || new Date(tool.start_date) <= now) &&
        (!tool.end_date || new Date(tool.end_date) >= now)
      );
      
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

  const hasBanner = marketingTools.some(tool => tool.type === 'announcement_bar');
  const hasPopup = marketingTools.some(tool => tool.type === 'popup');
  const hasSalesNotification = marketingTools.some(tool => tool.type === 'sales_notification');

  return (
    <>
      {/* Banner Marketing - Always at the top */}
      {hasBanner && <BannerMarketing />}
      
      {/* Popup Marketing Tool - Overlay */}
      {hasPopup && <PopupMarketingTool />}
      
      {/* Recent Sales Notification - Bottom left - Always show for demo */}
      <RecentSalesNotification />
    </>
  );
}

