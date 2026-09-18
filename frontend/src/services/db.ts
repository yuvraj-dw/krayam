/**
 * Krayam IndexedDB Offline Operational Storage
 * Provides persistent local storage for operational data and offline action queues
 * without relying on localStorage for operational records.
 */

export interface OfflineActionRecord {
  id: string; // UUID client_event_id
  actionType:
    | 'BOOKING_CREATE'
    | 'BOOKING_CANCEL'
    | 'BOOKING_RESCHEDULE'
    | 'CHECK_IN'
    | 'CALL_NEXT'
    | 'START_PROCESSING'
    | 'COMPLETE_PROCESSING'
    | 'COMPLETE_PROCUREMENT'
    | 'CONFIRM_PAYMENT'
    | 'MARK_NO_SHOW'
    | 'CANCEL_BOOKING'
    | 'RESCHEDULE'
    | string;
  entityType: 'booking' | 'queue' | 'procurement' | 'payment';
  entityId: string;
  payload: any;
  expectedCurrentState?: any;
  createdAt: string;
  retryCount: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  lastError?: string;
  details?: string;
}

const DB_NAME = 'krayam_offline_db';
const DB_VERSION = 1;

const STORES = {
  OPERATIONAL_CACHE: 'operational_cache',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata',
} as const;

class OfflineDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Key-value store for operational cache (crops, centres, farmer profile, etc.)
        if (!db.objectStoreNames.contains(STORES.OPERATIONAL_CACHE)) {
          db.createObjectStore(STORES.OPERATIONAL_CACHE);
        }

        // 2. Persistent queue for offline write actions
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 3. Metadata store (lastSuccessfulSync, connection status, etc.)
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  // --- Operational Cache Methods ---
  async getOperationalData<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.OPERATIONAL_CACHE, 'readonly');
        const store = tx.objectStore(STORES.OPERATIONAL_CACHE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error getting ${key} from operational cache:`, err);
      return null;
    }
  }

  async setOperationalData<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.OPERATIONAL_CACHE, 'readwrite');
        const store = tx.objectStore(STORES.OPERATIONAL_CACHE);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error saving ${key} to operational cache:`, err);
    }
  }

  // --- Sync Queue Methods ---
  async enqueueAction(action: OfflineActionRecord): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.put(action);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[IndexedDB] Failed to enqueue offline action:', err);
      throw err;
    }
  }

  async getPendingActions(): Promise<OfflineActionRecord[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const index = store.index('status');
        const req = index.getAll('PENDING');
        req.onsuccess = () => {
          const list = req.result as OfflineActionRecord[];
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[IndexedDB] Error retrieving pending actions:', err);
      return [];
    }
  }

  async getAllActions(): Promise<OfflineActionRecord[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result as OfflineActionRecord[];
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[IndexedDB] Error retrieving all actions:', err);
      return [];
    }
  }

  async updateAction(id: string, updates: Partial<OfflineActionRecord>): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (!getReq.result) {
            resolve();
            return;
          }
          const updated = { ...getReq.result, ...updates };
          const putReq = store.put(updated);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error updating action ${id}:`, err);
    }
  }

  async deleteAction(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error deleting action ${id}:`, err);
    }
  }

  async clearSyncedActions(): Promise<void> {
    try {
      const actions = await this.getAllActions();
      const synced = actions.filter((a) => a.status === 'SYNCED');
      for (const a of synced) {
        await this.deleteAction(a.id);
      }
    } catch (err) {
      console.warn('[IndexedDB] Error clearing synced actions:', err);
    }
  }

  // --- Metadata Methods ---
  async getMetadata<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.METADATA, 'readonly');
        const store = tx.objectStore(STORES.METADATA);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error getting metadata ${key}:`, err);
      return null;
    }
  }

  async setMetadata<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.METADATA, 'readwrite');
        const store = tx.objectStore(STORES.METADATA);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error setting metadata ${key}:`, err);
    }
  }
}

export const offlineDb = new OfflineDB();
