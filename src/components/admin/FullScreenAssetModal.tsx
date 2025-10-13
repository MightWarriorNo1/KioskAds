import { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Download, Maximize2, Minimize2 } from 'lucide-react';

interface FullScreenAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  title?: string;
  fileName?: string;
}

export default function FullScreenAssetModal({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  title = "Ad Asset",
  fileName
}: FullScreenAssetModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Auto-play video when modal opens (muted)
  useEffect(() => {
    if (isOpen && mediaType === 'video' && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, [isOpen, mediaType, mediaUrl]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  const toggleFullscreen = async () => {
    if (!modalRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await modalRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const downloadAsset = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName || 'asset';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="relative w-full h-full flex flex-col items-center justify-center"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-all duration-200"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-16 z-10 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-all duration-200"
        >
          {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
        </button>

        {/* Download Button */}
        <button
          onClick={downloadAsset}
          className="absolute top-4 right-28 z-10 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-all duration-200"
        >
          <Download className="h-6 w-6" />
        </button>

        {/* Media Container */}
        <div className="relative w-full h-full flex items-center justify-center">
          {hasError || !mediaUrl ? (
            <div className="text-center text-white">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-semibold mb-2">Preview not available</h3>
              <p className="text-gray-300">Unable to load media</p>
            </div>
          ) : mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="max-w-full max-h-full object-contain"
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
              className="max-w-full max-h-full object-contain"
              onError={() => setHasError(true)}
            />
          )}

          {/* Video Controls Overlay */}
          {mediaType === 'video' && (
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                showControls ? 'bg-black bg-opacity-30' : 'bg-opacity-0'
              }`}
            >
              <button
                onClick={togglePlayPause}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-4 transition-all duration-200"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 text-gray-800" />
                ) : (
                  <Play className="h-8 w-8 text-gray-800 ml-1" />
                )}
              </button>
            </div>
          )}

          {/* Mute/Unmute Button for Video */}
          {mediaType === 'video' && (
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-3 transition-all duration-200"
            >
              {isMuted ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </button>
          )}
        </div>

        {/* Title and Info */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <h3 className="text-white text-lg font-semibold mb-1">{title}</h3>
          {fileName && (
            <p className="text-gray-300 text-sm">{fileName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
