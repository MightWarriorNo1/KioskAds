import React, { useState } from 'react';
import { Play, Image, Video, Smartphone } from 'lucide-react';
import PhonePreview from './PhonePreview';

export default function PhonePreviewDemo() {
  const [selectedDemo, setSelectedDemo] = useState<'image' | 'video'>('image');

  // Demo media URLs - you can replace these with actual media URLs
  const demoMedia = {
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=800&fit=crop',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Phone Preview Demo
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Preview how ads will look on mobile devices
        </p>
      </div>

      {/* Demo Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setSelectedDemo('image')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            selectedDemo === 'image'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Image className="h-4 w-4" />
          <span>Image Demo</span>
        </button>
        <button
          onClick={() => setSelectedDemo('video')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            selectedDemo === 'video'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Video className="h-4 w-4" />
          <span>Video Demo</span>
        </button>
      </div>

      {/* Phone Preview */}
      <div className="flex justify-center">
        <PhonePreview
          mediaUrl={demoMedia[selectedDemo]}
          mediaType={selectedDemo}
          title={`Demo ${selectedDemo === 'image' ? 'Image' : 'Video'} Ad`}
          className="w-64 h-96"
        />
      </div>

      {/* Features List */}
      <div className="max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Phone Preview Features
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Realistic Phone Frame</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Authentic iPhone-style design with notch and home indicator
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Play className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Video Controls</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Play/pause, mute/unmute, restart, and fullscreen controls
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Image className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Image Support</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                High-quality image display with fullscreen option
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Video className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Auto-play Videos</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Videos start playing automatically (muted) for better preview
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
