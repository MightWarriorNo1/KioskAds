import { useEffect, useState } from 'react';
import { AdminService, MarketingTool } from '../../services/adminService';
import { CouponEmailService } from '../../services/couponEmailService';
import { MailchimpService } from '../../services/mailchimpService';
import { useNotification } from '../../contexts/NotificationContext';

interface AnnouncementSettings {
  position?: 'top' | 'bottom';
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
  horizontalPadding?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  fontSize?: number;
  emailInputBackgroundColor?: string;
  emailInputTextColor?: string;
  cta?: {
    label?: string;
    href?: string;
  } | null;
  collectEmail?: boolean;
  couponCode?: string;
  confirmationMessage?: string;
}

export default function AnnouncementBar() {
  const [activeBar, setActiveBar] = useState<MarketingTool | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    loadActiveBar();
  }, []);

  const loadActiveBar = async () => {
    try {
      const tools = await AdminService.getMarketingTools();
      const bars = tools.filter(t => t.type === 'announcement_bar' && t.is_active);
      if (bars.length > 0) {
        setActiveBar(bars[0]);
      }
    } catch (e) {
      // fail silent for top bar
      console.error(e);
    }
  };

  if (!activeBar || dismissedId === activeBar.id) return null;

  const settings: AnnouncementSettings = activeBar.settings || {};
  const position = settings.position || 'top';
  const backgroundColor = settings.backgroundColor || 'rgb(var(--primary))';
  const textColor = settings.textColor || 'white';
  const padding = settings.padding || 8;
  const horizontalPadding = settings.horizontalPadding || 16;
  const marginTop = settings.marginTop || 0;
  const marginBottom = settings.marginBottom || 0;
  const marginLeft = settings.marginLeft || 0;
  const marginRight = settings.marginRight || 0;
  const fontSize = settings.fontSize || 14;
  const emailInputBackgroundColor = settings.emailInputBackgroundColor || 'white';
  const emailInputTextColor = settings.emailInputTextColor || 'black';
  const collectEmail = Boolean(settings.collectEmail);
  const cta = settings.cta || null;

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !activeBar) return;
    
    try {
      setSubmitting(true);
      
      const settings: AnnouncementSettings = activeBar.settings || {};
      const couponCode = settings.couponCode || generateCouponCode();
      
      // Subscribe to Mailchimp
      const success = await MailchimpService.subscribe({
        email: email.trim(),
        tags: ['announcement-signup', 'discount-offer']
      });

      if (success) {
        // Send coupon email using the new service
        const emailSent = await CouponEmailService.sendCouponCodeEmail({
          email: email.trim(),
          name: email.trim().split('@')[0], // Use email prefix as name
          couponCode: couponCode,
          marketingToolId: activeBar.id,
          marketingToolTitle: activeBar.title
        });
        
        if (emailSent) {
          setIsSuccess(true);
          const confirmationMessage = settings.confirmationMessage || 'Check Your Email For Coupon Code';
          addNotification('success', 'Success!', confirmationMessage);
          
          // Auto dismiss after success
          setTimeout(() => {
            setDismissedId(activeBar.id);
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
      setSubmitting(false);
    }
  };

  const generateCouponCode = (): string => {
    const prefix = 'SAVE15';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: position === 'top' ? 0 : undefined,
        bottom: position === 'bottom' ? 0 : undefined,
        zIndex: 50,
        backgroundColor,
        color: textColor,
        padding: `${padding}px 0`,
        marginTop: `${marginTop}px`,
        marginBottom: `${marginBottom}px`,
        marginLeft: `${marginLeft}px`,
        marginRight: `${marginRight}px`
      }}
      className="w-full"
    >
      <div 
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        style={{ paddingLeft: `${horizontalPadding}px`, paddingRight: `${horizontalPadding}px` }}
      >
        <div className="flex items-center justify-between relative min-h-[44px]">
          {/* Dismiss button positioned absolutely on the right */}
          <button
            onClick={() => setDismissedId(activeBar.id)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-sm opacity-80 hover:opacity-100 flex-shrink-0 z-10"
            style={{ color: textColor }}
            aria-label="Dismiss announcement"
          >
            ✕
          </button>
          
          {/* Main content area with proper mobile handling */}
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pr-8 sm:pr-12">
            {isSuccess ? (
              <div 
                className="font-medium text-center flex-1 min-w-0"
                style={{ fontSize: `${fontSize}px` }}
              >
                <span className="block sm:inline">{settings.confirmationMessage || 'Check Your Email For Coupon Code'}</span>
              </div>
            ) : (
              <>
                {/* Text content */}
                <div 
                  className="font-medium text-center flex-1 min-w-0"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {activeBar.title ? (
                    <span className="block sm:inline mr-0 sm:mr-2">{activeBar.title}</span>
                  ) : null}
                  <span className="block sm:inline">{activeBar.content}</span>
                </div>
              </>
            )}
            
            {/* CTA or Email form - only show when not in success state */}
            {!isSuccess && (
              <div className="flex-shrink-0">
                {cta && cta.label && cta.href && !collectEmail && (
                  <a
                    href={cta.href}
                    className="font-semibold underline underline-offset-2 whitespace-nowrap"
                    style={{ color: textColor, fontSize: `${fontSize}px` }}
                  >
                    {cta.label}
                  </a>
                )}
                
                {collectEmail && (
                  <form onSubmit={handleSubmitEmail} className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded px-2 py-1 w-full sm:w-auto min-w-[200px]"
                      style={{ 
                        backgroundColor: emailInputBackgroundColor,
                        color: emailInputTextColor,
                        fontSize: `${fontSize}px`
                      }}
                      required
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded bg-white/20 px-3 py-1 font-semibold whitespace-nowrap"
                      style={{ color: textColor, fontSize: `${fontSize}px` }}
                    >
                      {submitting ? 'Sending...' : 'Submit'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


