import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { IndexedDbListStoreService } from '../../../core/services/persistence/indexed-db-list-store.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { PRELIMINARY_DRAFTS_LIST } from '../mocks/preliminary-drafts.mock';

// Tipos auxiliares derivados de las interfaces
type ProposalType = NonNullable<PreliminaryDraft['proposalData']>;
type EvaluationType = NonNullable<PreliminaryDraft['evaluations']>[number];
type EvaluatorType = NonNullable<PreliminaryDraft['evaluators']>[number];

// ── Utilidad para drenar Promesas Nativas en Jest ────────────────────────────
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// ── Mocks Estrictos de Servicios ─────────────────────────────────────────────
interface MockIndexedDbStore {
  get: jest.Mock<Promise<unknown>, [string]>;
  set: jest.Mock<Promise<void>, [string, unknown]>;
}

// ── Factory helpers con tipado estricto (Cero "any" o "unknown") ────────────
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default-id',
  name: 'Default User',
  email: 'user@test.com',
  role: UserRoleType.ESTUDIANTE,
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<ProposalType> = {}): ProposalType => ({
  title: 'Proposal Title Mock',
  description: 'Proposal Description Mock',
  director: createMockUser({ id: 'director-default' }),
  authors: [],
  ...overrides
} as ProposalType);

const createMockEvaluation = (overrides: Partial<EvaluationType> = {}): EvaluationType => ({
  evaluatorId: 'evaluator-default-id',
  ...overrides
} as EvaluationType);

