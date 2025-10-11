import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Monitor, MapPin, Calendar, Clock, Eye, TrendingUp, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { HostService, HostAd } from '../../services/hostService';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function AdPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [ad, setAd] = useState<HostAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    <div className="max-w-6xl mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ad Preview</h1>
          <p className="text-gray-600 dark:text-gray-400">Preview how your ad will appear on kiosks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview Area */}
        <div className="lg:col-span-2">
          <Card title="Kiosk Preview" subtitle="How your ad will appear on the kiosk screen">
            <div className="space-y-4">
              {/* Kiosk Frame */}
              <div className="relative bg-gray-900 rounded-lg p-4 mx-auto max-w-sm">
                <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden relative">
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
                      onLoadedMetadata={(e) => {
                        setDuration(e.currentTarget.duration);
                      }}
                      onTimeUpdate={(e) => {
                        setCurrentTime(e.currentTarget.currentTime);
                      }}
                      onEnded={() => setIsPlaying(false)}
                      ref={(video) => {
                        if (video) {
                          if (isPlaying) {
                            video.play();
                          } else {
                            video.pause();
                          }
                        }
                      }}
                    />
                  )}
                  
                  {/* Overlay Controls for Video */}
                  {ad.media_type === 'video' && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePlayPause}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={handleRestart}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-xs">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Kiosk Frame Border */}
                <div className="absolute inset-0 border-2 border-gray-700 rounded-lg pointer-events-none"></div>
              </div>
              
              {/* Preview Info */}
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This is how your ad will appear on the kiosk screen
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Aspect ratio: 9:16 (Portrait) • Resolution: 1080×1920 or 2160×3840
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Ad Details */}
        <div className="space-y-6">
          <Card title="Ad Details">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{ad.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {ad.description || 'No description provided'}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {ad.duration} seconds
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Media Type</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {ad.media_type}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(ad.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    ad.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    ad.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    ad.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                    ad.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    ad.status === 'paused' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                  }`}>
                    {ad.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card title="Actions">
            <div className="space-y-3">
              <Button
                onClick={() => navigate(`/host/ads/${ad.id}/assign`)}
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Assign to Kiosks
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => navigate(`/host/ads/${ad.id}/edit`)}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Ad
              </Button>
              
              {ad.status === 'draft' && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await HostService.submitAdForReview(ad.id);
                      addNotification('success', 'Submitted for Review', 'Ad has been submitted for review');
                      navigate('/host/ads');
                    } catch (error) {
                      addNotification('error', 'Submission Failed', 'Failed to submit ad for review');
                    }
                  }}
                  className="w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Submit for Review
                </Button>
              )}
            </div>
          </Card>

          {/* Technical Info */}
          <Card title="Technical Information">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">File Size</span>
                <span className="text-gray-900 dark:text-white">
                  {ad.media_url ? 'Loading...' : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Format</span>
                <span className="text-gray-900 dark:text-white">
                  {ad.media_type === 'image' ? 'JPG/PNG' : 'MP4'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Aspect Ratio</span>
                <span className="text-gray-900 dark:text-white">9:16</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Resolution</span>
                <span className="text-gray-900 dark:text-white">1080×1920 / 2160×3840</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
