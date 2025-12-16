/**
 * @fileoverview IndexedDB wrapper for offline storage of documents, templates, and field values
 * Provides a simple API for storing and retrieving data when offline
 */

const DB_NAME = 'NaviDocsOffline';
const DB_VERSION = 1;

// Store names
const STORES = {
  DOCUMENTS: 'documents',
  TEMPLATES: 'templates',
  FIELD_VALUES: 'fieldValues',
  PENDING_REQUESTS: 'pendingRequests',
  CACHE_META: 'cacheMeta'
};

/**
 * Initialize IndexedDB database
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Documents store (for viewing offline)
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: '_id' });
        docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Templates store
      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: '_id' });
        templateStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Field values store (for offline editing)
      if (!db.objectStoreNames.contains(STORES.FIELD_VALUES)) {
        const fieldStore = db.createObjectStore(STORES.FIELD_VALUES, { keyPath: 'documentId' });
        fieldStore.createIndex('lastModified', 'lastModified', { unique: false });
        fieldStore.createIndex('synced', 'synced', { unique: false });
      }

      // Pending requests store (for background sync)
      if (!db.objectStoreNames.contains(STORES.PENDING_REQUESTS)) {
        const requestStore = db.createObjectStore(STORES.PENDING_REQUESTS, { keyPath: 'id', autoIncrement: true });
        requestStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Cache metadata store
      if (!db.objectStoreNames.contains(STORES.CACHE_META)) {
        db.createObjectStore(STORES.CACHE_META, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Generic get operation
 */
async function getItem(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic put operation
 */
async function putItem(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic delete operation
 */
async function deleteItem(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all items from a store
 */
async function getAllItems(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// === Document Operations ===

export async function saveDocumentOffline(document) {
  const docWithTimestamp = {
    ...document,
    _offlineCache: {
      cachedAt: Date.now(),
      updatedAt: document.updatedAt || Date.now()
    }
  };
  return putItem(STORES.DOCUMENTS, docWithTimestamp);
}

export async function getDocumentOffline(documentId) {
  return getItem(STORES.DOCUMENTS, documentId);
}

export async function deleteDocumentOffline(documentId) {
  return deleteItem(STORES.DOCUMENTS, documentId);
}

// === Template Operations ===

export async function saveTemplateOffline(template) {
  const templateWithTimestamp = {
    ...template,
    _offlineCache: {
      cachedAt: Date.now(),
      updatedAt: template.updatedAt || Date.now()
    }
  };
  return putItem(STORES.TEMPLATES, templateWithTimestamp);
}

export async function getTemplateOffline(templateId) {
  return getItem(STORES.TEMPLATES, templateId);
}

// === Field Values Operations ===

export async function saveFieldValuesOffline(documentId, fieldValues) {
  const data = {
    documentId,
    fieldValues,
    lastModified: Date.now(),
    synced: false
  };
  return putItem(STORES.FIELD_VALUES, data);
}

export async function getFieldValuesOffline(documentId) {
  return getItem(STORES.FIELD_VALUES, documentId);
}

export async function markFieldValuesSynced(documentId) {
  const data = await getFieldValuesOffline(documentId);
  if (data) {
    data.synced = true;
    data.syncedAt = Date.now();
    return putItem(STORES.FIELD_VALUES, data);
  }
}

export async function getUnsyncedFieldValues() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.FIELD_VALUES], 'readonly');
    const store = transaction.objectStore(STORES.FIELD_VALUES);
    const index = store.index('synced');
    const request = index.getAll(false);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// === Pending Requests Queue ===

export async function queueRequest(requestData) {
  const request = {
    ...requestData,
    timestamp: Date.now(),
    retryCount: 0
  };
  return putItem(STORES.PENDING_REQUESTS, request);
}

export async function getPendingRequests() {
  return getAllItems(STORES.PENDING_REQUESTS);
}

export async function deletePendingRequest(requestId) {
  return deleteItem(STORES.PENDING_REQUESTS, requestId);
}

// === Cache Metadata ===

export async function setCacheMeta(key, value) {
  return putItem(STORES.CACHE_META, { key, value, timestamp: Date.now() });
}

export async function getCacheMeta(key) {
  const result = await getItem(STORES.CACHE_META, key);
  return result?.value;
}

// === Cleanup old cache ===

export async function cleanupOldCache(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
  const now = Date.now();
  const db = await openDB();

  const stores = [STORES.DOCUMENTS, STORES.TEMPLATES];
  
  for (const storeName of stores) {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const item = cursor.value;
        if (item._offlineCache && (now - item._offlineCache.cachedAt) > maxAge) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }
}
