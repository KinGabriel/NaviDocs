/**
 * @fileoverview Banner to show when viewing cached/offline data
 */

import React from 'react';
import { Database, RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * Shows a banner when viewing cached or offline data
 * @param {boolean} isFromCache - Whether data is from cache
 * @param {boolean} isOffline - Whether currently offline
 * @param {Function} onRefresh - Optional refresh callback
 */
export default function CachedDataBanner({ isFromCache, isOffline, onRefresh, className = '' }) {
  if (!isFromCache && !isOffline) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {isOffline ? 'Offline Mode - Viewing Cached Data' : 'Viewing Cached Data'}
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              {isOffline 
                ? 'You can continue editing. Changes will sync when you\'re back online.'
                : 'This may not be the latest version. Click refresh to update.'}
            </p>
          </div>
        </div>
        {onRefresh && !isOffline && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
