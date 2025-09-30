import React from 'react';

export default function TestNotification() {
  return (
    <div className="fixed bottom-4 left-4 z-[9999] max-w-sm bg-green-500 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
          <span className="text-green-500 font-bold">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            Anna from Montreal
          </div>
          <div className="text-sm opacity-90">
            just purchased
          </div>
          <div className="text-xs opacity-75">
            Today
          </div>
        </div>
        <button className="text-white hover:text-gray-200">
          ×
        </button>
      </div>
    </div>
  );
}

