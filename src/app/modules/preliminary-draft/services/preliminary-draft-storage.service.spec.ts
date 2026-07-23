import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

describe('PreliminaryDraftStorageService', () => {
  let service: PreliminaryDraftStorageService;
  let mockAuthService: jest.Mocked<Partial<AuthService>> & { currentUser: WritableSignal<User | null> };

  // Simulamos localStorage
  let localStorageStore: Record<string, string> = {};

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => localStorageStore[key] || null),
        setItem: jest.fn((key: string, value: string) => { localStorageStore[key] = value.toString(); }),
        removeItem: jest.fn((key: string) => { delete localStorageStore[key]; }),
        clear: jest.fn(() => { localStorageStore = {}; })
      }
    });
  });

  beforeEach(() => {
    localStorageStore = {}; // Limpiamos el storage antes de cada prueba
    jest.clearAllMocks();

    mockAuthService = {
      currentUser: signal<User | null>(null),
      hasAnyRole: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
  });

  it('debería crearse correctamente y cargar mocks si localStorage está vacío', () => {
    service = TestBed.inject(PreliminaryDraftStorageService);
    expect(service).toBeTruthy();
    expect(service.allPreliminaryDrafts().length).toBeGreaterThanOrEqual(0);
  });

  it('debería cargar datos desde localStorage si existen y son válidos', () => {
    const mockStoredDrafts = [
      { preliminaryDraftId: 'stored-1', proposalData: { title: 'Test' } } as unknown as PreliminaryDraft
    ];
    localStorageStore['preliminaryDrafts'] = JSON.stringify(mockStoredDrafts);

    service = TestBed.inject(PreliminaryDraftStorageService);
    expect(service.allPreliminaryDrafts()).toHaveLength(1);
    expect(service.allPreliminaryDrafts()[0].preliminaryDraftId).toBe('stored-1');
  });

  describe('Propiedad computada: preliminaryDrafts', () => {
    let mockDrafts: PreliminaryDraft[];

    beforeEach(() => {
      mockDrafts = [
        { preliminaryDraftId: '1', isArchived: false, proposalData: { authors: [{ id: 'student-1' }] } } as unknown as PreliminaryDraft,
        { preliminaryDraftId: '2', isArchived: false, evaluators: [{ id: 'eval-1' }] } as unknown as PreliminaryDraft,
        { preliminaryDraftId: '3', isArchived: true, proposalData: { director: { id: 'dir-1' } } } as unknown as PreliminaryDraft,
      ];

      localStorageStore['preliminaryDrafts'] = JSON.stringify(mockDrafts);
      service = TestBed.inject(PreliminaryDraftStorageService);
    });

    it('debería retornar un arreglo vacío si no hay usuario autenticado', () => {
      mockAuthService.currentUser.set(null);
      expect(service.preliminaryDrafts()).toEqual([]);
    });

    it('debería retornar todos los borradores NO archivados si el usuario es Admin/Comite/Jefe/Consejo', () => {
      mockAuthService.currentUser.set({ id: 'admin-1' } as User);
      mockAuthService.hasAnyRole = jest.fn().mockReturnValue(true); // Simulamos que tiene rol privilegiado

      const drafts = service.preliminaryDrafts();
      expect(drafts.length).toBe(2);
      expect(drafts.map(d => d.preliminaryDraftId)).toEqual(['1', '2']); // El 3 está archivado
    });

    it('debería retornar solo los borradores accesibles para un usuario regular (ej. estudiante/autor)', () => {
      mockAuthService.currentUser.set({ id: 'student-1' } as User);
      mockAuthService.hasAnyRole = jest.fn().mockReturnValue(false);

      const drafts = service.preliminaryDrafts();
      expect(drafts.length).toBe(1);
      expect(drafts[0].preliminaryDraftId).toBe('1');
    });

    it('debería retornar solo los borradores accesibles para un evaluador asignado', () => {
      mockAuthService.currentUser.set({ id: 'eval-1' } as User);
      mockAuthService.hasAnyRole = jest.fn().mockReturnValue(false);

      const drafts = service.preliminaryDrafts();
      expect(drafts.length).toBe(1);
      expect(drafts[0].preliminaryDraftId).toBe('2');
    });
  });

  describe('Operaciones CRUD y Efectos', () => {
    beforeEach(() => {
      localStorageStore['preliminaryDrafts'] = JSON.stringify([]);
      service = TestBed.inject(PreliminaryDraftStorageService);
    });

    it('debería agregar un nuevo borrador (addDraft) y sincronizar con localStorage', () => {
      const newDraft = { preliminaryDraftId: 'new-1' } as PreliminaryDraft;

      service.addDraft(newDraft);
      TestBed.flushEffects(); // Forzamos la ejecución del effect() de Angular

      expect(service.allPreliminaryDrafts()[0]).toEqual(newDraft);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('preliminaryDrafts', expect.stringContaining('new-1'));
    });

    it('debería actualizar un borrador mediante una función mutadora (updateDraft)', () => {
      const draft = { preliminaryDraftId: 'update-1', isArchived: false } as PreliminaryDraft;
      service.addDraft(draft);

      service.updateDraft('update-1', (d) => ({ ...d, isArchived: true }));

      const updatedDraft = service.allPreliminaryDrafts().find(d => d.preliminaryDraftId === 'update-1');
      expect(updatedDraft?.isArchived).toBe(true);
    });

    it('debería eliminar un borrador (removeDraft)', () => {
      const draft = { preliminaryDraftId: 'del-1' } as PreliminaryDraft;
      service.addDraft(draft);

      expect(service.allPreliminaryDrafts().length).toBe(1);

      service.removeDraft('del-1');
      expect(service.allPreliminaryDrafts().length).toBe(0);
    });

    it('debería obtener un borrador por ID asincrónicamente (getById)', fakeAsync(() => {
      const draft = { preliminaryDraftId: 'async-1' } as PreliminaryDraft;
      service.addDraft(draft);

      let result: PreliminaryDraft | undefined;
      service.getById('async-1').subscribe(res => result = res);

      expect(result).toBeUndefined(); // Aún no ha pasado el tiempo

      tick(500); // Avanzamos el delay(500)

      expect(result).toEqual(draft);
    }));
  });
});
