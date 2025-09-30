import React, { useState, useEffect } from 'react';
import { AdminService, MarketingTool, Testimonial } from '../../services/adminService';
import RecentSalesNotification from './RecentSalesNotification';
import PopupMarketingTool from './PopupMarketingTool';
import TestimonialsSlider from './TestimonialsSlider';
import BannerMarketing from './BannerMarketing';

interface MarketingToolsManagerProps {
  className?: string;
}

export default function MarketingToolsManager({ className = '' }: MarketingToolsManagerProps) {
  const [marketingTools, setMarketingTools] = useState<MarketingTool[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketingData();
  }, []);

  const loadMarketingData = async () => {
    try {
      setLoading(true);
      const [toolsData, testimonialsData] = await Promise.all([
        AdminService.getMarketingTools(),
        AdminService.getTestimonials()
      ]);
      
      // Filter active tools that are currently valid
      const now = new Date();
      const activeTools = toolsData.filter(tool => 
        tool.is_active &&
        (!tool.start_date || new Date(tool.start_date) <= now) &&
        (!tool.end_date || new Date(tool.end_date) >= now)
      );
      
      const activeTestimonials = testimonialsData.filter(testimonial => testimonial.is_active);
      
      setMarketingTools(activeTools);
      setTestimonials(activeTestimonials);
    } catch (error) {
      console.error('Error loading marketing data:', error);
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
  const hasTestimonials = testimonials.length > 0;

  return (
    <div className={className}>
      {/* Testimonials Slider - In the main content area */}
      {hasTestimonials && (
        <div className="mb-8">
          <TestimonialsSlider />
        </div>
      )}
    </div>
  );
}
