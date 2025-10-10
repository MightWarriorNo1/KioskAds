import React, { useState, useEffect } from 'react';
import { MapPin, Image as ImageIcon } from 'lucide-react';
import { PartnersService, Partner } from '../../services/partnersService';

interface PartnersSectionProps {
  className?: string;
}

export default function PartnersSection({ className = '' }: PartnersSectionProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading partners...');
      const partnersData = await PartnersService.getPartners();
      console.log('Partners loaded:', partnersData);
      setPartners(partnersData);
    } catch (err) {
      console.error('Error loading partners:', err);
      setError('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  // Only show section if there are partners with data
  const hasPartnersWithData = partners.some(partner => 
    partner.title && partner.address && (partner.photo_url || partner.kiosk_map_url)
  );
  
  console.log('Partners section debug:', {
    partnersCount: partners.length,
    hasPartnersWithData,
    partners: partners.map(p => ({
      title: p.title,
      address: p.address,
      hasPhoto: !!p.photo_url,
      hasMap: !!p.kiosk_map_url,
      isActive: p.is_active
    }))
  });

  if (loading) {
    return (
      <section className={`px-6 py-20 ${className}`}>
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`px-6 py-20 ${className}`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </section>
    );
  }

  if (!hasPartnersWithData) {
    return null; // Don't show section if no partners with data
  }

  return (
    <section className={`px-6 py-20 ${className}`}>
      <div className="max-w-7xl mx-auto">
        

        {/* Logo strip slider */}
        {/* {partners.some(p => p.logo_url) && (
          <div className="mb-12 bg-white rounded-lg border border-gray-200 p-4 overflow-hidden">
            <div className="flex items-center gap-10 animate-[scroll-left_40s_linear_infinite] will-change-transform">
              {[...partners.filter(p => p.logo_url), ...partners.filter(p => p.logo_url)].map((p, idx) => (
                <div key={`${p.id}-${idx}`} className="h-16 flex items-center">
                  <img src={p.logo_url as string} alt={`${p.title} logo`} className="h-12 w-auto object-contain" />
                </div>
              ))}
            </div>
          </div>
        )} */}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {partners
            .filter(partner => partner.title && partner.address && (partner.photo_url || partner.kiosk_map_url))
            .map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
        </div>
      </div>
    </section>
  );
}

interface PartnerCardProps {
  partner: Partner;
}

function PartnerCard({ partner }: PartnerCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => setImageError(true);

  return (
    <div className="card p-6 text-black dark:text-white/90 hover:shadow-lg transition-all duration-300 group">
      {/* Photo Section */}
      {partner.photo_url && !imageError && (
        <div className="relative mb-6 rounded-lg overflow-hidden">
          <img
            src={partner.photo_url}
            alt={`${partner.title} location`}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            onError={handleImageError}
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl text-center font-bold mb-3 text-black dark:text-white group-hover:text-primary-600 transition-colors duration-300">
        {partner.title}
      </h3>

      {/* Address */}
      <div className="flex items-start justify-center gap-3 mb-4">
        <MapPin className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
        <p className="text-gray-600  dark:text-gray-300 text-sm leading-relaxed">
          {partner.address}
        </p>
      </div>
    </div>
  );
}
