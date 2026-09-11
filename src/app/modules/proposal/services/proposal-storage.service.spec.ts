import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ProposalStorageService } from './proposal-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserService } from '../../users/services/user.service';
import { IndexedDbListStoreService } from '../../../core/services/persistence/indexed-db-list-store.service';

import { Proposal } from '../interfaces/proposal.interface';
import { User } from '../../users/interfaces/user.interface';
import { Modality } from '../enums/modality.enum';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

// ── Utilidad para drenar Promesas Nativas en Jest ────────────────────────────
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// ── Mocks Estrictos de Servicios ─────────────────────────────────────────────
interface MockIndexedDbStore {
  get: jest.Mock<Promise<unknown>, [string]>;
  set: jest.Mock<Promise<void>, [string, unknown]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Título de Prueba',
  description: 'Descripción',
  modality: Modality.TI,
  authors: [],
  director: createMockUser({ id: 'default-dir' }),
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  isActive: true,
  isArchived: false,
  ...overrides
} as Proposal);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ProposalStorageService', () => {
  let service: ProposalStorageService;

  let authServiceSpy: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock;
  };
  let userServiceSpy: { getAllUsers: jest.Mock };
  let dbStoreSpy: MockIndexedDbStore;

  let mockCurrentUser: WritableSignal<User | null>;
  let localStorageSetItemSpy: jest.SpyInstance;
  let localStorageGetItemSpy: jest.SpyInstance;
  let localStorageRemoveItemSpy: jest.SpyInstance;

  beforeEach(() => {
    // 🔕 Silenciador preventivo de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    localStorage.clear();
    localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    localStorageGetItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    localStorageRemoveItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

    mockCurrentUser = signal<User | null>(createMockUser());

    authServiceSpy = {
      currentUser: mockCurrentUser,
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    // Proveemos los IDs exactos que getInitialData() buscará en caso de no hallar BD
    userServiceSpy = {
      getAllUsers: jest.fn().mockReturnValue([
        createMockUser({ id: 'user-001' }),
        createMockUser({ id: 'doc-005' }),
        createMockUser({ id: 'doc-001' }),
        createMockUser({ id: 'doc-002' })
      ])
    };

    dbStoreSpy = {
      get: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      providers: [
        ProposalStorageService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: IndexedDbListStoreService, useValue: dbStoreSpy }
      ]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización e Hidratación', () => {
    it('debería cargar datos iniciales si IndexedDB y LocalStorage están vacíos', async () => {
      dbStoreSpy.get.mockResolvedValue([]);

      service = TestBed.inject(ProposalStorageService);

      expect(service.isHydrated()).toBeFalsy();

      await flushPromises();

      expect(dbStoreSpy.get).toHaveBeenCalledWith('proposals');
      expect(service.isHydrated()).toBeTruthy();

      // getInitialData() retorna 3 propuestas por defecto
      expect(service.getProposalsListSnapshot()).toHaveLength(3);
      expect(service.getProposalsListSnapshot()[0].id).toBe('prop-001');
    });

    it('debería cargar datos previos desde IndexedDB exitosamente', async () => {
      const storedProposals = [createMockProposal({ id: 'db-prop-1' })];
      dbStoreSpy.get.mockResolvedValue(storedProposals);

      service = TestBed.inject(ProposalStorageService);
      await flushPromises();

      expect(service.getProposalsListSnapshot()).toHaveLength(1);
      expect(service.getProposalsListSnapshot()[0].id).toBe('db-prop-1');
    });

    it('debería ejecutar migración desde LocalStorage si IndexedDB está vacío', async () => {
      dbStoreSpy.get.mockResolvedValue([]);

      const legacyProposals = [createMockProposal({ id: 'legacy-prop' })];
      localStorageGetItemSpy.mockReturnValueOnce(JSON.stringify(legacyProposals));

      service = TestBed.inject(ProposalStorageService);
      await flushPromises();

      expect(service.getProposalsListSnapshot()).toHaveLength(1);
      expect(service.getProposalsListSnapshot()[0].id).toBe('legacy-prop');
      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('proposals');
    });

    it('debería capturar errores de IndexedDB, cargar datos iniciales y registrar en consola', async () => {
      dbStoreSpy.get.mockRejectedValue(new Error('Fallo crítico BD'));

      service = TestBed.inject(ProposalStorageService);
      await flushPromises();

      expect(console.error).toHaveBeenCalledWith('Error leyendo propuestas de IndexedDB', expect.any(Error));
      expect(service.getProposalsListSnapshot()).toHaveLength(3); // fallback a getInitialData()
      expect(service.isHydrated()).toBeTruthy();
    });
  });

  describe('Efectos: Persistencia', () => {
    it('debería guardar en IndexedDB cuando se actualiza la lista', async () => {
      dbStoreSpy.get.mockResolvedValue([]); // Setup inicial
      service = TestBed.inject(ProposalStorageService);
      await flushPromises(); // Espera la hidratación

      const mockProposal = createMockProposal({ id: 'update-1' });

      // Ejecutamos la mutación pública
      service.updateProposals(() => [mockProposal]);

      TestBed.flushEffects();
      await flushPromises(); // Espera el catch del Promise.set

      expect(dbStoreSpy.set).toHaveBeenCalledWith('proposals', [mockProposal]);
    });
  });

  describe('Computed: proposals (Autorización y Filtros)', () => {
    beforeEach(async () => {
      const mockUserAuth = createMockUser({ id: 'current-u-1' });
      mockCurrentUser.set(mockUserAuth);

      const testProposals = [
        createMockProposal({
          id: 'prop-propia',
          authors: [mockUserAuth],
          isActive: true,
          isArchived: false
        }),
        createMockProposal({
          id: 'prop-ajena',
          authors: [createMockUser({ id: 'otro-u' })],
          director: createMockUser({ id: 'otro-dir' }),
          isActive: true,
          isArchived: false
        }),
        createMockProposal({
          id: 'prop-inactiva',
          authors: [mockUserAuth],
          isActive: false // Debería filtrarse
        }),
        createMockProposal({
          id: 'prop-archivada',
          authors: [mockUserAuth],
          isArchived: true // Debería filtrarse
        })
      ];

      dbStoreSpy.get.mockResolvedValue(testProposals);
      service = TestBed.inject(ProposalStorageService);
      await flushPromises();
    });

    it('debería retornar TODAS las propuestas activas/no archivadas para roles privilegiados', () => {
      authServiceSpy.hasAnyRole.mockReturnValue(true);

      const visibleProposals = service.proposals();

      expect(visibleProposals).toHaveLength(2); // 'prop-propia' y 'prop-ajena'
      expect(visibleProposals.some(p => p.id === 'prop-inactiva')).toBeFalsy();
    });

    it('debería retornar SOLO las propuestas activas relacionadas al usuario (como autor, director, etc.)', () => {
      authServiceSpy.hasAnyRole.mockReturnValue(false);

      const visibleProposals = service.proposals();

      expect(visibleProposals).toHaveLength(1);
      expect(visibleProposals[0].id).toBe('prop-propia');
    });

    it('debería retornar un arreglo vacío si no hay usuario autenticado', () => {
      mockCurrentUser.set(null);
      expect(service.proposals()).toEqual([]);
    });
  });

  describe('Métodos Públicos de Acceso y Mutación', () => {
    beforeEach(async () => {
      dbStoreSpy.get.mockResolvedValue([createMockProposal({ id: 'test-1' })]);
      service = TestBed.inject(ProposalStorageService);
      await flushPromises();
    });

    it('debería mutar las propuestas mediante updateProposals', () => {
      service.updateProposals(list => list.map(p => ({ ...p, title: 'Mutado' } as Proposal)));

      const snapshot = service.getProposalsListSnapshot();
      expect(snapshot[0].title).toBe('Mutado');
    });

    it('debería retornar la propuesta mediante getById con delay simulado', async () => {
      // firstValueFrom maneja nativamente el 'delay(1000)' de RxJS en el entorno de pruebas
      const result = await firstValueFrom(service.getById('test-1'));
      expect(result).toBeDefined();
      expect(result?.id).toBe('test-1');
    });

    it('debería validar permisos específicos mediante canUserAccessProposal', () => {
      const proposal = createMockProposal({
        authors: [createMockUser({ id: 'autor-1' })],
        director: createMockUser({ id: 'dir-1' })
      });

      expect(service.canUserAccessProposal(proposal, 'autor-1')).toBeTruthy();
      expect(service.canUserAccessProposal(proposal, 'dir-1')).toBeTruthy();
      expect(service.canUserAccessProposal(proposal, 'ajeno')).toBeFalsy();
    });
  });
});
