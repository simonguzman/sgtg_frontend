import { TestBed } from '@angular/core/testing';
import { IndexedDbListStoreService } from './indexed-db-list-store.service';

interface MockIDBRequest<T> {
  result: T;
  error: Error | null;
  onsuccess?: () => void;
  onerror?: () => void;
  onupgradeneeded?: () => void;
}

interface MockIDBObjectStore {
  get: jest.Mock<MockIDBRequest<unknown>, [string]>;
  put: jest.Mock<MockIDBRequest<void>, [unknown, string]>;
}

interface MockIDBTransaction {
  objectStore: jest.Mock<MockIDBObjectStore, [string]>;
  oncomplete?: () => void;
  onerror?: () => void;
  error: Error | null;
}

interface MockIDBDatabase {
  objectStoreNames: { contains: jest.Mock<boolean, [string]> };
  createObjectStore: jest.Mock<void, [string]>;
  transaction: jest.Mock<MockIDBTransaction, [string, IDBTransactionMode]>;
}

describe('IndexedDbListStoreService', () => {
  let service: IndexedDbListStoreService;
  let mockDb: MockIDBDatabase;
  let mockTransaction: MockIDBTransaction;
  let mockObjectStore: MockIDBObjectStore;
  let mockOpenRequest: MockIDBRequest<MockIDBDatabase>;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockObjectStore = {
      get: jest.fn(),
      put: jest.fn()
    };

    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockObjectStore),
      error: null
    };

    mockDb = {
      objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
      createObjectStore: jest.fn(),
      transaction: jest.fn().mockReturnValue(mockTransaction)
    };

    mockOpenRequest = {
      result: mockDb,
      error: null
    };

    const mockIndexedDB = {
      open: jest.fn().mockReturnValue(mockOpenRequest)
    };

    Object.defineProperty(globalThis, 'indexedDB', {
      value: mockIndexedDB,
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [IndexedDbListStoreService]
    });

    service = TestBed.inject(IndexedDbListStoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización de la Base de Datos', () => {
    it('debería abrir la base de datos y crear el object store si no existe', async () => {
      mockDb.objectStoreNames.contains.mockReturnValue(false);
      const getRequestMock: MockIDBRequest<unknown> = { result: null, error: null };
      mockObjectStore.get.mockReturnValue(getRequestMock);
      const getPromise = service.get('test_key');
      mockOpenRequest.onupgradeneeded!();
      mockOpenRequest.onsuccess!();
      await Promise.resolve();
      getRequestMock.onsuccess!();
      await getPromise;
      expect(globalThis.indexedDB.open).toHaveBeenCalledWith('sgtg_local_store', 1);
      expect(mockDb.objectStoreNames.contains).toHaveBeenCalledWith('entries');
      expect(mockDb.createObjectStore).toHaveBeenCalledWith('entries');
    });

    it('debería rechazar la promesa si ocurre un error al abrir la base de datos', async () => {
      const dbError = new Error('Error de conexión DB');
      mockOpenRequest.error = dbError;
      const getPromise = service.get('test_key');
      mockOpenRequest.onerror!();
      await expect(getPromise).rejects.toThrow('Error de conexión DB');
    });
  });

  describe('Operación GET', () => {
    it('debería retornar el valor almacenado exitosamente', async () => {
      const testData = { id: 1, name: 'Tesis' };
      const getRequestMock: MockIDBRequest<unknown> = { result: testData, error: null };
      mockObjectStore.get.mockReturnValue(getRequestMock);
      const promise = service.get<{ id: number, name: string }>('item_key');
      mockOpenRequest.onsuccess!();
      await Promise.resolve();
      getRequestMock.onsuccess!();
      const result = await promise;
      expect(mockDb.transaction).toHaveBeenCalledWith('entries', 'readonly');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('entries');
      expect(mockObjectStore.get).toHaveBeenCalledWith('item_key');
      expect(result).toEqual(testData);
    });

    it('debería rechazar la promesa si la operación GET falla', async () => {
      const getError = new Error('No se pudo leer el registro');
      const getRequestMock: MockIDBRequest<unknown> = { result: null, error: getError };
      mockObjectStore.get.mockReturnValue(getRequestMock);
      const promise = service.get('item_key');
      mockOpenRequest.onsuccess!();
      await Promise.resolve();
      getRequestMock.onerror!();
      await expect(promise).rejects.toThrow('No se pudo leer el registro');
    });
  });

  describe('Operación SET', () => {
    it('debería guardar el valor exitosamente', async () => {
      const payload = { data: 'nueva_info' };
      const promise = service.set('save_key', payload);
      mockOpenRequest.onsuccess!();
      await Promise.resolve();
      mockTransaction.oncomplete!();
      await promise;
      expect(mockDb.transaction).toHaveBeenCalledWith('entries', 'readwrite');
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('entries');
      expect(mockObjectStore.put).toHaveBeenCalledWith(payload, 'save_key');
    });

    it('debería rechazar la promesa si la operación SET falla', async () => {
      const txError = new Error('Cuota excedida o disco lleno');
      mockTransaction.error = txError;
      const promise = service.set('save_key', { data: 'info' });
      mockOpenRequest.onsuccess!();
      await Promise.resolve();
      mockTransaction.onerror!();
      await expect(promise).rejects.toThrow('Cuota excedida o disco lleno');
    });
  });
});
