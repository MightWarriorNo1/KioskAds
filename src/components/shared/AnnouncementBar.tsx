import { useEffect, useState } from 'react';
import { AdminService, MarketingTool } from '../../services/adminService';

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
}

export default function AnnouncementBar() {
  const [activeBar, setActiveBar] = useState<MarketingTool | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    loadActiveBar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!email) return;
    try {
      setSubmitting(true);
      await AdminService.logAdminAction('announcement_bar_email', 'marketing_tool', activeBar.id, { email });
      setEmail('');
      setDismissedId(activeBar.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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
        className="mx-auto max-w-7xl flex items-center justify-center relative"
        style={{ paddingLeft: `${horizontalPadding}px`, paddingRight: `${horizontalPadding}px` }}
      >
        {/* Dismiss button positioned absolutely on the right */}
        <button
          onClick={() => setDismissedId(activeBar.id)}
          className="absolute right-0 text-sm opacity-80 hover:opacity-100"
          style={{ color: textColor }}
          aria-label="Dismiss announcement"
        >
          ✕
        </button>
        
        {/* Centered content */}
        <div className="flex items-center gap-3">
          <div 
            className="font-medium text-center"
            style={{ fontSize: `${fontSize}px` }}
          >
            {activeBar.title ? (
              <span className="mr-2">{activeBar.title}</span>
            ) : null}
            <span>{activeBar.content}</span>
          </div>
          
          {cta && cta.label && cta.href && !collectEmail && (
            <a
              href={cta.href}
              className="font-semibold underline underline-offset-2"
              style={{ color: textColor, fontSize: `${fontSize}px` }}
            >
              {cta.label}
            </a>
          )}
          
          {collectEmail && (
            <form onSubmit={handleSubmitEmail} className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded px-2 py-1"
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
                className="rounded bg-white/20 px-3 py-1 font-semibold"
                style={{ color: textColor, fontSize: `${fontSize}px` }}
              >
                {submitting ? 'Sending...' : 'Submit'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


