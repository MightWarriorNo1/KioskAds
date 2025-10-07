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
        padding: `${settings?.padding || 12}px 0`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between relative min-h-[44px]">
          {/* Close button positioned absolutely on the right */}
          <button
            onClick={handleClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-md p-1 transition-colors flex-shrink-0 z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Main content area with proper mobile handling */}
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pr-8 sm:pr-12">
            {/* Text content */}
            <div className="flex-1 min-w-0">
              <p 
                className="font-medium text-center sm:text-left"
                style={{ fontSize: `${settings?.fontSize || 14}px` }}
              >
                {marketingTool.content}
              </p>
            </div>
            
            {/* CTA or Email form */}
            <div className="flex-shrink-0">
              {settings?.cta?.label && !settings?.collectEmail && (
                <button
                  onClick={handleCtaClick}
                  className="px-4 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md font-medium transition-colors whitespace-nowrap"
                  style={{ fontSize: `${settings?.fontSize || 14}px` }}
                >
                  {settings.cta.label}
                </button>
              )}

              {settings?.collectEmail && (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="px-3 py-1.5 rounded-md border-0 focus:ring-2 focus:ring-white focus:ring-opacity-50 w-full sm:w-auto min-w-[200px]"
                    style={{ 
                      backgroundColor: settings?.emailInputBackgroundColor || 'rgba(255, 255, 255, 0.2)',
                      color: settings?.emailInputTextColor || settings?.textColor || '#ffffff',
                      fontSize: `${settings?.fontSize || 14}px`,
                      '::placeholder': { color: 'rgba(255, 255, 255, 0.7)' }
                    }}
                  />
                  <button 
                    className="px-4 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md font-medium transition-colors whitespace-nowrap"
                    style={{ fontSize: `${settings?.fontSize || 14}px` }}
                  >
                    Subscribe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


