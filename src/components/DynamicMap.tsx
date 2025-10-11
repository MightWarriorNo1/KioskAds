import React, { Suspense, lazy } from 'react';

// Dynamically import the map component to avoid SSR issues
const LeafletMap = lazy(() => import('./MapContainer'));

interface DynamicMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  kioskData?: any[];
  onKioskSelect?: (kiosk: any) => void;
  selectedKioskIds?: string[];
}

const DynamicMap: React.FC<DynamicMapProps> = (props) => {
  return (
    <Suspense fallback={
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading map...</div>
        </div>
      </div>
    }>
      <LeafletMap {...props} />
    </Suspense>
  );
};

export default DynamicMap;
