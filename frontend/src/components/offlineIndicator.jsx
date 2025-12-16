/**
 * @fileoverview Offline status indicator component
 * Shows online/offline status and sync progress
 */

import React from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react';
import useOffline from '../hooks/useOffline';

export default function OfflineIndicator({ className = '', showWhenOnline = false }) {
  const { isOnline, isOffline, sync, syncStatus } = useOffline();

  const handleSync = async () => {
    try {
      const result = await sync();
      if (result.success) {
        console.log('Sync successful:', result);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  // Don't show when online and idle unless forced
  if (isOnline && syncStatus === 'idle' && !showWhenOnline) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isOffline && (
        <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-lg shadow-sm border border-orange-200">
          <WifiOff className="w-4 h-4" />
          <span className="font-medium">Offline</span>
          <span className="text-xs opacity-75">• Changes saved locally</span>
        </div>
      )}

      {isOnline && syncStatus === 'syncing' && (
        <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg shadow-sm border border-blue-200">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="font-medium">Syncing...</span>
        </div>
      )}

      {isOnline && syncStatus === 'synced' && (
        <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-lg shadow-sm border border-green-200">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">All changes synced</span>
        </div>
      )}

      {isOnline && syncStatus === 'error' && (
        <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1.5 rounded-lg shadow-sm border border-red-200">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">Sync Failed</span>
          <button
            onClick={handleSync}
            className="ml-2 px-2 py-1 bg-red-200 hover:bg-red-300 rounded text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      
      {showWhenOnline && isOnline && syncStatus === 'idle' && (
        <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
          <Wifi className="w-4 h-4" />
          <span className="text-sm">Online</span>
        </div>
      )}
    </div>
  );
}