const createMockEvaluator = (overrides: Partial<EvaluatorType> = {}): EvaluatorType => ({
  id: 'evaluator-default-id',
  ...overrides
} as EvaluatorType);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-default-id',
  isArchived: false,
  proposalData: createMockProposal(),
  evaluators: [],
  evaluations: [],
  ...overrides
} as PreliminaryDraft);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('PreliminaryDraftStorageService', () => {
  let service: PreliminaryDraftStorageService;

  let authServiceSpy: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock;
  };
  let dbStoreSpy: MockIndexedDbStore;

  let localStorageStore: Record<string, string>;
  let localStorageSetItemSpy: jest.SpyInstance;
  let localStorageGetItemSpy: jest.SpyInstance;
  let localStorageRemoveItemSpy: jest.SpyInstance;

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    localStorageStore = {};
    localStorageGetItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => localStorageStore[key] || null);
    localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { localStorageStore[key] = value; });
    localStorageRemoveItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete localStorageStore[key]; });

    authServiceSpy = {
      currentUser: signal<User | null>(null),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    dbStoreSpy = {
      get: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: IndexedDbListStoreService, useValue: dbStoreSpy }
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización e Hidratación', () => {
    it('debería inicializar con los mocks por defecto si DB y LocalStorage están vacíos', async () => {
      dbStoreSpy.get.mockResolvedValue([]);

      service = TestBed.inject(PreliminaryDraftStorageService);

      expect(service.isHydrated()).toBeFalsy();

      await flushPromises();

      expect(dbStoreSpy.get).toHaveBeenCalledWith('preliminaryDrafts');
      expect(service.isHydrated()).toBeTruthy();

      // Fallback a PRELIMINARY_DRAFTS_LIST
      expect(service.allPreliminaryDrafts()).toEqual(PRELIMINARY_DRAFTS_LIST);
    });

    it('debería cargar datos almacenados desde IndexedDB exitosamente', async () => {
      const storedDrafts = [createMockDraft({ preliminaryDraftId: 'db-draft-1' })];
      dbStoreSpy.get.mockResolvedValue(storedDrafts);

      service = TestBed.inject(PreliminaryDraftStorageService);
      await flushPromises();

      expect(service.allPreliminaryDrafts()).toHaveLength(1);
      expect(service.allPreliminaryDrafts()[0].preliminaryDraftId).toBe('db-draft-1');
    });

    it('debería ejecutar la migración desde LocalStorage si IndexedDB está vacío', async () => {
      dbStoreSpy.get.mockResolvedValue([]);

      const legacyDrafts = [createMockDraft({ preliminaryDraftId: 'legacy-1' })];
      localStorageStore['preliminaryDrafts'] = JSON.stringify(legacyDrafts);

      service = TestBed.inject(PreliminaryDraftStorageService);
      await flushPromises();

      expect(service.allPreliminaryDrafts()).toHaveLength(1);
      expect(service.allPreliminaryDrafts()[0].preliminaryDraftId).toBe('legacy-1');
      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('preliminaryDrafts');
    });

    it('debería capturar el error, inicializar con mocks y registrar en consola si IndexedDB falla', async () => {
      dbStoreSpy.get.mockRejectedValue(new Error('IndexedDB error'));

      service = TestBed.inject(PreliminaryDraftStorageService);
      await flushPromises();

      expect(console.error).toHaveBeenCalledWith('Error leyendo anteproyectos de IndexedDB', expect.any(Error));
      expect(service.allPreliminaryDrafts()).toEqual(PRELIMINARY_DRAFTS_LIST);
      expect(service.isHydrated()).toBeTruthy();
    });
  });

  describe('Efectos: Persistencia', () => {
    it('debería guardar en IndexedDB cuando se actualiza la lista', async () => {
      dbStoreSpy.get.mockResolvedValue([]);
      service = TestBed.inject(PreliminaryDraftStorageService);
      await flushPromises(); // Esperar hidratación

      const newDraft = createMockDraft({ preliminaryDraftId: 'new-persist' });

      service.addDraft(newDraft);
      TestBed.flushEffects();
      await flushPromises(); // Esperar resolución de dbStore.set()

      expect(dbStoreSpy.set).toHaveBeenCalledWith('preliminaryDrafts', expect.arrayContaining([newDraft]));
    });
  });

  describe('Propiedad computada: preliminaryDrafts (Autorización)', () => {
    beforeEach(async () => {
      dbStoreSpy.get.mockResolvedValue([]);
      service = TestBed.inject(PreliminaryDraftStorageService);
      await flushPromises();

      // FIX: Limpiamos los defaults inyectados por PRELIMINARY_DRAFTS_LIST
      // para asegurar que las pruebas evalúen exclusivamente los borradores insertados en cada test.
      (service as any)['_preliminaryDraftsList'].set([]);
    });

    it('debería retornar un arreglo vacío si no hay usuario autenticado', () => {
      authServiceSpy.currentUser.set(null);
      expect(service.preliminaryDrafts()).toEqual([]);
    });

    it('debería retornar todos los borradores NO archivados si el usuario tiene rol privilegiado', () => {
      const mockDrafts = [
        createMockDraft({ preliminaryDraftId: '1', isArchived: false }),
        createMockDraft({ preliminaryDraftId: '2', isArchived: false }),
        createMockDraft({ preliminaryDraftId: '3', isArchived: true })
      ];

      mockDrafts.forEach(d => service.addDraft(d));
      authServiceSpy.currentUser.set(createMockUser({ id: 'admin-1' }));
      authServiceSpy.hasAnyRole.mockReturnValue(true);

      const visibleDrafts = service.preliminaryDrafts();

      expect(visibleDrafts).toHaveLength(2);
      expect(visibleDrafts.some(d => d.preliminaryDraftId === '3')).toBeFalsy();
    });

    it('debería permitir acceso directo si el usuario es director, codirector o asesor', () => {
      const userId = 'professor-1';
      const mockDrafts = [
        createMockDraft({
          preliminaryDraftId: 'dir-draft',
          proposalData: createMockProposal({ director: createMockUser({ id: userId }) })
        }),
        createMockDraft({
          preliminaryDraftId: 'codir-draft',
          proposalData: createMockProposal({ codirector: createMockUser({ id: userId }) })
        }),
        createMockDraft({
          preliminaryDraftId: 'adv-draft',
          proposalData: createMockProposal({ advisor: createMockUser({ id: userId }) })
        })
      ];

      mockDrafts.forEach(d => service.addDraft(d));
      authServiceSpy.currentUser.set(createMockUser({ id: userId }));
      authServiceSpy.hasAnyRole.mockReturnValue(false);

      expect(service.preliminaryDrafts()).toHaveLength(3);
    });

    it('debería permitir acceso cuando el usuario es autor', () => {
      const userId = 'student-1';
      const draft = createMockDraft({
        preliminaryDraftId: 'obj-author',
        proposalData: createMockProposal({ authors: [createMockUser({ id: userId })] })
      });

      service.addDraft(draft);
      authServiceSpy.currentUser.set(createMockUser({ id: userId }));
      authServiceSpy.hasAnyRole.mockReturnValue(false);

      expect(service.preliminaryDrafts()).toHaveLength(1);
    });

    it('debería permitir acceso cuando el usuario es evaluador asignado o tiene evaluación emitida', () => {
      const userId = 'evaluator-1';
      const draft = createMockDraft({
        preliminaryDraftId: 'eval-draft',
        evaluators: [createMockEvaluator({ id: userId })],
        evaluations: [createMockEvaluation({ evaluatorId: userId })]
      });

      service.addDraft(draft);
      authServiceSpy.currentUser.set(createMockUser({ id: userId }));
      authServiceSpy.hasAnyRole.mockReturnValue(false);

      expect(service.preliminaryDrafts()).toHaveLength(1);
    });

    it('debería denegar el acceso a borradores sin proposalData o donde el usuario no participa', () => {
      const draftSinParticipacion = createMockDraft({
        preliminaryDraftId: 'no-access',
        proposalData: createMockProposal({ authors: [createMockUser({ id: 'otro-user' })] })
      });
      const draftVacio = createMockDraft({ preliminaryDraftId: 'no-prop', proposalData: undefined });

      service.addDraft(draftSinParticipacion);
      service.addDraft(draftVacio);

      authServiceSpy.currentUser.set(createMockUser({ id: 'user-1' }));
      authServiceSpy.hasAnyRole.mockReturnValue(false);

      expect(service.preliminaryDrafts()).toEqual([]);
    });
  });

  describe('Operaciones CRUD', () => {
    beforeEach(async () => {
      dbStoreSpy.get.mockResolvedValue([]);
      service = TestBed.inject(PreliminaryDraftStorageService);
      await flushPromises();

      // Limpiamos los defaults inyectados por PRELIMINARY_DRAFTS_LIST
      (service as any)['_preliminaryDraftsList'].set([]);
    });

    it('debería actualizar un borrador existente con la función mutadora', () => {
      const draft = createMockDraft({ preliminaryDraftId: 'update-1', isArchived: false });
      service.addDraft(draft);

      service.updateDraft('update-1', d => ({ ...d, isArchived: true }));

      const updated = service.allPreliminaryDrafts().find(d => d.preliminaryDraftId === 'update-1');
      expect(updated?.isArchived).toBe(true);
    });

    it('no debería alterar la lista si se intenta actualizar un ID inexistente', () => {
      const draft = createMockDraft({ preliminaryDraftId: 'existing-1', isArchived: false });
      service.addDraft(draft);

      service.updateDraft('non-existent', d => ({ ...d, isArchived: true }));

      const existing = service.allPreliminaryDrafts().find(d => d.preliminaryDraftId === 'existing-1');
      expect(existing?.isArchived).toBe(false);
      expect(service.allPreliminaryDrafts()).toHaveLength(1);
    });

    it('debería remover un borrador por ID', () => {
      const draft = createMockDraft({ preliminaryDraftId: 'del-1' });
      service.addDraft(draft);

      expect(service.allPreliminaryDrafts()).toHaveLength(1);

      service.removeDraft('del-1');

      expect(service.allPreliminaryDrafts()).toHaveLength(0);
    });

    it('debería obtener un borrador por ID asincrónicamente con delay (getById)', async () => {
      const draft = createMockDraft({ preliminaryDraftId: 'async-1' });
      service.addDraft(draft);

      const result = await firstValueFrom(service.getById('async-1'));

      expect(result).toEqual(draft);
    });
  });
});
