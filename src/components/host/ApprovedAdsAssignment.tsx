import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostAd, HostKiosk } from '../../services/hostService';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ApprovedAdWithKiosks extends HostAd {
  availableKiosks: HostKiosk[];
}

export default function ApprovedAdsAssignment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [approvedAds, setApprovedAds] = useState<ApprovedAdWithKiosks[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApprovedAds = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const [adsData, kiosksData] = await Promise.all([
          HostService.getHostAds(user.id),
          HostService.getHostKiosks(user.id)
        ]);

        // Filter for approved ads only
        const approved = adsData.filter(ad => ad.status === 'approved');
        
        // Enrich with available kiosks for each ad
        const enrichedAds = await Promise.all(
          approved.map(async (ad) => {
            // Get assignments for this ad to determine available kiosks
            const assignments = await HostService.getHostAdAssignments(user.id);
            const assignedKioskIds = assignments
              .filter(assignment => assignment.ad_id === ad.id)
              .map(assignment => assignment.kiosk_id);
            
            const availableKiosks = kiosksData.filter(
              kiosk => !assignedKioskIds.includes(kiosk.kiosk.id)
            );
            
            return {
              ...ad,
              availableKiosks
            };
          })
        );

        setApprovedAds(enrichedAds);
      } catch (error) {
        console.error('Error loading approved ads:', error);
        addNotification('error', 'Error', 'Failed to load approved ads');
      } finally {
        setLoading(false);
      }
    };

    loadApprovedAds();
  }, [user?.id, addNotification]);

  const handleQuickAssign = async (adId: string, kioskId: string) => {
    if (!user?.id) return;
    
    try {
      // Set end date to 30 days from now for quick assignment
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      await HostService.createAdAssignment({
        hostId: user.id,
        adId: adId,
        kioskId: kioskId,
        startDate: new Date().toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        priority: 1
      });
      
      // Refresh the data
      const [adsData, kiosksData] = await Promise.all([
        HostService.getHostAds(user.id),
        HostService.getHostKiosks(user.id)
      ]);

      const approved = adsData.filter(ad => ad.status === 'approved');
      const enrichedAds = await Promise.all(
        approved.map(async (ad) => {
          const assignments = await HostService.getHostAdAssignments(user.id);
          const assignedKioskIds = assignments
            .filter(assignment => assignment.ad_id === ad.id)
            .map(assignment => assignment.kiosk_id);
          
          const availableKiosks = kiosksData.filter(
            kiosk => !assignedKioskIds.includes(kiosk.kiosk.id)
          );
          
          return {
            ...ad,
            availableKiosks
          };
        })
      );

      setApprovedAds(enrichedAds);
      
      addNotification('success', 'Quick Assignment Created', 'Ad has been assigned to kiosk immediately for 30 days');
    } catch (error) {
      console.error('Error creating quick assignment:', error);
      addNotification('error', 'Quick Assignment Failed', 'Failed to assign ad to kiosk');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (approvedAds.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Approved Ads
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have any approved ads ready for assignment yet.
          </p>
          <Button onClick={() => navigate('/host/ads')}>
            View All Ads
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Assign Approved Ads
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Your approved ads are ready to be assigned to kiosks
        </p>
      </div>

      {/* Approved Ads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {approvedAds.map((ad) => (
          <Card key={ad.id} className="overflow-hidden">
            <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 overflow-hidden">
              {ad.media_type === 'image' ? (
                <img
                  src={ad.media_url}
                  alt={ad.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={ad.media_url}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {ad.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {ad.description || 'No description'}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{ad.duration}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{ad.availableKiosks.length} available</span>
                </div>
              </div>
              
              {ad.availableKiosks.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Available Kiosks:
                  </div>
                  <div className="space-y-2">
                    {ad.availableKiosks.slice(0, 3).map((kiosk) => (
                      <div key={kiosk.kiosk.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {kiosk.kiosk.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {kiosk.kiosk.location}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleQuickAssign(ad.id, kiosk.kiosk.id)}
                          className="ml-2"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Quick Assign
                        </Button>
                      </div>
                    ))}
                    {ad.availableKiosks.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{ad.availableKiosks.length - 3} more kiosks
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/host/ads/${ad.id}/assign`)}
                      className="flex-1"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Custom Schedule
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/host/ads/${ad.id}/assign`)}
                      className="flex-1"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Assign All
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    All kiosks are already assigned
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/host/ads/${ad.id}/assign`)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Manage Assignments
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          variant="secondary"
          onClick={() => navigate('/host/ads')}
        >
          View All Ads
        </Button>
        <Button
          onClick={() => navigate('/host/ads/upload')}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Upload New Ad
        </Button>
      </div>
    </div>
  );
}
