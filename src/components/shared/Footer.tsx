import { useState, useEffect } from 'react';
import { Facebook, Instagram, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminService } from '../../services/adminService';

interface SocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
}

interface FooterProps {
  className?: string;
  showSocialIcons?: boolean;
}

export default function Footer({ className = '', showSocialIcons = true }: FooterProps) {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: '',
    instagram: '',
    tiktok: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSocialLinks();
  }, []);

  const loadSocialLinks = async () => {
    try {
      const settings = await AdminService.getSystemSettings();
      
      const facebookSetting = settings.find(s => s.key === 'social_link_facebook');
      const instagramSetting = settings.find(s => s.key === 'social_link_instagram');
      const tiktokSetting = settings.find(s => s.key === 'social_link_tiktok');

      // Helper function to safely extract string values from JSONB
      const getStringValue = (value: unknown, defaultValue: string): string => {
        if (!value) return defaultValue;
        if (typeof value === 'string') {
          // If it's a JSON-encoded string, parse it
          if (value.startsWith('"') && value.endsWith('"')) {
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          }
          return value;
        }
        return defaultValue;
      };

      setSocialLinks({
        facebook: getStringValue(facebookSetting?.value, ''),
        instagram: getStringValue(instagramSetting?.value, ''),
        tiktok: getStringValue(tiktokSetting?.value, '')
      });
    } catch (error) {
      console.error('Error loading social links:', error);
      // Silently fail - footer should still render even if social links fail to load
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className={`px-4 sm:px-6 py-6 sm:py-8 border-t border-gray-200 dark:border-gray-800 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 ezkioskads.com. All rights reserved.</p>
          
          <div className="flex items-center gap-4">
            {showSocialIcons && !loading && (
              <div className="flex items-center gap-3">
                {/* Facebook Icon - Always displayed */}
                {socialLinks.facebook ? (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                ) : (
                  <span
                    className="text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    aria-label="Facebook (not configured)"
                    title="Facebook link not configured"
                  >
                    <Facebook className="h-5 w-5" />
                  </span>
                )}

                {/* Instagram Icon - Always displayed */}
                {socialLinks.instagram ? (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                ) : (
                  <span
                    className="text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    aria-label="Instagram (not configured)"
                    title="Instagram link not configured"
                  >
                    <Instagram className="h-5 w-5" />
                  </span>
                )}

                {/* TikTok Icon - Always displayed */}
                {socialLinks.tiktok ? (
                  <a
                    href={socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    aria-label="TikTok"
                  >
                    <Music className="h-5 w-5" />
                  </a>
                ) : (
                  <span
                    className="text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    aria-label="TikTok (not configured)"
                    title="TikTok link not configured"
                  >
                    <Music className="h-5 w-5" />
                  </span>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <Link to="/contact" className="hover:underline">Contact</Link>
              <Link to="/#pricing" className="hover:underline">Pricing</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

