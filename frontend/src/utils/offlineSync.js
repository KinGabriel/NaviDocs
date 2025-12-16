/**
 * @fileoverview Offline synchronization manager
 * Handles queuing API requests when offline and syncing when online
 */

import { 
  queueRequest, 
  getPendingRequests, 
  deletePendingRequest,
  getUnsyncedFieldValues,
  markFieldValuesSynced
} from './offlineStorage';
import { updateDocumentFieldValuesAPI } from '../api/documentsAPI';

// Online/offline state
let isOnlineState = navigator.onLine;
let syncInProgress = false;
const syncCallbacks = new Set();

/**
 * Check if currently online
 */
export function isOnline() {
  return isOnlineState;
}

/**
 * Initialize offline sync listeners
 */
export function initOfflineSync() {
  // Update online state
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Attempt sync on visibility change (when user returns to app)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isOnline()) {
      syncPendingRequests();
    }
  });

  // Register for Background Sync if available
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(swRegistration => {
      // Service worker can request sync
      return swRegistration.sync.register('sync-offline-data');
    }).catch(err => {
      console.warn('[OfflineSync] Background Sync not available:', err);
    });
  }

  // Initial sync if online
  if (isOnline()) {
    syncPendingRequests();
  }

  console.log('[OfflineSync] Initialized, online:', isOnlineState);
}

/**
 * Handle coming online
 */
function handleOnline() {
  console.log('[OfflineSync] Connection restored');
  isOnlineState = true;
  notifySyncCallbacks('online');
  
  // Attempt to sync pending requests
  setTimeout(() => syncPendingRequests(), 1000);
}

/**
 * Handle going offline
 */
function handleOffline() {
  console.log('[OfflineSync] Connection lost');
  isOnlineState = false;
  notifySyncCallbacks('offline');
}

/**
 * Register callback for online/offline state changes
 */
export function onSyncStateChange(callback) {
  syncCallbacks.add(callback);
  
  // Return unsubscribe function
  return () => syncCallbacks.delete(callback);
}

/**
 * Notify all callbacks
 */
function notifySyncCallbacks(state, data = null) {
  syncCallbacks.forEach(callback => {
    try {
      callback(state, data);
    } catch (err) {
      console.error('[OfflineSync] Callback error:', err);
    }
  });
}

/**
 * Queue an API request for later execution when online
 */
export async function queueApiRequest(method, url, data, options = {}) {
  const requestData = {
    method,
    url,
    data,
    options,
    type: options.type || 'generic'
  };

  await queueRequest(requestData);
  console.log('[OfflineSync] Queued request:', method, url);
}

/**
 * Sync all pending requests
 */
export async function syncPendingRequests() {
  if (!isOnline() || syncInProgress) {
    return { success: false, message: 'Sync already in progress or offline' };
  }

  syncInProgress = true;
  console.log('[OfflineSync] Starting sync...');

  try {
    // Sync field values first
    const fieldValueResults = await syncFieldValues();

    // Sync other pending requests
    const pending = await getPendingRequests();
    console.log(`[OfflineSync] Found ${pending.length} pending requests`);

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      syncedDocuments: fieldValueResults.syncedDocuments || [],
      syncedTemplates: []
    };

    for (const request of pending) {
      try {
        await executeQueuedRequest(request);
        await deletePendingRequest(request.id);
        results.success++;
        
        // Track what was synced
        if (request.options?.type === 'field-values' && request.options?.documentId) {
          results.syncedDocuments.push(request.options.documentId);
        } else if (request.options?.type === 'update-template' && request.options?.templateId) {
          results.syncedTemplates.push(request.options.templateId);
        }
        
        console.log('[OfflineSync] Synced request:', request.id, request.options?.type);
      } catch (error) {
        results.failed++;
        results.errors.push({ id: request.id, error: error.message });
        console.error('[OfflineSync] Failed to sync request:', request.id, error);
        
        // Delete request after 3 failed attempts
        if (request.retryCount >= 2) {
          await deletePendingRequest(request.id);
          console.log('[OfflineSync] Removed failed request after 3 attempts:', request.id);
        }
      }
    }

    // Notify callbacks with sync results
    notifySyncCallbacks('synced', results);
    
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('offline:synced', { 
      detail: results 
    }));
    
    console.log('[OfflineSync] Sync complete:', results);
    
    return { success: true, results };
  } catch (error) {
    console.error('[OfflineSync] Sync error:', error);
    return { success: false, error: error.message };
  } finally {
    syncInProgress = false;
  }
}

/**
 * Sync unsynced field values
 */
async function syncFieldValues() {
  const syncedDocuments = [];
  
  try {
    const unsynced = await getUnsyncedFieldValues();
    console.log(`[OfflineSync] Syncing ${unsynced.length} field value changes`);

    for (const item of unsynced) {
      try {
        await updateDocumentFieldValuesAPI(item.documentId, item.fieldValues);
        await markFieldValuesSynced(item.documentId);
        syncedDocuments.push(item.documentId);
        console.log('[OfflineSync] Synced field values for document:', item.documentId);
      } catch (error) {
        console.error('[OfflineSync] Failed to sync field values:', item.documentId, error);
      }
    }
    
    return { syncedDocuments };
  } catch (error) {
    console.error('[OfflineSync] Error syncing field values:', error);
    return { syncedDocuments };
  }
}

/**
 * Execute a queued request
 */
async function executeQueuedRequest(request) {
  const { method, url, data, options } = request;

  // Use fetch or axios depending on your setup
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Manually trigger sync
 */
export function triggerSync() {
  if (isOnline()) {
    return syncPendingRequests();
  }
  return Promise.resolve({ success: false, message: 'Device is offline' });
}
