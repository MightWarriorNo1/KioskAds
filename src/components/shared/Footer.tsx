import { useState, useEffect } from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminService } from '../../services/adminService';
import TikTokIcon from '../icons/TikTokIcon';

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
      // Use public settings method since Footer is used on public pages
      const settings = await AdminService.getPublicSystemSettings();
      
      const facebookSetting = settings.find(s => s.key === 'social_link_facebook');
      const instagramSetting = settings.find(s => s.key === 'social_link_instagram');
      const tiktokSetting = settings.find(s => s.key === 'social_link_tiktok');

      // Helper function to safely extract string values from JSONB
      // Values are stored via updateSystemSetting which uses JSON.stringify, 
      // so they may be JSON-encoded strings that need parsing
      const getStringValue = (value: unknown, defaultValue: string): string => {
        if (!value) return defaultValue;
        
        // If it's already a plain string (not JSON-encoded), return it
        if (typeof value === 'string') {
          const trimmed = value.trim();
          
          // If it's a JSON-encoded string (starts and ends with quotes), parse it
          if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            try {
              const parsed = JSON.parse(trimmed);
              // If parsing returns a string, it might be double-encoded, so parse again
              if (typeof parsed === 'string') {
                // Check if the parsed string is still JSON-encoded
                if (parsed.startsWith('"') && parsed.endsWith('"')) {
                  try {
                    return JSON.parse(parsed);
                  } catch {
                    // If second parse fails, return the first parsed value
                    return parsed;
                  }
                }
                return parsed;
              }
              // If parsing didn't return a string, return default
              return defaultValue;
            } catch {
              // If JSON.parse fails, try removing outer quotes manually
              if (trimmed.length > 2) {
                return trimmed.slice(1, -1);
              }
              return trimmed;
            }
          }
          
          // Not JSON-encoded, return as-is
          return trimmed;
        }
        
        // If it's an object, it's likely already parsed by Supabase
        // Return default as we expect a string value
        return defaultValue;
      };

      const facebookLink = getStringValue(facebookSetting?.value, '').trim();
      const instagramLink = getStringValue(instagramSetting?.value, '').trim();
      const tiktokLink = getStringValue(tiktokSetting?.value, '').trim();

      setSocialLinks({
        facebook: facebookLink,
        instagram: instagramLink,
        tiktok: tiktokLink
      });
      
      // Debug logging to help troubleshoot
      console.log('Footer - Loaded social links:', {
        facebook: facebookLink || '(empty)',
        instagram: instagramLink || '(empty)',
        tiktok: tiktokLink || '(empty)',
        rawFacebook: facebookSetting?.value,
        rawInstagram: instagramSetting?.value,
        rawTiktok: tiktokSetting?.value
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
                    className="text-gray-500 dark:text-white
                    hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-6 w-6" />
                  </a>
                ) : (
                  <span
                    className="text-gray-400 dark:text-white
                    cursor-not-allowed"
                    aria-label="Facebook (not configured)"
                    title="Facebook link not configured"
                  >
                    <Facebook className="h-6 w-6" />
                  </span>
                )}

                {/* Instagram Icon - Always displayed */}
                {socialLinks.instagram ? (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 dark:text-white
                    hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-6 w-6" />
                  </a>
                ) : (
                  <span
                    className="text-gray-400 dark:text-white cursor-not-allowed"
                    aria-label="Instagram (not configured)"
                    title="Instagram link not configured"
                  >
                    <Instagram className="h-6 w-6" />
                  </span>
                )}

                {/* TikTok Icon - Always displayed */}
                {socialLinks.tiktok ? (
                  <a
                    href={socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 dark:text-white hover:text-black dark:hover:text-white transition-colors"
                    aria-label="TikTok"
                  >
                    <TikTokIcon className="h-6 w-6" />
                  </a>
                ) : (
                  <span
                    className="text-gray-400 dark:text-white
                    cursor-not-allowed"
                    aria-label="TikTok (not configured)"
                    title="TikTok link not configured"
                  >
                    <TikTokIcon className="h-6 w-6" />
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

