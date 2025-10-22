import { useState, useEffect, useCallback } from 'react';
import { AdminService } from '../../services/adminService';
import { PartnerLogosService, PartnerLogo } from '../../services/partnerLogosService';

interface ProudlyPartneredWithProps {
  className?: string;
}

export default function ProudlyPartneredWith({ className = '' }: ProudlyPartneredWithProps) {
  const [partnerLogos, setPartnerLogos] = useState<PartnerLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerSettings, setPartnerSettings] = useState({
    partnerNameText: 'Proudly Partnered With',
    partnerLogoUrl: '',
    logoBackgroundColor: '#ffffff',
    isHidden: false
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load both partner logos and settings in parallel
      const [logosData, settingsData] = await Promise.all([
        PartnerLogosService.getPartnerLogos(),
        AdminService.getSystemSettings()
      ]);
      
      setPartnerLogos(logosData);
      
      // Extract partner settings
      const partnerNameSetting = settingsData.find(s => s.key === 'partner_name_text');
      const partnerLogoSetting = settingsData.find(s => s.key === 'partner_logo_url');
      const logoBackgroundColorSetting = settingsData.find(s => s.key === 'partner_logo_background_color');
      const partnerHiddenSetting = settingsData.find(s => s.key === 'partner_section_hidden');
      
      // Handle JSONB values - they are stored as JSON-encoded strings
      const getStringValue = (value: unknown, defaultValue: string): string => {
        if (typeof value === 'string') {
          // If it's a JSON string, parse it
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

      const rawBackgroundColor = getStringValue(logoBackgroundColorSetting?.value, '#ffffff');
      // Ensure the color is valid
      const validBackgroundColor = rawBackgroundColor && rawBackgroundColor.startsWith('#') 
        ? rawBackgroundColor 
        : '#ffffff';

      const partnerSettingsData = {
        partnerNameText: getStringValue(partnerNameSetting?.value, 'Proudly Partnered With'),
        partnerLogoUrl: getStringValue(partnerLogoSetting?.value, ''),
        logoBackgroundColor: validBackgroundColor,
        isHidden: partnerHiddenSetting?.value === true || partnerHiddenSetting?.value === 'true'
      };
      
      
      console.log('ProudlyPartneredWith - Loaded settings:', {
        partnerNameSetting: partnerNameSetting?.value,
        partnerLogoSetting: partnerLogoSetting?.value,
        logoBackgroundColorSetting: logoBackgroundColorSetting?.value,
        processedColor: partnerSettingsData.logoBackgroundColor,
        rawBackgroundColor: rawBackgroundColor,
        validBackgroundColor: validBackgroundColor
      });
      setPartnerSettings(partnerSettingsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    const handleFocus = () => {
      loadData();
    };

    // Listen for storage changes (when admin panel updates settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'partner_settings_updated') {
        loadData();
        // Clear the trigger
        localStorage.removeItem('partner_settings_updated');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData]);

  // Partner logos are already filtered and sorted by the service
  const activePartnerLogos = partnerLogos.filter(logo => logo.is_active);
  
  

  if (loading) {
    return (
      <section className={`px-6 py-16 ${className}`}>
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-black dark:text-white">
            {partnerSettings.partnerNameText}
          </h2>
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`px-6 py-16 ${className}`}>
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-black dark:text-white">
            {partnerSettings.partnerNameText}
          </h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </section>
    );
  }

  console.log('ProudlyPartneredWith - Rendering check:', {
    activePartnerLogos: activePartnerLogos.length,
    partnerSettings,
    isHidden: partnerSettings.isHidden,
    partnerHiddenSetting: partnerSettings
  });

  if (activePartnerLogos.length === 0) {
    console.log('ProudlyPartneredWith - Not rendering: No active partner logos');
    return null; // Don't show section if no partner logos
  }

  if (partnerSettings.isHidden) {
    console.log('ProudlyPartneredWith - Not rendering: Section is hidden');
    return null; // Don't show section if hidden
  }

  return (
    <section className={`px-6 py-16 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-black dark:text-white">
            {partnerSettings.partnerNameText}
          </h2>
          {partnerSettings.partnerLogoUrl && (
            <div className="flex justify-center mb-4">
              <img
                src={partnerSettings.partnerLogoUrl}
                alt="Partner logo"
                className="h-12 w-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* Partner Logos Grid */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {activePartnerLogos.map((logo) => (
            <div 
              key={logo.id} 
              className="flex flex-col items-center group hover:scale-105 transition-transform duration-300"
            >
              {/* Logo Container */}
              <div 
                className="w-20 h-20 md:w-24 md:h-24 rounded-xl shadow-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center p-3 mb-3 group-hover:shadow-xl transition-all duration-300"
                style={{ 
                  backgroundColor: partnerSettings.logoBackgroundColor,
                  background: partnerSettings.logoBackgroundColor,
                  borderColor: partnerSettings.logoBackgroundColor === '#ffffff' ? '#d1d5db' : partnerSettings.logoBackgroundColor
                }}
                data-bg-color={partnerSettings.logoBackgroundColor}
                title={`Background color: ${partnerSettings.logoBackgroundColor}`}
              >
                <img
                  src={logo.logo_url}
                  alt={`${logo.name} logo`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    // Hide the logo if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.parentElement?.parentElement?.style.setProperty('display', 'none');
                  }}
                />
              </div>
              
              {/* Partner Name */}
              <h3 className="text-sm md:text-base font-medium text-black dark:text-white text-center max-w-24 md:max-w-32">
                {logo.name}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
