import { useState, useEffect } from 'react';
import { X, CheckCircle, Mail } from 'lucide-react';
import { AdminService, MarketingTool } from '../../services/adminService';
import { MailchimpService } from '../../services/mailchimpService';
import { CouponEmailService } from '../../services/couponEmailService';
import { useNotification } from '../../contexts/NotificationContext';

interface PopupSettings {
  displayDelay?: number;
  autoClose?: number;
  backgroundColor?: string;
  textColor?: string;
  title?: string;
  message?: string;
  buttonText?: string;
  collectEmail?: boolean;
  couponCode?: string;
  confirmationMessage?: string;
}

export default function PopupMarketingTool() {
  const [marketingTool, setMarketingTool] = useState<MarketingTool | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    loadPopupTool();
  }, []);

  const loadPopupTool = async () => {
    try {
      const tools = await AdminService.getMarketingTools();
      const popupTools = tools.filter(t => t.type === 'popup' && t.is_active);
      
      if (popupTools.length > 0) {
        const tool = popupTools[0];
        setMarketingTool(tool);
        
        // Show popup after delay - removed localStorage check to allow popup to show on every refresh
        const delay = (tool.settings as PopupSettings)?.displayDelay || 3;
        setTimeout(() => {
          setIsVisible(true);
        }, delay * 1000);
      }
    } catch (error) {
      console.error('Error loading popup tool:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // Removed localStorage setting to allow popup to show again on refresh
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !marketingTool) return;

    try {
      setIsSubmitting(true);
      
      const settings: PopupSettings = marketingTool.settings || {};
      const couponCode = settings.couponCode || generateCouponCode();
      
      // Subscribe to Mailchimp
      const success = await MailchimpService.subscribe({
        email: email.trim(),
        tags: ['popup-signup', 'discount-offer']
      });

      if (success) {
        // Send coupon email using the new service
        const emailSent = await CouponEmailService.sendCouponCodeEmail({
          email: email.trim(),
          name: email.trim().split('@')[0], // Use email prefix as name
          couponCode: couponCode,
          marketingToolId: marketingTool.id,
          marketingToolTitle: marketingTool.title
        });
        
        if (emailSent) {
          setIsSuccess(true);
          const confirmationMessage = settings.confirmationMessage || 'Check Your Email For Coupon Code';
          addNotification('success', 'Success!', confirmationMessage);
          
          // Auto close after success
          setTimeout(() => {
            handleClose();
          }, 3000);
        } else {
          addNotification('error', 'Failed to send email', 'Please try again.');
        }
      } else {
        addNotification('error', 'Failed to subscribe', 'Please try again.');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      addNotification('error', 'Error', 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateCouponCode = (): string => {
    const prefix = 'SAVE15';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  };


  // Auto close functionality - must be before early return
  useEffect(() => {
    if (isVisible && marketingTool) {
      const settings: PopupSettings = marketingTool.settings || {};
      if (settings.autoClose && settings.autoClose > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, settings.autoClose * 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, marketingTool]);

  if (!marketingTool || !isVisible) {
    return null;
  }

  const settings: PopupSettings = marketingTool.settings || {};
  const backgroundColor = settings.backgroundColor || '#ffffff';
  const textColor = settings.textColor || '#333333';
  const title = settings.title || 'TAKE 15% OFF';
  const message = settings.message || 'Your first purchase';
  const buttonText = settings.buttonText || 'Get Started Now';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full relative"
        style={{ backgroundColor, color: textColor }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-8 text-center">
          {isSuccess ? (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: textColor }}>
                {settings.confirmationMessage || 'Check Your Email!'}
              </h2>
              <p className="text-lg" style={{ color: textColor, opacity: 0.8 }}>
                We've sent your discount code to <strong>{email}</strong>
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm" style={{ color: textColor, opacity: 0.6 }}>
                <Mail className="h-4 w-4" />
                <span>Check your inbox and spam folder</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: textColor }}>
                  {title}
                </h2>
                <p className="text-lg" style={{ color: textColor, opacity: 0.8 }}>
                  {message}
                </p>
              </div>

              <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                Enter your email below to get started.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email here..."
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black placeholder-gray-500"
                    style={{ 
                      backgroundColor: '#ffffff',
                      color: '#000000'
                    }}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Sending...' : buttonText}
                </button>
              </form>

              <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                By subscribing, you agree to receive marketing emails from us.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
