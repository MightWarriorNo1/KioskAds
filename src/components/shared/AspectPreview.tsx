import React from 'react';

interface AspectPreviewProps {
  src: string;
  type: 'image' | 'video';
  className?: string;
  rounded?: string; // e.g. 'rounded-lg'
}

export default function AspectPreview({ src, type, className = '', rounded = 'rounded-lg' }: AspectPreviewProps) {
  return (
    <div
      className={`mx-auto shadow-lg border border-gray-200 dark:border-gray-700 bg-black ${rounded} ${className}`}
      style={{ width: '270px' }}
    >
      {/* 9:16 frame using CSS aspect-ratio to avoid plugin dependency */}
      <div style={{ aspectRatio: '9 / 16' }} className={`w-full ${rounded} overflow-hidden bg-black`}>
        {type === 'image' ? (
          <img src={src} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <video src={src} controls className="w-full h-full object-cover" />
        )}
      </div>
    </div>
  );
}


