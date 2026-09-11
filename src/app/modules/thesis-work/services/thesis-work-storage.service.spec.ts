import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';
import { IndexedDbListStoreService } from '../../../core/services/persistence/indexed-db-list-store.service';

import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { SustentationRegistry } from '../interfaces/sustentation-registry.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { Modality } from '../../proposal/enums/modality.enum';

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
  title: 'Tesis',
  description: 'Desc',
  modality: Modality.TI,
  authors: [],
  director: createMockUser({ id: 'default-dir' }),
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.APROBADO,
  createdData: new Date(),
  evaluations: [],
  documents: [],
  proposalData: createMockProposal(),
  ...overrides
} as PreliminaryDraft);

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'work-1',
  preliminaryDraftId: 'draft-1',
  documents: [],
  evaluations: [],
  specialRequests: [],
  sustentations: [],
  state: stateList.EN_DESARROLLO,
  createdDate: new Date('2026-01-01'),
  isArchived: false,
  preliminaryDraftData: createMockPreliminaryDraft(),
  ...overrides
} as ThesisWork);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ThesisWorkStorageService', () => {
  let service: ThesisWorkStorageService;

  let authServiceSpy: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock;
  };
  let draftServiceSpy: {
    allPreliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
  };
  let draftStorageSpy: { updateDraft: jest.Mock };
  let proposalStorageSpy: { updateProposals: jest.Mock };
  let dbStoreSpy: MockIndexedDbStore;

  let mockCurrentUser: WritableSignal<User | null>;
  let mockAllPreliminaryDrafts: WritableSignal<PreliminaryDraft[]>;

  let localStorageSetItemSpy: jest.SpyInstance;
  let localStorageGetItemSpy: jest.SpyInstance;
  let localStorageRemoveItemSpy: jest.SpyInstance;

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-1234' },
      writable: true
    });
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    localStorage.clear();
    localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    localStorageGetItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    localStorageRemoveItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

    mockCurrentUser = signal<User | null>(createMockUser());
    mockAllPreliminaryDrafts = signal<PreliminaryDraft[]>([]);

    authServiceSpy = {
      currentUser: mockCurrentUser,
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    draftServiceSpy = {
      allPreliminaryDrafts: mockAllPreliminaryDrafts
    };

    draftStorageSpy = { updateDraft: jest.fn() };
    proposalStorageSpy = { updateProposals: jest.fn() };

    dbStoreSpy = {
      get: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkStorageService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PreliminaryDraftService, useValue: draftServiceSpy },
        { provide: PreliminaryDraftStorageService, useValue: draftStorageSpy },
        { provide: ProposalStorageService, useValue: proposalStorageSpy },
        { provide: IndexedDbListStoreService, useValue: dbStoreSpy }
      ]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización e Hidratación', () => {
    it('debería inicializar vacío y marcar como hidratado si DB está vacía', async () => {
      dbStoreSpy.get.mockResolvedValue([]);

      service = TestBed.inject(ThesisWorkStorageService);

      // Chequeo síncrono justo tras inyectar
      expect(service.isHydrated()).toBeFalsy();

      // Pausa para que el Event Loop procese el async/await de hydrateFromIndexedDb
      await flushPromises();

      expect(dbStoreSpy.get).toHaveBeenCalledWith('thesisWorks');
      expect(service.allThesisWorks()).toEqual([]);
      expect(service.isHydrated()).toBeTruthy();
    });

    it('debería cargar datos previos desde IndexedDB exitosamente', async () => {
      const storedWorks = [createMockThesisWork({ thesisWorkId: 'db-1' })];
      dbStoreSpy.get.mockResolvedValue(storedWorks);

      service = TestBed.inject(ThesisWorkStorageService);
      await flushPromises();

      expect(service.allThesisWorks()).toHaveLength(1);
      expect(service.allThesisWorks()[0].thesisWorkId).toBe('db-1');
    });

    it('debería ejecutar migración desde LocalStorage si IndexedDB está vacío y hay datos legacy', async () => {
      dbStoreSpy.get.mockResolvedValue([]);

      const legacyWorks = [createMockThesisWork({ thesisWorkId: 'legacy-1' })];
      localStorageGetItemSpy.mockReturnValueOnce(JSON.stringify(legacyWorks));

      service = TestBed.inject(ThesisWorkStorageService);
      await flushPromises();

      expect(service.allThesisWorks()).toHaveLength(1);
      expect(service.allThesisWorks()[0].thesisWorkId).toBe('legacy-1');
      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('thesisWorks');
    });

    it('debería capturar el error, inicializar vacío y registrar en consola si IndexedDB falla', async () => {
      dbStoreSpy.get.mockRejectedValue(new Error('DB Corrupta'));

      service = TestBed.inject(ThesisWorkStorageService);
      await flushPromises();

      expect(console.error).toHaveBeenCalledWith('Error leyendo trabajos de grado de IndexedDB', expect.any(Error));
      expect(service.allThesisWorks()).toEqual([]);
      expect(service.isHydrated()).toBeTruthy();
    });
  });

  describe('Efectos: Sincronización y Persistencia', () => {
    beforeEach(async () => {
      dbStoreSpy.get.mockResolvedValue([]);
      service = TestBed.inject(ThesisWorkStorageService);
      await flushPromises(); // Aseguramos hidratación antes de probar efectos
    });

    it('debería guardar en IndexedDB cuando se actualiza la lista', async () => {
      const mockWork = createMockThesisWork({ thesisWorkId: 'test-save' });

      // Mutamos la señal interna para disparar el efecto
      (service as any)['_thesisWorksList'].set([mockWork]);

      TestBed.flushEffects();
      await flushPromises(); // Esperamos a que la promesa del .set() se resuelva silenciosamente

      expect(dbStoreSpy.set).toHaveBeenCalledWith('thesisWorks', [mockWork]);
    });

    it('debería crear automáticamente un trabajo de grado si un anteproyecto cambia a APROBADO', () => {
      const newDraft = createMockPreliminaryDraft({
        preliminaryDraftId: 'draft-approved-1',
        state: stateList.APROBADO
      });

      mockAllPreliminaryDrafts.set([newDraft]);
      TestBed.flushEffects();

      const works = service.allThesisWorks();
      expect(works).toHaveLength(1);
      expect(works[0].preliminaryDraftId).toBe('draft-approved-1');
      expect(works[0].thesisWorkId).toBe('mock-uuid-1234');
      expect(works[0].state).toBe(stateList.EN_DESARROLLO);
    });

    it('debería actualizar los datos del anteproyecto en el trabajo si cambia la fecha máxima de entrega', () => {
      const initialDraft = createMockPreliminaryDraft({
        preliminaryDraftId: 'draft-1',
        state: stateList.APROBADO,
        maximumDeliveryDate: new Date('2026-10-10')
      });
      mockAllPreliminaryDrafts.set([initialDraft]);
      TestBed.flushEffects();

      const updatedDraft = { ...initialDraft, maximumDeliveryDate: new Date('2026-12-31') };
      mockAllPreliminaryDrafts.set([updatedDraft]);
      TestBed.flushEffects();

      const works = service.allThesisWorks();
      expect(works).toHaveLength(1);
      expect(works[0].preliminaryDraftData.maximumDeliveryDate).toEqual(new Date('2026-12-31'));
    });
  });

  describe('Computed: thesisWorks (Autorización)', () => {
    beforeEach(async () => {
      const mockUserAuth = createMockUser({ id: 'current-u-1' });
      mockCurrentUser.set(mockUserAuth);

      const testWorks = [
        createMockThesisWork({
          thesisWorkId: 'work-propio',
          createdDate: new Date('2026-05-01'),
          preliminaryDraftData: createMockPreliminaryDraft({
            proposalData: createMockProposal({ authors: [mockUserAuth] })
          })
        }),
        createMockThesisWork({
          thesisWorkId: 'work-ajeno',
          createdDate: new Date('2026-06-01'),
          preliminaryDraftData: createMockPreliminaryDraft({
            proposalData: createMockProposal({ authors: [createMockUser({ id: 'otro-u' })] })
          })
        }),
        createMockThesisWork({
          thesisWorkId: 'work-archivado',
          isArchived: true
        })
      ];

      dbStoreSpy.get.mockResolvedValue(testWorks);
      service = TestBed.inject(ThesisWorkStorageService);
      await flushPromises();
    });

    it('debería retornar TODOS los trabajos activos si el usuario tiene rol privilegiado', () => {
      authServiceSpy.hasAnyRole.mockReturnValue(true);

      const visibleWorks = service.thesisWorks();

      expect(visibleWorks).toHaveLength(2);
      expect(visibleWorks[0].thesisWorkId).toBe('work-ajeno');
      expect(visibleWorks[1].thesisWorkId).toBe('work-propio');
    });

    it('debería retornar SOLO los trabajos relacionados al usuario si no tiene privilegios', () => {
      authServiceSpy.hasAnyRole.mockReturnValue(false);

      const visibleWorks = service.thesisWorks();

      expect(visibleWorks).toHaveLength(1);
      expect(visibleWorks[0].thesisWorkId).toBe('work-propio');
    });

    it('debería retornar vacío si no hay usuario autenticado', () => {
      mockCurrentUser.set(null);
      expect(service.thesisWorks()).toEqual([]);
    });
  });

  describe('updateWork y Cascada de Archivado', () => {
    beforeEach(async () => {
      const initialWork = createMockThesisWork({
        thesisWorkId: 'work-target',
        preliminaryDraftId: 'draft-target',
        preliminaryDraftData: createMockPreliminaryDraft({ proposalId: 'prop-target' })
      });

      dbStoreSpy.get.mockResolvedValue([initialWork]);
      service = TestBed.inject(ThesisWorkStorageService);
      await flushPromises();
    });

    it('debería mutar los datos de un trabajo sin archivar', () => {
      service.updateWork('work-target', work => ({ ...work, state: stateList.EN_REVISION }));

      const updated = service.allThesisWorks().find(w => w.thesisWorkId === 'work-target');
      expect(updated?.state).toBe(stateList.EN_REVISION);
      expect(updated?.isArchived).toBeFalsy();
    });

    it('debería marcar como archivado y disparar cascada al cambiar a CANCELADO', () => {
      service.updateWork('work-target', work => ({ ...work, state: stateList.CANCELADO }));

      const updated = service.allThesisWorks().find(w => w.thesisWorkId === 'work-target');
      expect(updated?.isArchived).toBeTruthy();

      expect(draftStorageSpy.updateDraft).toHaveBeenCalledWith('draft-target', expect.any(Function));
      expect(proposalStorageSpy.updateProposals).toHaveBeenCalledWith(expect.any(Function));
    });

    it('debería aislar fallos en la cascada con try/catch sin romper la ejecución', () => {
      draftStorageSpy.updateDraft.mockImplementation(() => {
        throw new Error('Fallo crítico en cascada');
      });

      expect(() => {
        service.updateWork('work-target', work => ({ ...work, isArchived: true }));
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith('Error al ejecutar el archivado en cascada:', expect.any(Error));

      const updated = service.allThesisWorks().find(w => w.thesisWorkId === 'work-target');
      expect(updated?.isArchived).toBeTruthy();
    });
  });

  describe('getById (Observable Asíncrono)', () => {
    it('debería retornar el trabajo observable procesado correctamente', async () => {
      const mockWork = createMockThesisWork({ thesisWorkId: 'work-async' });
      dbStoreSpy.get.mockResolvedValue([mockWork]);

      service = TestBed.inject(ThesisWorkStorageService);
      await flushPromises();

      // En lugar de pelear con fakeAsync y el delay(500),
      // firstValueFrom extrae el primer valor del observable de forma nativa asíncrona.
      const result = await firstValueFrom(service.getById('work-async'));

      expect(result).toBeDefined();
      expect(result?.thesisWorkId).toBe('work-async');
    });
  });
});
