/**
 * @fileoverview React hook for offline state management
 * Provides online/offline state and sync functionality to components
 */

import { useState, useEffect } from 'react';
import { isOnline, onSyncStateChange, triggerSync } from '../utils/offlineSync';

/**
 * Hook to detect online/offline state and provide sync functionality
 * 
 * @returns {Object} Offline state and utilities
 * @property {boolean} isOnline - Whether device is currently online
 * @property {boolean} isOffline - Whether device is currently offline  
 * @property {Function} sync - Manually trigger sync of pending requests
 * @property {string} syncStatus - Current sync status ('idle', 'syncing', 'synced', 'error')
 * @property {Object|null} lastSyncResults - Results from last sync with synced IDs
 */
export default function useOffline() {
  const [online, setOnline] = useState(isOnline());
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncResults, setLastSyncResults] = useState(null);

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubscribe = onSyncStateChange((state, data) => {
      if (state === 'online') {
        setOnline(true);
      } else if (state === 'offline') {
        setOnline(false);
      } else if (state === 'synced') {
        setSyncStatus('synced');
        setLastSyncResults(data);
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    });

    return unsubscribe;
  }, []);

  const sync = async () => {
    if (!online) {
      return { success: false, message: 'Device is offline' };
    }

    setSyncStatus('syncing');
    try {
      const result = await triggerSync();
      setSyncStatus(result.success ? 'synced' : 'error');
      setLastSyncResults(result.results);
      setTimeout(() => setSyncStatus('idle'), 3000);
      return result;
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
      throw error;
    }
  };

  return {
    isOnline: online,
    isOffline: !online,
    sync,
    syncStatus,
    lastSyncResults
  };
}
