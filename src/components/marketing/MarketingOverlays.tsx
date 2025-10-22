import { useState, useEffect } from 'react';
import { AdminService, MarketingTool } from '../../services/adminService';
import RecentSalesNotification from './RecentSalesNotification';
import PopupMarketingTool from './PopupMarketingTool';

export default function MarketingOverlays() {
  const [activePopupTool, setActivePopupTool] = useState<MarketingTool | null>(null);
  const [activeSalesNotificationTool, setActiveSalesNotificationTool] = useState<MarketingTool | null>(null);
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
      
      // Debug each tool individually
      toolsData.forEach((tool, index) => {
        console.log(`MarketingOverlays: Tool ${index}:`, {
          id: tool.id,
          type: tool.type,
          title: tool.title,
          is_active: tool.is_active,
          start_date: tool.start_date,
          end_date: tool.end_date,
          priority: tool.priority
        });
      });
      
      // Filter active tools that are currently valid
      const now = new Date();
      const activeTools = toolsData.filter(tool => {
        const isActive = tool.is_active;
        const startDateValid = !tool.start_date || new Date(tool.start_date) <= now;
        const endDateValid = !tool.end_date || new Date(tool.end_date) >= now;
        
        console.log(`MarketingOverlays: Tool ${tool.id} filtering:`, {
          isActive,
          startDateValid,
          endDateValid,
          startDate: tool.start_date,
          endDate: tool.end_date,
          now: now.toISOString()
        });
        
        return isActive && startDateValid && endDateValid;
      });
      
      console.log('MarketingOverlays: Active tools after filtering:', activeTools);
      
      // Find specific active tools
      const popupTool = activeTools.find(tool => tool.type === 'popup');
      const salesNotificationTool = activeTools.find(tool => tool.type === 'sales_notification');
      
      setActivePopupTool(popupTool || null);
      setActiveSalesNotificationTool(salesNotificationTool || null);
      
      console.log('MarketingOverlays: Active popup tool:', popupTool);
      console.log('MarketingOverlays: Active sales notification tool:', salesNotificationTool);
    } catch (error) {
      console.error('Error loading marketing tools:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <>
      {/* Popup Marketing Tool - Only render if there is an active popup tool */}
      {activePopupTool && <PopupMarketingTool marketingTool={activePopupTool} />}
      
      {/* Recent Sales Notification - Only render if there is an active sales notification tool */}
      {activeSalesNotificationTool && <RecentSalesNotification marketingTool={activeSalesNotificationTool} />}
    </>
  );
}

