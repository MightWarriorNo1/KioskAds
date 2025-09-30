import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AdminService, MarketingTool } from '../../services/adminService';

interface BannerMarketingProps {
  className?: string;
}

export default function BannerMarketing({ className = '' }: BannerMarketingProps) {
  const [marketingTool, setMarketingTool] = useState<MarketingTool | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    loadMarketingTool();
  }, []);

  const loadMarketingTool = async () => {
    try {
      const tools = await AdminService.getMarketingTools();
      const bannerTool = tools.find(tool => 
        tool.type === 'announcement_bar' && 
        tool.is_active &&
        (!tool.start_date || new Date(tool.start_date) <= new Date()) &&
        (!tool.end_date || new Date(tool.end_date) >= new Date())
      );
      
      if (bannerTool) {
        setMarketingTool(bannerTool);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error loading marketing tool:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleCtaClick = () => {
    const settings = marketingTool?.settings as any;
    const ctaHref = settings?.cta?.href;
    if (ctaHref) {
      window.open(ctaHref, '_blank');
    }
  };

  if (!marketingTool || !isVisible) {
    return null;
  }

  const settings = marketingTool.settings as any;
  const position = settings?.position || 'top';

  return (
    <div 
      className={`fixed left-0 right-0 z-40 ${position === 'top' ? 'top-0' : 'bottom-0'} ${className}`}
      style={{
        backgroundColor: settings?.backgroundColor || '#4f46e5',
        color: settings?.textColor || '#ffffff',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {marketingTool.content}
              </p>
            </div>
            
            {settings?.cta?.label && !settings?.collectEmail && (
              <button
                onClick={handleCtaClick}
                className="px-4 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-colors"
              >
                {settings.cta.label}
              </button>
            )}

            {settings?.collectEmail && (
              <div className="flex items-center space-x-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-3 py-1.5 text-sm bg-white bg-opacity-20 placeholder-white placeholder-opacity-70 rounded-md border-0 focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  style={{ color: settings?.textColor || '#ffffff' }}
                />
                <button className="px-4 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-colors">
                  Subscribe
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            className="ml-4 text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-md p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


