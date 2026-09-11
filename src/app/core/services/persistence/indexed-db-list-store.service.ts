import { Injectable } from '@angular/core';

const DB_NAME = 'sgtg_local_store';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

/**
 * Reemplazo mínimo de localStorage.getItem/setItem, pero respaldado por
 * IndexedDB — sin el límite de 5-10MB que causaba QuotaExceededError con
 * documentos en base64. Un solo objectStore key-value: cada dominio
 * (anteproyectos, trabajos de grado, propuestas) guarda su lista completa
 * bajo su propia clave, igual que antes hacían con localStorage.
 */
@Injectable({ providedIn: 'root' })
export class IndexedDbListStoreService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
