import { useState, useEffect } from 'react';
import { X, CheckCircle, Mail } from 'lucide-react';
import { AdminService, MarketingTool } from '../../services/adminService';
import { MailchimpService } from '../../services/mailchimpService';
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
      
      // Subscribe to Mailchimp
      const success = await MailchimpService.subscribe({
        email: email.trim(),
        tags: ['popup-signup', 'discount-offer']
      });

      if (success) {
        // Generate coupon code
        const couponCode = generateCouponCode();
        
        // Send coupon email
        await sendCouponEmail(email.trim(), couponCode);
        
        setIsSuccess(true);
        addNotification('success', 'Success!', 'Check your email for your coupon code.');
        
        // Auto close after success
        setTimeout(() => {
          handleClose();
        }, 3000);
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

  const sendCouponEmail = async (email: string, couponCode: string) => {
    try {
      // Create email template for coupon
      const subject = 'Your 15% Discount Code is Here! 🎉';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 32px; font-weight: bold;">🎉 Welcome!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your discount code is ready</p>
          </div>
          
          <div style="background: white; padding: 40px 20px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 10px 0; font-size: 24px;">Get 15% Off Your First Purchase</h2>
              <p style="color: #666; margin: 0; font-size: 16px;">Use this code at checkout to save on your first order</p>
            </div>
            
            <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Your Discount Code:</div>
              <div style="font-size: 28px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: 'Courier New', monospace;">${couponCode}</div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${window.location.origin}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block;">
                Start Shopping Now
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
              <p style="margin: 0;">This code expires in 30 days. Terms and conditions apply.</p>
              <p style="margin: 5px 0 0 0;">Thank you for subscribing to our newsletter!</p>
            </div>
          </div>
        </div>
      `;

      const textBody = `
Welcome! Your discount code is ready.

Get 15% Off Your First Purchase
Use this code at checkout to save on your first order

Your Discount Code: ${couponCode}

Start Shopping Now: ${window.location.origin}

This code expires in 30 days. Terms and conditions apply.
Thank you for subscribing to our newsletter!
      `;

      // Queue the email
      await AdminService.queueEmail({
        recipient_email: email,
        recipient_name: '',
        subject,
        body_html: htmlBody,
        body_text: textBody
      });

    } catch (error) {
      console.error('Error sending coupon email:', error);
    }
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
                Check Your Email!
              </h2>
              <p className="text-lg" style={{ color: textColor, opacity: 0.8 }}>
                We've sent your 15% discount code to <strong>{email}</strong>
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
