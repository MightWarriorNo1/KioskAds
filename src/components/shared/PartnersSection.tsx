import React, { useState, useEffect } from 'react';
import { MapPin, ExternalLink, Phone, Mail, Image as ImageIcon } from 'lucide-react';
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black dark:text-white">Our Partners</h2>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black dark:text-white">Our Partners</h2>
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
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black dark:text-white">
            Our Partners
          </h2>
          <p className="text-xl text-black dark:text-white/90 max-w-3xl mx-auto">
            Discover our network of trusted partners and their premium kiosk locations
          </p>
        </div>

        {/* Logo strip slider */}
        {partners.some(p => p.logo_url) && (
          <div className="mb-12 bg-white rounded-lg border border-gray-200 p-4 overflow-hidden">
            <div className="flex items-center gap-10 animate-[scroll-left_40s_linear_infinite] will-change-transform">
              {[...partners.filter(p => p.logo_url), ...partners.filter(p => p.logo_url)].map((p, idx) => (
                <div key={`${p.id}-${idx}`} className="h-16 flex items-center">
                  <img src={p.logo_url as string} alt={`${p.title} logo`} className="h-12 w-auto object-contain" />
                </div>
              ))}
            </div>
          </div>
        )}

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
  const [mapError, setMapError] = useState(false);

  const handleImageError = () => setImageError(true);
  const handleMapError = () => setMapError(true);

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
      <h3 className="text-xl font-bold mb-3 text-black dark:text-white group-hover:text-primary-600 transition-colors duration-300">
        {partner.title}
      </h3>

      {/* Address */}
      <div className="flex items-start gap-3 mb-4">
        <MapPin className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          {partner.address}
        </p>
      </div>

      {/* Description */}
      {partner.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
          {partner.description}
        </p>
      )}

      {/* Kiosk Map Section */}
      {partner.kiosk_map_url && !mapError && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Kiosk Location Map
          </h4>
          <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img
              src={partner.kiosk_map_url}
              alt={`${partner.title} kiosk map`}
              className="w-full h-32 object-cover"
              onError={handleMapError}
            />
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-white/90 dark:bg-gray-800/90 px-3 py-1 rounded-full text-xs font-medium text-gray-700 dark:text-gray-200">
                View Map
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="space-y-2">
        {partner.contact_phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Phone className="w-4 h-4 text-primary-600" />
            <a 
              href={`tel:${partner.contact_phone}`}
              className="hover:text-primary-600 transition-colors duration-300"
            >
              {partner.contact_phone}
            </a>
          </div>
        )}

        {partner.contact_email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Mail className="w-4 h-4 text-primary-600" />
            <a 
              href={`mailto:${partner.contact_email}`}
              className="hover:text-primary-600 transition-colors duration-300"
            >
              {partner.contact_email}
            </a>
          </div>
        )}

        {partner.website_url && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <ExternalLink className="w-4 h-4 text-primary-600" />
            <a 
              href={partner.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 transition-colors duration-300"
            >
              Visit Website
            </a>
          </div>
        )}
      </div>

      {/* Coordinates Display (for debugging/admin purposes) */}
      {partner.coordinates && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Coordinates: {partner.coordinates.lat.toFixed(4)}, {partner.coordinates.lng.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}
