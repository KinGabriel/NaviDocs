/**
 * @fileoverview API wrapper for offline-first functionality
 * Wraps API calls to cache responses and queue requests when offline
 */

import { 
  saveDocumentOffline, 
  getDocumentOffline,
  saveTemplateOffline,
  getTemplateOffline,
  saveFieldValuesOffline,
  getFieldValuesOffline
} from './offlineStorage';
import { isOnline, queueApiRequest } from './offlineSync';

/**
 * Wrapper for document fetch API calls with offline support
 * Returns cached version if offline
 */
export async function fetchDocumentWithOffline(documentId, fetchFn) {
  try {
    if (isOnline()) {
      // Try to fetch from server
      const document = await fetchFn(documentId);
      
      // Cache for offline use
      await saveDocumentOffline(document);
      
      return { data: document, source: 'network' };
    } else {
      // Return cached version
      const cached = await getDocumentOffline(documentId);
      if (cached) {
        return { data: cached, source: 'cache', offline: true };
      }
      throw new Error('Document not available offline');
    }
  } catch (error) {
    // If online fetch fails, try cache
    if (isOnline()) {
      try {
        const cached = await getDocumentOffline(documentId);
        if (cached) {
          console.warn('[OfflineAPI] Using cached version due to network error');
          return { data: cached, source: 'cache', stale: true };
        }
      } catch (cacheError) {
        console.error('[OfflineAPI] Cache lookup failed:', cacheError);
      }
    }
    throw error;
  }
}

/**
 * Wrapper for template fetch API calls with offline support
 */
export async function fetchTemplateWithOffline(templateId, fetchFn) {
  try {
    if (isOnline()) {
      const template = await fetchFn(templateId);
      await saveTemplateOffline(template);
      return { data: template, source: 'network' };
    } else {
      const cached = await getTemplateOffline(templateId);
      if (cached) {
        return { data: cached, source: 'cache', offline: true };
      }
      throw new Error('Template not available offline');
    }
  } catch (error) {
    if (isOnline()) {
      try {
        const cached = await getTemplateOffline(templateId);
        if (cached) {
          console.warn('[OfflineAPI] Using cached template due to network error');
          return { data: cached, source: 'cache', stale: true };
        }
      } catch (cacheError) {
        console.error('[OfflineAPI] Template cache lookup failed:', cacheError);
      }
    }
    throw error;
  }
}

/**
 * Wrapper for field values update with offline support
 * Queues update when offline
 */
export async function updateFieldValuesWithOffline(documentId, fieldValues, updateFn) {
  // Always save locally first for instant UI feedback
  await saveFieldValuesOffline(documentId, fieldValues);

  if (isOnline()) {
    try {
      // Try to update server
      const result = await updateFn(documentId, fieldValues);
      return { success: true, data: result, source: 'network' };
    } catch (error) {
      console.warn('[OfflineAPI] Failed to update server, will retry when online');
      // Queue for later sync
      await queueApiRequest('PATCH', `/api/documents/${documentId}/field-values`, { field_values: fieldValues }, { type: 'field-values' });
      return { success: true, queued: true, error: error.message };
    }
  } else {
    // Queue for when we're back online
    await queueApiRequest('PATCH', `/api/documents/${documentId}/field-values`, { field_values: fieldValues }, { type: 'field-values' });
    return { success: true, offline: true, queued: true };
  }
}

/**
 * Get field values with offline fallback
 */
export async function getFieldValuesWithOffline(documentId) {
  // Always check local cache first
  const cached = await getFieldValuesOffline(documentId);
  
  if (cached) {
    return {
      data: cached.fieldValues,
      source: 'cache',
      synced: cached.synced,
      lastModified: cached.lastModified
    };
  }
  
  return { data: null, source: 'none' };
}

/**
 * Generic offline-first API wrapper
 */
export async function offlineFirstRequest(url, options = {}, cacheFn, fetchFn) {
  try {
    if (isOnline()) {
      const result = await fetchFn();
      if (cacheFn) await cacheFn(result);
      return { data: result, source: 'network' };
    } else {
      if (cacheFn) {
        const cached = await cacheFn();
        if (cached) {
          return { data: cached, source: 'cache', offline: true };
        }
      }
      throw new Error('Not available offline');
    }
  } catch (error) {
    if (isOnline() && cacheFn) {
      try {
        const cached = await cacheFn();
        if (cached) {
          return { data: cached, source: 'cache', stale: true };
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    throw error;
  }
}
