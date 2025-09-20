import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostAd } from '../../services/hostService';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function AdEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [ad, setAd] = useState<HostAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 15
  });

  useEffect(() => {
    const loadAd = async () => {
      if (!id || !user?.id) return;
      
      try {
        setLoading(true);
        const ads = await HostService.getHostAds(user.id);
        const foundAd = ads.find(ad => ad.id === id);
        
        if (!foundAd) {
          addNotification('error', 'Ad Not Found', 'The requested ad could not be found');
          navigate('/host/ads');
          return;
        }
        
        setAd(foundAd);
        setFormData({
          name: foundAd.name,
          description: foundAd.description || '',
          duration: foundAd.duration
        });
      } catch (error) {
        console.error('Error loading ad:', error);
        addNotification('error', 'Error', 'Failed to load ad');
        navigate('/host/ads');
      } finally {
        setLoading(false);
      }
    };

    loadAd();
  }, [id, user?.id, addNotification, navigate]);

  const handleSave = async () => {
    if (!ad || !user?.id) return;
    
    try {
      setSaving(true);
      
      // Update ad details
      const { error } = await HostService.updateAd(ad.id, {
        name: formData.name,
        description: formData.description,
        duration: formData.duration
      });
      
      if (error) throw error;
      
      addNotification('success', 'Ad Updated', 'Ad details have been updated successfully');
      navigate('/host/ads');
    } catch (error) {
      console.error('Error updating ad:', error);
      addNotification('error', 'Update Failed', 'Failed to update ad details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Ad Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The requested ad could not be found.
        </p>
        <Button onClick={() => navigate('/host/ads')}>
          Back to Ads
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => navigate('/host/ads')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ads
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Ad</h1>
          <p className="text-gray-600 dark:text-gray-400">Update your ad details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ad Preview */}
        <div className="lg:col-span-1">
          <Card title="Current Ad">
            <div className="space-y-4">
              <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
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
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Media Type:</strong> {ad.media_type}</p>
                <p><strong>Status:</strong> {ad.status.replace('_', ' ')}</p>
                <p><strong>Created:</strong> {new Date(ad.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <Card title="Edit Ad Details">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ad Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter ad name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe your ad (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (seconds) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 15 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Duration must be between 1 and 15 seconds
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/host/ads')}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  loading={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
