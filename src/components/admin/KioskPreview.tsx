import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';

interface KioskPreviewProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  title?: string;
  className?: string;
}

export default function KioskPreview({ 
  mediaUrl, 
  mediaType, 
  title = "Ad Preview",
  className = "" 
}: KioskPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Check if mediaUrl is valid
  const isValidUrl = mediaUrl && (mediaUrl.startsWith('http') || mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:'));

  // Auto-play video when component mounts (muted)
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, [mediaType, mediaUrl]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Kiosk Frame - matches the image exactly */}
      <div className="relative w-full h-full flex flex-col items-center">
        {/* Main Display Unit - Black frame with white screen */}
        <div className="relative bg-black rounded-[0.5rem] w-full flex-1 min-h-[180px] flex flex-col">
          {/* Top Bezel - Thicker than sides */}
          <div className="h-8 bg-black rounded-t-[0.5rem] flex items-center justify-center">
            {/* Two small circular dots at the top center */}
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
          </div>
          
          {/* White Screen Area - 9:16 aspect ratio */}
          <div className="flex-1 bg-white relative overflow-hidden mx-2 mb-2">
            {hasError || !mediaUrl || !isValidUrl ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs">Preview not available</p>
                  <p className="text-xs text-gray-500 mt-1">URL: {mediaUrl || 'No URL'}</p>
                  {!mediaUrl && <p className="text-xs text-gray-500 mt-1">No media URL provided</p>}
                  {mediaUrl && !isValidUrl && <p className="text-xs text-gray-500 mt-1">Invalid URL format</p>}
                  {hasError && <p className="text-xs text-gray-500 mt-1">Media failed to load</p>}
                </div>
              </div>
            ) : mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                className="w-full h-full object-cover"
                muted={isMuted}
                loop
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleVideoEnd}
                onClick={togglePlayPause}
                onError={() => setHasError(true)}
              />
            ) : (
              <img
                src={mediaUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={() => setHasError(true)}
              />
            )}

            {/* Video Controls Overlay */}
            {mediaType === 'video' && (
              <div
                className={`absolute inset-0 bg-black bg-opacity-0 flex items-center justify-center transition-opacity duration-200 ${
                  showControls ? 'bg-opacity-30' : 'bg-opacity-0'
                }`}
              >
                <button
                  onClick={togglePlayPause}
                  className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 text-gray-800" />
                  ) : (
                    <Play className="h-4 w-4 text-gray-800 ml-0.5" />
                  )}
                </button>
              </div>
            )}

            {/* Mute/Unmute Button for Video */}
            {mediaType === 'video' && (
              <button
                onClick={toggleMute}
                className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-1.5 transition-all duration-200"
              >
                {isMuted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Upper Base Element - Light gray horizontal bar */}
        <div className="w-4/5 h-3 bg-gray-300 rounded-sm"></div>

        {/* Main Base - Black rectangular block with rounded corners */}
        <div className="w-full bg-black rounded-[0.5rem] h-6 mt-1"></div>
      </div>
    </div>
  );
}