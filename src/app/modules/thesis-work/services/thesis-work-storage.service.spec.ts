import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';

import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';

// Utility para crear Mocks fuertemente tipados sin usar 'any'
const asMock = <T>(data: Partial<T>): T => data as T;

describe('ThesisWorkStorageService', () => {
  let service: ThesisWorkStorageService;

  // Tipado estricto de los espías
  let authServiceSpy: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock;
  };
  let draftServiceSpy: {
    allPreliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
  };
  let draftStorageSpy: { updateDraft: jest.Mock };
  let proposalStorageSpy: { updateProposals: jest.Mock };

  let mockCurrentUser: WritableSignal<User | null>;
  let mockAllPreliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
  let localStorageSetItemSpy: jest.SpyInstance;
  let localStorageGetItemSpy: jest.SpyInstance;

  const mockUser = asMock<User>({ id: 'user-1', firstName: 'Estudiante', email: 'estudiante@test.com' });

  beforeEach(() => {
    localStorage.clear();

    // Espiamos el localStorage para no depender puramente del estado global en las aserciones
    localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    localStorageGetItemSpy = jest.spyOn(Storage.prototype, 'getItem');

    mockCurrentUser = signal<User | null>(mockUser);
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

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkStorageService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PreliminaryDraftService, useValue: draftServiceSpy },
        { provide: PreliminaryDraftStorageService, useValue: draftStorageSpy },
        { provide: ProposalStorageService, useValue: proposalStorageSpy },
      ]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe crearse correctamente e inicializar localStorage vacío', () => {
    service = TestBed.inject(ThesisWorkStorageService);

    expect(service).toBeTruthy();
    expect(service.allThesisWorks()).toEqual([]);
    expect(localStorageGetItemSpy).toHaveBeenCalledWith('thesisWorks');
  });

  it('debe inicializar cargando datos previos del localStorage', () => {
    const previousData = [asMock<ThesisWork>({ thesisWorkId: 'old-1', state: stateList.EN_DESARROLLO })];
    localStorageGetItemSpy.mockReturnValueOnce(JSON.stringify(previousData));

    service = TestBed.inject(ThesisWorkStorageService);

    expect(service.allThesisWorks()).toHaveLength(1);
    expect(service.allThesisWorks()[0].thesisWorkId).toBe('old-1');
  });

  it('debe limpiar el localStorage y retornar vacío si ocurre un error de parseo', () => {
    localStorageGetItemSpy.mockReturnValueOnce('invalid-json-data');
    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    service = TestBed.inject(ThesisWorkStorageService);

    expect(consoleSpy).toHaveBeenCalled();
    expect(removeItemSpy).toHaveBeenCalledWith('thesisWorks');
    expect(service.allThesisWorks()).toEqual([]);
  });

  describe('Efecto: Creación/Actualización automática desde Anteproyectos', () => {
    it('debe crear un nuevo trabajo de grado con ID dinámico cuando un anteproyecto es APROBADO', () => {
      service = TestBed.inject(ThesisWorkStorageService);

      const newDraft = asMock<PreliminaryDraft>({
        preliminaryDraftId: 'draft-1',
        state: stateList.APROBADO,
        maximumDeliveryDate: new Date('2026-12-31')
      });

      mockAllPreliminaryDrafts.set([newDraft]);
      TestBed.flushEffects();

      const works = service.allThesisWorks();
      expect(works).toHaveLength(1);
      expect(works[0].preliminaryDraftId).toBe('draft-1');

      // ✅ Solución al hack de crypto: Evalúa que generó cualquier String válido
      expect(works[0].thesisWorkId).toEqual(expect.any(String));
      expect(works[0].state).toBe(stateList.EN_DESARROLLO);

      // Valida que el cambio se sincronizó con localStorage (Efecto #1)
      expect(localStorageSetItemSpy).toHaveBeenCalled();
    });

    it('debe actualizar los datos del anteproyecto si cambia la fecha máxima de entrega', () => {
      service = TestBed.inject(ThesisWorkStorageService);

      const draft = asMock<PreliminaryDraft>({
        preliminaryDraftId: 'draft-1',
        state: stateList.APROBADO,
        maximumDeliveryDate: new Date('2026-12-31')
      });

      mockAllPreliminaryDrafts.set([draft]);
      TestBed.flushEffects();

      const updatedDraft = { ...draft, maximumDeliveryDate: new Date('2027-01-15') };
      mockAllPreliminaryDrafts.set([updatedDraft]);
      TestBed.flushEffects();

      const works = service.allThesisWorks();
      expect(works).toHaveLength(1);
      expect(works[0].preliminaryDraftData.maximumDeliveryDate).toEqual(new Date('2027-01-15'));
    });
  });

  describe('Computed: thesisWorks (Permisos y Ordenamiento)', () => {
    beforeEach(() => {
      const testWorks = [
        asMock<ThesisWork>({
          thesisWorkId: 'work-1',
          createdDate: new Date('2026-01-01'),
          isArchived: false,
          preliminaryDraftData: asMock<PreliminaryDraft>({
            proposalData: asMock<Proposal>({ authors: [asMock<User>({ id: 'user-1' })] })
          })
        }),
        asMock<ThesisWork>({
          thesisWorkId: 'work-2',
          createdDate: new Date('2026-05-01'),
          isArchived: false,
          preliminaryDraftData: asMock<PreliminaryDraft>({
            proposalData: asMock<Proposal>({ director: asMock<User>({ id: 'dir-1' }) })
          })
        }),
        asMock<ThesisWork>({
          thesisWorkId: 'work-archived',
          createdDate: new Date('2026-02-01'),
          isArchived: true,
          preliminaryDraftData: asMock<PreliminaryDraft>({})
        })
      ];
      localStorageGetItemSpy.mockReturnValue(JSON.stringify(testWorks));
      service = TestBed.inject(ThesisWorkStorageService);
    });

    it('debe retornar todos los activos para un ADMINISTRADOR, ordenados por fecha descendente', () => {
      authServiceSpy.hasAnyRole.mockReturnValue(true);

      const visibleWorks = service.thesisWorks();

      expect(visibleWorks).toHaveLength(2); // No incluye el archivado
      expect(visibleWorks[0].thesisWorkId).toBe('work-2'); // work-2 es de mayo (más reciente)
      expect(visibleWorks[1].thesisWorkId).toBe('work-1'); // work-1 es de enero
    });

    it('debe filtrar los trabajos activos para un estudiante/autor específico', () => {
      authServiceSpy.hasAnyRole.mockReturnValue(false);
      mockCurrentUser.set(asMock<User>({ id: 'user-1' }));

      const visibleWorks = service.thesisWorks();

      expect(visibleWorks).toHaveLength(1);
      expect(visibleWorks[0].thesisWorkId).toBe('work-1');
    });

    it('debe retornar un arreglo vacío si no hay usuario autenticado', () => {
      mockCurrentUser.set(null);
      expect(service.thesisWorks()).toEqual([]);
    });
  });

  describe('updateWork y Cascada de Archivado', () => {
    beforeEach(() => {
      const initialWork = asMock<ThesisWork>({
        thesisWorkId: 'work-1',
        isArchived: false,
        preliminaryDraftId: 'draft-1',
        preliminaryDraftData: asMock<PreliminaryDraft>({ proposalId: 'prop-1' })
      });
      localStorageGetItemSpy.mockReturnValue(JSON.stringify([initialWork]));
      service = TestBed.inject(ThesisWorkStorageService);
    });

    it('debe mutar correctamente los datos de un trabajo', () => {
      service.updateWork('work-1', (work) => ({ ...work, state: stateList.EN_REVISION }));

      const updated = service.allThesisWorks().find(w => w.thesisWorkId === 'work-1');
      expect(updated?.state).toBe(stateList.EN_REVISION);
      expect(updated?.isArchived).toBeFalsy();
    });

    it('debe marcar como archivado si el estado pasa a CANCELADO y disparar la cascada', () => {
      service.updateWork('work-1', (work) => ({ ...work, state: stateList.CANCELADO }));

      const updated = service.allThesisWorks().find(w => w.thesisWorkId === 'work-1');
      expect(updated?.state).toBe(stateList.CANCELADO);
      expect(updated?.isArchived).toBeTruthy();

      expect(draftStorageSpy.updateDraft).toHaveBeenCalledWith('draft-1', expect.any(Function));
      expect(proposalStorageSpy.updateProposals).toHaveBeenCalledWith(expect.any(Function));
    });

    it('no debe romper la aplicación si la cascada falla (Try/Catch)', () => {
      draftStorageSpy.updateDraft.mockImplementation(() => {
        throw new Error('Error simulado');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        service.updateWork('work-1', (work) => ({ ...work, isArchived: true }));
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Error al ejecutar el archivado en cascada:', expect.any(Error));

      const updated = service.allThesisWorks().find(w => w.thesisWorkId === 'work-1');
      expect(updated?.isArchived).toBeTruthy(); // Se archiva localmente aunque falle la cascada
    });
  });

  describe('getById', () => {
    it('debe retornar el trabajo de grado como observable con un delay', fakeAsync(() => {
      const mockWork = asMock<ThesisWork>({ thesisWorkId: 'work-async' });
      localStorageGetItemSpy.mockReturnValue(JSON.stringify([mockWork]));

      service = TestBed.inject(ThesisWorkStorageService);

      let result: ThesisWork | undefined;
      service.getById('work-async').subscribe(res => result = res);

      expect(result).toBeUndefined(); // Verifica que el delay funciona

      tick(500);

      expect(result).toBeDefined();
      expect(result?.thesisWorkId).toBe('work-async');
    }));
  });
});
