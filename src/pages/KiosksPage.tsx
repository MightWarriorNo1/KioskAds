import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SiteHeader from '../components/layouts/SiteHeader';
import LeafletMap from '../components/MapContainer';
import { LatLngTuple } from 'leaflet';
import { KioskService, Kiosk } from '../services/kioskService';
import { useAuth } from '../contexts/AuthContext';

interface KioskCardProps {
  name: string;
  city: string;
  price: string;
  originalPrice?: string;
  traffic: 'Low Traffic' | 'Medium Traffic' | 'High Traffic';
  hasWarning?: boolean;
  onAdvertiseClick?: () => void;
}

function KioskCard({ name, city, price, originalPrice, traffic, hasWarning, onAdvertiseClick }: KioskCardProps) {
  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'High Traffic':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Medium Traffic':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Low Traffic':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="card hover:shadow-lg transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{city}</div>
          </div>
          <div className="flex items-center gap-1">
            {hasWarning && (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <MapPin className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTrafficColor(traffic)}`}>
            {traffic}
          </span>
        </div>
        
        <div className="text-right mb-4">
          {originalPrice && (
            <div className="text-xs text-gray-400 dark:text-gray-500 line-through">{originalPrice}</div>
          )}
          <div className="text-base font-semibold text-green-600 dark:text-green-400">{price}</div>
        </div>
        
        <button 
          className="btn-primary w-full h-9 text-base font-medium"
          onClick={onAdvertiseClick}
        >
          Advertise Here
          <span className="inline-block ml-2">→</span>
        </button>
      </div>
    </div>
  );
}

function KiosksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mapCenter] = useState<LatLngTuple>([33.5689, -117.1865]); // Murrieta, CA area
  const [mapZoom] = useState(11);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle advertise button click
  const handleAdvertiseClick = (kioskId: string) => {
    // Check if user is authenticated
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/signin');
      return;
    }

    // Navigate to appropriate campaign creation flow based on user role
    if (user.role === 'host') {
      navigate('/host/new-campaign');
    } else {
      navigate('/client/new-campaign');
    }
  };

  // Fetch kiosks from database
  useEffect(() => {
    const fetchKiosks = async () => {
      try {
        setLoading(true);
        setError(null);
        const kioskData = await KioskService.getActiveKiosks();
        setKiosks(kioskData);
      } catch (err) {
        console.error('Error fetching kiosks:', err);
        setError('Failed to load kiosk data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchKiosks();
  }, []);

  // Transform kiosk data for display
  const kioskData = kiosks.map(kiosk => {
    const getTrafficLevel = (level: string): 'Low Traffic' | 'Medium Traffic' | 'High Traffic' => {
      switch (level) {
        case 'low':
          return 'Low Traffic';
        case 'medium':
          return 'Medium Traffic';
        case 'high':
          return 'High Traffic';
        default:
          return 'Low Traffic';
      }
    };

    return {
      id: kiosk.id,
      name: kiosk.name,
      city: kiosk.city,
      price: `$${kiosk.price}/week`,
      originalPrice: kiosk.base_rate > kiosk.price ? `$${kiosk.base_rate}/week` : undefined,
      traffic: getTrafficLevel(kiosk.traffic_level),
      hasWarning: kiosk.status === 'maintenance' || (kiosk.content_restrictions && kiosk.content_restrictions.length > 0),
      position: [kiosk.coordinates.lat, kiosk.coordinates.lng] as LatLngTuple
    };
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
        <SiteHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-base text-gray-600 dark:text-gray-400">Loading kiosk locations...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
        <SiteHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <AlertTriangle className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Kiosks</h2>
              <p className="text-base text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="btn-primary px-4 py-2 text-base"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Kiosk Locations</h1>
          <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
            Browse our network of digital kiosks available for advertising.
          </p>
        </div>

        {/* Map Section */}
        <div className="mb-8">
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="h-96 w-full">
              <LeafletMap 
                center={mapCenter}
                zoom={mapZoom}
                className="h-full"
                kioskData={kioskData}
              />
            </div>
          </div>
        </div>

        {/* Available Kiosks Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Available Kiosks</h2>
        </div>
        
        {kioskData.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MapPin className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No Kiosks Available</h3>
            <p className="text-base text-gray-600 dark:text-gray-400">
              There are currently no kiosks available for advertising. Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kioskData.map((kiosk, index) => (
              <KioskCard
                key={index}
                name={kiosk.name}
                city={kiosk.city}
                price={kiosk.price}
                originalPrice={kiosk.originalPrice}
                traffic={kiosk.traffic}
                hasWarning={kiosk.hasWarning}
                onAdvertiseClick={() => handleAdvertiseClick(kiosk.id)}
              />
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="flex justify-center">
          <button className="btn-primary px-6 py-3 text-base font-medium" onClick={() => navigate('/signin')}>
            Get Started
            <span className="inline-block ml-2">→</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto text-xs text-gray-500 dark:text-gray-400 text-center">
          © 2025 KioskAds.com. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default KiosksPage;