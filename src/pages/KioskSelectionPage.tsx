import { useState, useEffect } from 'react';
import { Search, MapPin, List, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/layouts/DashboardLayout';
import LeafletMap from '../components/MapContainer';
import { CampaignService, Kiosk } from '../services/campaignService';
import { LatLngTuple } from 'leaflet';

interface KioskData {
  id?: string;
  name: string;
  city: string;
  price: string;
  originalPrice?: string;
  hasWarning?: boolean;
  position: LatLngTuple;
  address?: string;
  description?: string;
}

export default function KioskSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { useCustomAd?: boolean } };
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKioskIds, setSelectedKioskIds] = useState<string[]>([]);
  const [showContentModal, setShowContentModal] = useState(false);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const useCustomAd = location.state?.useCustomAd;
  

  const steps = [
    { number: 1, name: 'Choose Ad Type', current: false, completed: true },
    { number: 2, name: 'Select Kiosk', current: true, completed: false },
    { number: 3, name: 'Select Subscription', current: false, completed: false },
    { number: 4, name: 'Add Media & Duration', current: false, completed: false },
    { number: 5, name: 'Review & Submit', current: false, completed: false }
  ];

  const handleBackToSetup = () => {
    navigate('/client/new-campaign');
  };

  // Load kiosks on component mount
  useEffect(() => {
    const loadKiosks = async () => {
      try {
        setIsLoading(true);
        const kiosksData = await CampaignService.getAvailableKiosks();
        setKiosks(kiosksData);
      } catch (error) {
        console.error('Error loading kiosks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadKiosks();
  }, []);

  const handleKioskSelectionChange = (selectedIds: string[]) => {
    setSelectedKioskIds(selectedIds);
  };

  

  const handleMapKioskSelect = (kiosk: KioskData) => {
    if (!kiosk.id) return;
    setSelectedKioskIds((prev) => {
      if (prev.includes(kiosk.id as string)) return prev;
      return [...prev, kiosk.id as string];
    });
  };

  const handleRemoveSelectedKiosk = (kioskId: string) => {
    setSelectedKioskIds((prev) => prev.filter((id) => id !== kioskId));
  };

  const selectedKiosks = kiosks.filter((k) => selectedKioskIds.includes(k.id));

  const kioskMapData: KioskData[] = kiosks.map((kiosk) => ({
    id: kiosk.id,
    name: kiosk.name,
    city: kiosk.city,
    price: `$${kiosk.price.toFixed(2)}`,
    position: [kiosk.coordinates.lat, kiosk.coordinates.lng] as LatLngTuple,
    address: kiosk.address,
    description: kiosk.description,
  }));

  if (isLoading) {
    return (
      <DashboardLayout
        title="Create New Campaign"
        subtitle=""
        showBreadcrumb={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Create New Campaign"
      subtitle=""
      showBreadcrumb={false}
    >

      {/* Progress Indicator */}
      <div className="mb-6 md:mb-8">
        {/* Mobile Progress - Vertical Stack */}
        <div className="block md:hidden">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
              steps[1].current 
                ? 'bg-black text-white' 
                : steps[1].completed
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {steps[1].completed ? '✓' : steps[1].number}
            </div>
            <span className={`text-sm font-medium ${
              steps[1].current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {steps[1].name}
            </span>
          </div>
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            Step 2 of {steps.length}
          </div>
        </div>
        
        {/* Desktop Progress - Horizontal */}
        <div className="hidden md:flex items-center space-x-4 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
                step.completed 
                  ? 'bg-green-600 text-white' 
                  : step.current
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step.completed ? '✓' : step.number}
              </div>
              <span className={`ml-2 text-sm font-medium whitespace-nowrap ${
                step.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-1 mx-4 ${
                  step.completed ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="mb-8">
        <button 
          onClick={handleBackToSetup}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Choose Ad Type</span>
        </button>
      </div>

      {/* Section Title */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">Select Kiosk</h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">Select one or more kiosks for your advertising campaign</p>
      </div>

      {/* Search Bar */}
      <div className="mb-4 md:mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search kiosks by name, city, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 md:py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 shadow-soft text-sm md:text-base"
          />
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-4 md:mb-6">
        <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-soft">
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-black text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <MapPin className="h-3 w-3 md:h-4 md:w-4 inline mr-1 md:mr-2" />
            <span className="hidden sm:inline">Map View</span>
            <span className="sm:hidden">Map</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-black text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <List className="h-3 w-3 md:h-4 md:w-4 inline mr-1 md:mr-2" />
            <span className="hidden sm:inline">List View</span>
            <span className="sm:hidden">List</span>
          </button>
        </div>
      </div>

      {/* Enhanced Kiosk Selection / Map */}
      <div className="mb-6 md:mb-8">
        {viewMode === 'map' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 h-[500px] lg:h-[600px] w-full">
              <LeafletMap
                center={[33.5689, -117.1865]}
                zoom={11}
                className="h-full w-full"
                kioskData={kioskMapData}
                selectedKioskIds={selectedKioskIds}
                onKioskSelect={handleMapKioskSelect}
              />
            </div>
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* All Kiosks Grid - No Scrollbar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {kiosks.map((kiosk) => {
                    const isSelected = selectedKioskIds.includes(kiosk.id);
                    
                    return (
                      <div
                        key={kiosk.id}
                        className={`border rounded-lg p-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleKioskSelectionChange(
                          isSelected 
                            ? selectedKioskIds.filter(id => id !== kiosk.id)
                            : [...selectedKioskIds, kiosk.id]
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                              {kiosk.name}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {kiosk.address}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {isSelected ? (
                              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                            )}
                          </div>
                        </div>

                        {/* Pricing Information */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Base Price:</span>
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                              ${kiosk.price.toFixed(2)}/month
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Kiosks Summary */}
                {selectedKioskIds.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Selected Kiosks ({selectedKioskIds.length})
                    </h3>
                    
                    <div className="space-y-2">
                      {selectedKiosks.map((kiosk) => (
                        <div key={kiosk.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{kiosk.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600 dark:text-gray-400">
                              ${kiosk.price.toFixed(2)}/month
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleKioskSelectionChange(selectedKioskIds.filter(id => id !== kiosk.id));
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pricing Summary */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span className="text-gray-900 dark:text-white">Total:</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          ${selectedKiosks.reduce((sum, kiosk) => sum + kiosk.price, 0).toFixed(2)}/month
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* All Kiosks Grid - No Scrollbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {kiosks.map((kiosk) => {
                const isSelected = selectedKioskIds.includes(kiosk.id);
                
                return (
                  <div
                    key={kiosk.id}
                    className={`border rounded-lg p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => handleKioskSelectionChange(
                      isSelected 
                        ? selectedKioskIds.filter(id => id !== kiosk.id)
                        : [...selectedKioskIds, kiosk.id]
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                          {kiosk.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {kiosk.address}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isSelected ? (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                        )}
                      </div>
                    </div>

                    {/* Pricing Information */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Base Price:</span>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          ${kiosk.price.toFixed(2)}/month
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Kiosks Summary */}
            {selectedKioskIds.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Selected Kiosks ({selectedKioskIds.length})
                </h3>
                
                <div className="space-y-2">
                  {selectedKiosks.map((kiosk) => (
                    <div key={kiosk.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{kiosk.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">
                          ${kiosk.price.toFixed(2)}/month
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleKioskSelectionChange(selectedKioskIds.filter(id => id !== kiosk.id));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span className="text-gray-900 dark:text-white">Total:</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      ${selectedKiosks.reduce((sum, kiosk) => sum + kiosk.price, 0).toFixed(2)}/month
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-600 dark:text-gray-300">
          {selectedKioskIds.length} selected
        </div>
        <button 
          disabled={selectedKioskIds.length === 0}
          onClick={() => setShowContentModal(true)}
          className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold transition-colors shadow-soft text-sm md:text-base ${selectedKioskIds.length > 0 ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          <span className="hidden md:inline">Continue to Select Subscriptions</span>
          <span className="md:hidden">Continue</span>
        </button>
      </div>

      {/* Content Limitations Modal */}
      {showContentModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md md:max-w-lg p-4 md:p-6 shadow-elevated border border-gray-200 dark:border-gray-700">
            <div className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-1">Content Limitations</div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-4">Please review these content restrictions before proceeding</div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 md:p-4 mb-4 bg-gray-50 dark:bg-gray-800">
              <div className="font-semibold text-gray-900 dark:text-white mb-1 text-md md:text-base">Important Notice</div>
              <div className="text-md md:text-sm text-gray-600 dark:text-gray-300">Your business and advertisements must comply with the following limitations. Non-compliant ads will be rejected during the approval process.</div>
            </div>
            {(() => {
              const all = selectedKiosks
                .flatMap(k => (k.content_restrictions || []))
                .map(s => (s || '').trim())
                .filter(Boolean);
              const unique = Array.from(new Set(all));
              return (
                <div className="text-gray-900 dark:text-gray-100 text-xs md:text-sm space-y-1 mb-6">
                  {unique.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400">No specific restrictions on selected kiosks.</div>
                  ) : (
                    unique.map((rule, idx) => (
                      <div key={idx}>{rule}</div>
                    ))
                  )}
                </div>
              );
            })()}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button onClick={() => setShowContentModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm md:text-base">Cancel</button>
              <button onClick={() => navigate('/client/select-weeks', { state: { 
                kiosks: selectedKiosks.map(k => ({
                  id: k.id,
                  name: k.name,
                  city: k.city,
                  price: `$${k.price.toFixed(2)}/month`
                })),
                useCustomAd: useCustomAd
              } })} className="px-4 py-2 rounded-lg bg-black dark:bg-gray-900 text-white text-sm md:text-base">I Understand & Accept</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
