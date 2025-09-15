import { useState } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import SiteHeader from '../components/layouts/SiteHeader';
import LeafletMap from '../components/MapContainer';
import { LatLngTuple } from 'leaflet';

interface KioskCardProps {
  name: string;
  city: string;
  price: string;
  originalPrice?: string;
  traffic: 'Low Traffic' | 'Medium Traffic' | 'High Traffic';
  hasWarning?: boolean;
}

function KioskCard({ name, city, price, originalPrice, traffic, hasWarning }: KioskCardProps) {
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
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{city}</div>
          </div>
          <div className="flex items-center gap-1">
            {hasWarning && (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <MapPin className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="mb-3">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getTrafficColor(traffic)}`}>
            {traffic}
          </span>
        </div>
        
        <div className="text-right mb-4">
          {originalPrice && (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 line-through">{originalPrice}</div>
          )}
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">{price}</div>
        </div>
        
        <button className="btn-primary w-full h-9 text-sm font-medium">
          Advertise Here
          <span className="inline-block ml-2">→</span>
        </button>
      </div>
    </div>
  );
}

function KiosksPage() {
  const [mapCenter] = useState<LatLngTuple>([33.5689, -117.1865]); // Murrieta, CA area
  const [mapZoom] = useState(11);

  const kioskData = [
    {
      name: "Local Fitness Center",
      city: "Murrieta",
      price: "$50/week",
      originalPrice: "$80/week",
      traffic: "Medium Traffic" as const,
      hasWarning: true,
      position: [33.5689, -117.1865] as LatLngTuple
    },
    {
      name: "Mulligans Family Fun Center",
      city: "Murrieta", 
      price: "$90/week",
      originalPrice: "$120/week",
      traffic: "High Traffic" as const,
      hasWarning: false,
      position: [33.5689, -117.1865] as LatLngTuple
    },
    {
      name: "UFC Gym",
      city: "Wildomar",
      price: "$50/week", 
      originalPrice: "$80/week",
      traffic: "Medium Traffic" as const,
      hasWarning: true,
      position: [33.5989, -117.2800] as LatLngTuple
    },
    {
      name: "Temecula Sports Lounge",
      city: "Temecula",
      price: "$40/week",
      originalPrice: "$80/week", 
      traffic: "Low Traffic" as const,
      hasWarning: false,
      position: [33.4936, -117.1484] as LatLngTuple
    }
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Kiosk Locations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Available Kiosks</h2>
        </div>
        
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
            />
          ))}
        </div>

        {/* Call to Action */}
        <div className="flex justify-center">
          <button className="btn-primary px-6 py-3 text-sm font-medium">
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