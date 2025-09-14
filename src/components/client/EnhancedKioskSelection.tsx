import React, { useState, useEffect } from 'react';
import { Search, MapPin, List, Check, X, DollarSign, Percent } from 'lucide-react';
import { Kiosk } from '../../services/campaignService';
import { VolumeDiscountService, CampaignPricing } from '../../services/volumeDiscountService';

interface EnhancedKioskSelectionProps {
  kiosks: Kiosk[];
  selectedKioskIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onPricingChange?: (pricing: CampaignPricing) => void;
  className?: string;
}

export default function EnhancedKioskSelection({
  kiosks,
  selectedKioskIds,
  onSelectionChange,
  onPricingChange,
  className = ''
}: EnhancedKioskSelectionProps) {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [pricing, setPricing] = useState<CampaignPricing | null>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);

  const filteredKiosks = kiosks.filter(kiosk =>
    kiosk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kiosk.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kiosk.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedKiosks = kiosks.filter(k => selectedKioskIds.includes(k.id));

  const toggleKioskSelection = (kioskId: string) => {
    const newSelection = selectedKioskIds.includes(kioskId)
      ? selectedKioskIds.filter(id => id !== kioskId)
      : [...selectedKioskIds, kioskId];
    
    onSelectionChange(newSelection);
  };

  // Calculate pricing when selection changes
  useEffect(() => {
    const calculatePricing = async () => {
      if (selectedKiosks.length === 0) {
        setPricing(null);
        onPricingChange?.(null as any);
        return;
      }

      setIsCalculatingPricing(true);
      try {
        const newPricing = await VolumeDiscountService.calculateCampaignPricing(selectedKiosks);
        setPricing(newPricing);
        onPricingChange?.(newPricing);
      } catch (error) {
        console.error('Error calculating pricing:', error);
      } finally {
        setIsCalculatingPricing(false);
      }
    };

    calculatePricing();
  }, [selectedKioskIds, onPricingChange]);

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const getTrafficColor = (trafficLevel: string) => {
    switch (trafficLevel) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search kiosks by name, location, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <List className="h-4 w-4" />
            <span>List</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Map</span>
          </button>
        </div>
      </div>

      {/* Kiosk List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredKiosks.map((kiosk) => {
          const isSelected = selectedKioskIds.includes(kiosk.id);
          const kioskPricing = pricing?.kioskPricing.find(kp => kp.kioskId === kiosk.id);
          
          return (
            <div
              key={kiosk.id}
              className={`border rounded-lg p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => toggleKioskSelection(kiosk.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {kiosk.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {kiosk.address}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTrafficColor(kiosk.traffic_level)}`}>
                      {kiosk.traffic_level.charAt(0).toUpperCase() + kiosk.traffic_level.slice(1)} Traffic
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isSelected ? (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                  )}
                </div>
              </div>

              {/* Pricing Information */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Base Price:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(kiosk.price)}
                  </span>
                </div>
                
                {kioskPricing && kioskPricing.discountAmount > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        -{formatPrice(kioskPricing.discountAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Final Price:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatPrice(kioskPricing.finalPrice)}
                      </span>
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {kioskPricing.discountReason}
                    </div>
                  </>
                )}
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
                    {formatPrice(kiosk.price)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleKioskSelection(kiosk.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Summary */}
          {pricing && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(pricing.totalBasePrice)}
                  </span>
                </div>
                
                {pricing.totalDiscountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Volume Discount:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -{formatPrice(pricing.totalDiscountAmount)}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-lg font-bold">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatPrice(pricing.totalFinalPrice)}
                  </span>
                </div>
                
                {pricing.totalDiscountAmount > 0 && (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    You save {formatPrice(pricing.totalDiscountAmount)} with volume discount!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredKiosks.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No kiosks found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search criteria or check back later for new kiosks.
          </p>
        </div>
      )}
    </div>
  );
}
