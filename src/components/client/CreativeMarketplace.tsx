import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Play, Package, Filter, Search, RefreshCw } from 'lucide-react';
import PurchaseModal from './PurchaseModal';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { CreativeService } from '../../services/creativeService';
import { CreativeService as CreativeServiceType } from '../../types/database';

export default function CreativeMarketplace() {
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreativeServiceType | null>(null);
  const [packages, setPackages] = useState<CreativeServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch creative services on component mount
  useEffect(() => {
    fetchCreativeServices();
  }, [selectedCategory, searchQuery]);

  const fetchCreativeServices = async () => {
    try {
      setIsLoading(true);
      let services: CreativeServiceType[] = [];

      if (searchQuery.length > 0) {
        services = await CreativeService.searchServices(searchQuery);
      } else if (selectedCategory === 'all') {
        services = await CreativeService.getActiveServices();
      } else {
        services = await CreativeService.getServicesByCategory(selectedCategory as any);
      }

      setPackages(services);
    } catch (error) {
      console.error('Error fetching creative services:', error);
      addNotification('error', 'Services Error', 'Failed to load creative services');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'image', name: 'Image Packages' },
    { id: 'video', name: 'Video Packages' },
    { id: 'design', name: 'Design Services' },
    { id: 'copywriting', name: 'Copywriting' }
  ];

  const handlePurchase = (pkg: CreativeServiceType) => {
    setSelectedPackage(pkg);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseComplete = async (packageId: string, paymentData: any) => {
    try {
      if (!user?.id || !selectedPackage) return;

      // Create service order
      const orderData = {
        user_id: user.id,
        service_id: selectedPackage.id,
        status: 'pending',
        requirements: paymentData.requirements || '',
        customizations: paymentData.customizations || {},
        total_amount: selectedPackage.price,
        currency: selectedPackage.currency
      };

      await CreativeService.createServiceOrder(orderData);

      addNotification('success', 'Purchase Successful', `"${selectedPackage.name}" has been purchased successfully!`);
      addNotification('info', 'Delivery Update', `Your creative service will be delivered within ${selectedPackage.delivery_time} days. You'll receive an email confirmation shortly.`);
      
      setIsPurchaseModalOpen(false);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Error creating service order:', error);
      addNotification('error', 'Order Failed', 'Failed to create service order');
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    setSelectedCategory(newCategory);
    const categoryName = categories.find(cat => cat.id === newCategory)?.name || newCategory;
    addNotification('info', 'Category Filter', `Showing ${categoryName}`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handlePackageClick = (packageTitle: string) => {
    addNotification('info', 'Package Details', `Detailed information for "${packageTitle}" will be displayed`);
    // In a real app, this would open a detailed view modal
  };

  const handleRefresh = () => {
    fetchCreativeServices();
    addNotification('info', 'Refreshing', 'Creative services are being refreshed...');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading creative services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creative Marketplace</h1>
          <p className="text-gray-600 mt-2">Purchase professional ad creatives from our expert designers</p>
        </div>
        <button
          onClick={handleRefresh}
          className="text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-lg hover:bg-gray-100"
          title="Refresh services"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search creative services..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {packages.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div 
              key={pkg.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handlePackageClick(pkg.name)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-200 relative overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <Package className="h-16 w-16 text-gray-400" />
                </div>
                {pkg.category === 'video' && (
                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">4.8</span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                
                {/* Features */}
                {pkg.features && pkg.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {pkg.features.slice(0, 3).map((feature, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">${pkg.price}</span>
                    <p className="text-xs text-gray-500">{pkg.delivery_time} days</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pkg);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Purchase</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-500">
            {searchQuery.length > 0 
              ? `No services found matching "${searchQuery}". Try adjusting your search criteria.`
              : 'No services available in this category. Please try another category or check back later.'
            }
          </p>
        </div>
      )}

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setSelectedPackage(null);
        }}
        package={selectedPackage}
        onPurchase={handlePurchaseComplete}
      />
    </div>
  );
}