import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Maximize2, AlertCircle } from 'lucide-react';

interface PhonePreviewProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  title?: string;
  className?: string;
}

export default function PhonePreview({ 
  mediaUrl, 
  mediaType, 
  title = "Ad Preview",
  className = "" 
}: PhonePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug logging
  console.log('PhonePreview Props:', { mediaUrl, mediaType, title, className });
  
  // Check if mediaUrl is valid
  const isValidUrl = mediaUrl && (mediaUrl.startsWith('http') || mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:'));
  console.log('Is Valid URL:', isValidUrl, 'URL:', mediaUrl);
  
  // Additional validation for common URL patterns
  const isSupabaseUrl = mediaUrl && mediaUrl.includes('supabase');
  const isLocalUrl = mediaUrl && (mediaUrl.startsWith('/') || mediaUrl.startsWith('./'));
  console.log('URL Analysis:', { isSupabaseUrl, isLocalUrl, hasMediaUrl: !!mediaUrl });

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-[2.5rem] p-2 shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''} ${className}`}
      style={{
        width: isFullscreen ? '100vw' : '280px',
        height: isFullscreen ? '100vh' : '560px',
        maxWidth: isFullscreen ? 'none' : '280px',
        maxHeight: isFullscreen ? 'none' : '560px',
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Phone Frame */}
      <div className="relative w-full h-full bg-gray-900 rounded-[2rem] overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10"></div>
        
        {/* Screen Content */}
        <div className="w-full h-full bg-black relative">
          {hasError || !mediaUrl || !isValidUrl ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Preview not available</p>
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
            <div className={`absolute inset-0 bg-black bg-opacity-0 transition-opacity duration-300 ${showControls ? 'bg-opacity-30' : ''}`}>
              {/* Play/Pause Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={togglePlayPause}
                  className={`bg-black bg-opacity-50 rounded-full p-3 transition-all duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white ml-1" />
                  )}
                </button>
              </div>

              {/* Bottom Controls */}
              <div className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={togglePlayPause}
                      className="bg-black bg-opacity-50 rounded-full p-2"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-white ml-0.5" />
                      )}
                    </button>
                    
                    <button
                      onClick={toggleMute}
                      className="bg-black bg-opacity-50 rounded-full p-2"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4 text-white" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-white" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          videoRef.current.play();
                        }
                      }}
                      className="bg-black bg-opacity-50 rounded-full p-2"
                    >
                      <RotateCcw className="h-4 w-4 text-white" />
                    </button>
                    
                    <button
                      onClick={toggleFullscreen}
                      className="bg-black bg-opacity-50 rounded-full p-2"
                    >
                      <Maximize2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Controls */}
          {mediaType === 'image' && (
            <div className={`absolute top-4 right-4 transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              <button
                onClick={toggleFullscreen}
                className="bg-black bg-opacity-50 rounded-full p-2"
              >
                <Maximize2 className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full opacity-60"></div>
      </div>

      {/* Title Overlay */}
      <div className="absolute top-8 left-4 right-4 z-20">
        <div className="bg-black bg-opacity-50 rounded-lg px-3 py-1">
          <p className="text-white text-sm font-medium truncate">{title}</p>
        </div>
      </div>
    </div>
  );
}