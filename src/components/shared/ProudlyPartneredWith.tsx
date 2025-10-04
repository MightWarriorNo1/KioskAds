import { useState, useEffect } from 'react';
import { AdminService } from '../../services/adminService';
import { PartnersService, Partner } from '../../services/partnersService';

interface ProudlyPartneredWithProps {
  className?: string;
}

export default function ProudlyPartneredWith({ className = '' }: ProudlyPartneredWithProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerSettings, setPartnerSettings] = useState({
    partnerNameText: 'Proudly Partnered With',
    partnerLogoUrl: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load both partners and settings in parallel
      const [partnersData, settingsData] = await Promise.all([
        PartnersService.getPartners(),
        AdminService.getSystemSettings()
      ]);
      
      setPartners(partnersData);
      
      // Extract partner settings
      const partnerNameSetting = settingsData.find(s => s.key === 'partner_name_text');
      const partnerLogoSetting = settingsData.find(s => s.key === 'partner_logo_url');
      
      setPartnerSettings({
        partnerNameText: partnerNameSetting?.value || 'Proudly Partnered With',
        partnerLogoUrl: partnerLogoSetting?.value || ''
      });
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter partners that have either photo_url or logo_url for display
  // Sort by created_at (newest first) and take only the latest 4
  const partnersWithLogos = partners
    .filter(partner => 
      partner.is_active && (partner.photo_url || partner.logo_url)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

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

  if (partnersWithLogos.length === 0) {
    return null; // Don't show section if no partners with logos
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

        {/* Partners Grid */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {partnersWithLogos.map((partner) => (
            <div 
              key={partner.id} 
              className="flex flex-col items-center group hover:scale-105 transition-transform duration-300"
            >
              {/* Logo Container */}
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center p-3 mb-3 group-hover:shadow-xl transition-shadow duration-300">
                <img
                  src={partner.photo_url || partner.logo_url}
                  alt={`${partner.title} logo`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    // Hide the partner if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.parentElement?.parentElement?.style.setProperty('display', 'none');
                  }}
                />
              </div>
              
              {/* Partner Name */}
              <h3 className="text-sm md:text-base font-medium text-black dark:text-white text-center max-w-24 md:max-w-32">
                {partner.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
