import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AdminService, MarketingTool } from '../../services/adminService';

interface PopupMarketingToolProps {
  onClose?: () => void;
}

export default function PopupMarketingTool({ onClose }: PopupMarketingToolProps) {
  const [marketingTool, setMarketingTool] = useState<MarketingTool | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    loadMarketingTool();
  }, []);

  const loadMarketingTool = async () => {
    try {
      const tools = await AdminService.getMarketingTools();
      const popupTool = tools.find(tool => 
        tool.type === 'popup' && 
        tool.is_active &&
        (!tool.start_date || new Date(tool.start_date) <= new Date()) &&
        (!tool.end_date || new Date(tool.end_date) >= new Date())
      );
      
      if (popupTool) {
        setMarketingTool(popupTool);
        const delay = (popupTool.settings as any)?.displayDelay || 3;
        setTimeout(() => setIsVisible(true), delay * 1000);
      }
    } catch (error) {
      console.error('Error loading marketing tool:', error);
    }
  };

  useEffect(() => {
    if (!marketingTool || !isVisible) return;

    const autoClose = (marketingTool.settings as any)?.autoClose;
    if (autoClose && autoClose > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoClose * 1000);

      return () => clearTimeout(timer);
    }
  }, [marketingTool, isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleCtaClick = () => {
    const settings = marketingTool?.settings as any;
    const ctaHref = settings?.cta?.href;
    if (ctaHref) {
      window.open(ctaHref, '_blank');
    }
    handleClose();
  };

  if (!marketingTool || !isVisible) {
    return null;
  }

  const settings = marketingTool.settings as any;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Popup Content */}
      <div 
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all duration-300 scale-100"
        style={{
          backgroundColor: settings?.backgroundColor || '#ffffff',
          color: settings?.textColor || '#000000',
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pr-8">
          <h3 className="text-lg font-semibold mb-3">
            {marketingTool.title}
          </h3>
          
          <div className="text-gray-600 mb-4">
            {marketingTool.content}
          </div>

          {settings?.cta?.label && (
            <div className="flex justify-end">
              <button
                onClick={handleCtaClick}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {settings.cta.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

