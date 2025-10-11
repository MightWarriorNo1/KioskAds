import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconRetinaUrl: markerRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface KioskData {
  id?: string;
  name: string;
  city: string;
  price: string;
  originalPrice?: string;
  traffic: 'Low Traffic' | 'Medium Traffic' | 'High Traffic';
  hasWarning?: boolean;
  position: LatLngTuple;
  address?: string;
  description?: string;
}



interface LeafletMapProps {
  center?: LatLngTuple;
  zoom?: number;
  className?: string;
  kioskData?: KioskData[];
  onKioskSelect?: (kiosk: KioskData) => void;
  selectedKioskIds?: string[];
}

export default function LeafletMap({ 
  center = [33.5689, -117.1865], // Default to Murrieta, CA area
  zoom = 11,
  className = "",
  kioskData = [],
  onKioskSelect,
  selectedKioskIds = []
}: LeafletMapProps) {
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');
  const [mapError, setMapError] = useState<string | null>(null);


  if (mapError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 mb-2">Map Error</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{mapError}</div>
        </div>
      </div>
    );
  }

  const getTileLayer = () => {
    if (mapLayer === 'satellite') {
      return {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
      };
    }
    return {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    };
  };

  const tileLayer = getTileLayer();



  try {
    return (
      <div className={`relative h-full w-full ${className}`}>
        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 space-y-2 border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setMapLayer('streets')}
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              mapLayer === 'streets'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Streets
          </button>
          <button
            onClick={() => setMapLayer('satellite')}
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              mapLayer === 'satellite'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Kiosk Count */}
        <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="text-primary-600 font-bold">{kioskData.length}</span> kiosks available
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click markers for details</p>
        </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg overflow-hidden shadow-lg"
      >
        <TileLayer
          url={tileLayer.url}
          attribution={tileLayer.attribution}
        />
        
        {kioskData.map((kiosk, index) => (
          <Marker 
            key={index} 
            position={kiosk.position}
            icon={DefaultIcon}
          >
            <Popup className="custom-popup">
              <div className="p-3 min-w-[250px]">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">{kiosk.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{kiosk.city}</p>
                
                <div className="mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    kiosk.traffic === 'High Traffic' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : kiosk.traffic === 'Medium Traffic'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  }`}>
                    {kiosk.traffic}
                  </span>
                </div>
                
                <div className="mb-3">
                  {kiosk.originalPrice && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 line-through">{kiosk.originalPrice}</div>
                  )}
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">{kiosk.price}</div>
                </div>
                
                <button 
                  onClick={() => onKioskSelect && onKioskSelect(kiosk)}
                  className="w-full bg-primary-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-primary-700 transition-colors">
                  Select this kiosk
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {kioskData.map((kiosk, index) => (
          selectedKioskIds.includes(String(kiosk.id)) ? (
            <CircleMarker
              key={`selected-${index}`}
              center={kiosk.position}
              radius={14}
              pathOptions={{ color: '#4f46e5', weight: 3, fillOpacity: 0 }}
            />
          ) : null
        ))}
      </MapContainer>
    </div>
  );
  } catch (error) {
    console.error('Map rendering error:', error);
    setMapError(error instanceof Error ? error.message : 'Unknown map error');
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 mb-2">Map Error</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Failed to load map</div>
        </div>
      </div>
    );
  }
}