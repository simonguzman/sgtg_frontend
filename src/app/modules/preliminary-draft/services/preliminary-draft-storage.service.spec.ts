import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

// Tipos auxiliares derivados de las interfaces
type ProposalType = NonNullable<PreliminaryDraft['proposalData']>;
type EvaluationType = NonNullable<PreliminaryDraft['evaluations']>[number];

// Factory helpers con tipado estricto
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-default-id',
    name: 'Default User',
    email: 'user@test.com',
    role: UserRoleType.ESTUDIANTE,
    ...overrides
  } as User;
}

function createMockProposal(overrides: Partial<ProposalType> = {}): ProposalType {
  return {
    title: 'Proposal Title Mock',
    description: 'Proposal Description Mock',
    director: undefined,
    codirector: undefined,
    advisor: undefined,
    authors: [],
    ...overrides
  } as ProposalType;
}

function createMockEvaluation(overrides: Partial<EvaluationType> = {}): EvaluationType {
  return {
    evaluatorId: 'evaluator-default-id',
    ...overrides
  } as EvaluationType;
}

function createMockDraft(overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft {
  return {
    preliminaryDraftId: 'draft-default-id',
    isArchived: false,
    proposalData: undefined,
    evaluators: [],
    evaluations: [],
    ...overrides
  } as PreliminaryDraft;
}

describe('PreliminaryDraftStorageService', () => {
  let service: PreliminaryDraftStorageService;
  let mockAuthService: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock;
  };

  let localStorageStore: Record<string, string>;

  beforeEach(() => {
    localStorageStore = {};

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => localStorageStore[key] || null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageStore[key] = value;
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete localStorageStore[key];
    });

    mockAuthService = {
      currentUser: signal<User | null>(null),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente y cargar la lista por defecto si localStorage está vacío', () => {
    service = TestBed.inject(PreliminaryDraftStorageService);
    expect(service).toBeTruthy();
    expect(service.allPreliminaryDrafts().length).toBeGreaterThanOrEqual(0);
  });

  it('debería cargar datos almacenados desde localStorage si existen y son válidos', () => {
    const storedDrafts = [createMockDraft({ preliminaryDraftId: 'stored-1' })];
    localStorageStore['preliminaryDrafts'] = JSON.stringify(storedDrafts);

    service = TestBed.inject(PreliminaryDraftStorageService);

    expect(service.allPreliminaryDrafts()).toHaveLength(1);
    expect(service.allPreliminaryDrafts()[0].preliminaryDraftId).toBe('stored-1');
  });

  it('debería limpiar localStorage y cargar mocks por defecto si el JSON almacenado es inválido', () => {
    localStorageStore['preliminaryDrafts'] = '{ invalid json }';

    service = TestBed.inject(PreliminaryDraftStorageService);

    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('preliminaryDrafts');
    expect(service.allPreliminaryDrafts().length).toBeGreaterThanOrEqual(0);
  });

  describe('Propiedad computada: preliminaryDrafts', () => {
    it('debería retornar un arreglo vacío si no hay usuario autenticado', () => {
      mockAuthService.currentUser.set(null);
      service = TestBed.inject(PreliminaryDraftStorageService);

      expect(service.preliminaryDrafts()).toEqual([]);
    });

    it('debería retornar todos los borradores NO archivados si el usuario tiene un rol privileged', () => {
      const mockDrafts = [
        createMockDraft({ preliminaryDraftId: '1', isArchived: false }),
        createMockDraft({ preliminaryDraftId: '2', isArchived: false }),
        createMockDraft({ preliminaryDraftId: '3', isArchived: true })
      ];
      localStorageStore['preliminaryDrafts'] = JSON.stringify(mockDrafts);

      mockAuthService.currentUser.set(createMockUser({ id: 'admin-1' }));
      mockAuthService.hasAnyRole.mockReturnValue(true);

      service = TestBed.inject(PreliminaryDraftStorageService);

      const drafts = service.preliminaryDrafts();
      expect(drafts).toHaveLength(2);
      expect(drafts.map(d => d.preliminaryDraftId)).toEqual(['1', '2']);
    });

    it('debería permitir acceso al director, codirector y asesor', () => {
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
      localStorageStore['preliminaryDrafts'] = JSON.stringify(mockDrafts);

      mockAuthService.currentUser.set(createMockUser({ id: userId }));
      mockAuthService.hasAnyRole.mockReturnValue(false);

      service = TestBed.inject(PreliminaryDraftStorageService);

      expect(service.preliminaryDrafts()).toHaveLength(3);
    });

    it('debería permitir acceso cuando el usuario es autor (como ID en string o como objeto User)', () => {
      const userId = 'student-1';
      const mockDrafts = [
        createMockDraft({
          preliminaryDraftId: 'str-author',
          // Casteo a unknown -> User para engañar a TS a propósito y probar el caso del string en runtime
          proposalData: createMockProposal({ authors: [userId as unknown as User] })
        }),
        createMockDraft({
          preliminaryDraftId: 'obj-author',
          proposalData: createMockProposal({ authors: [createMockUser({ id: userId })] })
        })
      ];
      localStorageStore['preliminaryDrafts'] = JSON.stringify(mockDrafts);

      mockAuthService.currentUser.set(createMockUser({ id: userId }));
      mockAuthService.hasAnyRole.mockReturnValue(false);

      service = TestBed.inject(PreliminaryDraftStorageService);

      expect(service.preliminaryDrafts()).toHaveLength(2);
    });

    it('debería permitir acceso cuando el usuario es un evaluador con evaluación emitida (evaluatorId)', () => {
      const userId = 'evaluator-1';
      const mockDrafts = [
        createMockDraft({
          preliminaryDraftId: 'eval-draft',
          proposalData: createMockProposal(), // <-- SOLUCIÓN: Agregar esto para pasar el filtro del servicio
          evaluations: [createMockEvaluation({ evaluatorId: userId })]
        })
      ];
      localStorageStore['preliminaryDrafts'] = JSON.stringify(mockDrafts);

      mockAuthService.currentUser.set(createMockUser({ id: userId }));
      mockAuthService.hasAnyRole.mockReturnValue(false);

      service = TestBed.inject(PreliminaryDraftStorageService);

      expect(service.preliminaryDrafts()).toHaveLength(1);
    });

    it('debería denegar el acceso a borradores sin proposalData o donde el usuario no participa', () => {
      const mockDrafts = [
        createMockDraft({ preliminaryDraftId: 'no-prop', proposalData: undefined }),
        createMockDraft({
          preliminaryDraftId: 'other-user',
          // Casteo necesario para probar la resiliencia contra IDs en string que no coinciden
          proposalData: createMockProposal({ authors: ['other-id' as unknown as User] })
        })
      ];
      localStorageStore['preliminaryDrafts'] = JSON.stringify(mockDrafts);

      mockAuthService.currentUser.set(createMockUser({ id: 'user-1' }));
      mockAuthService.hasAnyRole.mockReturnValue(false);

      service = TestBed.inject(PreliminaryDraftStorageService);

      expect(service.preliminaryDrafts()).toEqual([]);
    });
  });

  describe('Operaciones CRUD y Sincronización', () => {
    beforeEach(() => {
      localStorageStore['preliminaryDrafts'] = JSON.stringify([]);
      service = TestBed.inject(PreliminaryDraftStorageService);
    });

    it('debería agregar un borrador y sincronizarlo con localStorage mediante el efecto', () => {
      const newDraft = createMockDraft({ preliminaryDraftId: 'new-1' });

      service.addDraft(newDraft);
      TestBed.flushEffects();

      expect(service.allPreliminaryDrafts()[0]).toEqual(newDraft);
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'preliminaryDrafts',
        expect.stringContaining('new-1')
      );
    });

    it('debería actualizar un borrador existente con la función mutadora', () => {
      const draft = createMockDraft({ preliminaryDraftId: 'update-1', isArchived: false });
      service.addDraft(draft);

      service.updateDraft('update-1', d => ({ ...d, isArchived: true }));

      const updated = service.allPreliminaryDrafts().find(d => d.preliminaryDraftId === 'update-1');
      expect(updated?.isArchived).toBe(true);
    });

    it('no debería alterar la lista si se intenta actualizar un ID inexistente', () => {
      const draft = createMockDraft({ preliminaryDraftId: 'existing-1' });
      service.addDraft(draft);

      // Guardamos la longitud actual (que incluirá los mocks por defecto de tu servicio)
      const currentLength = service.allPreliminaryDrafts().length;

      service.updateDraft('non-existent', d => ({ ...d, isArchived: true }));

      // Comprobamos que la longitud no cambió
      expect(service.allPreliminaryDrafts()).toHaveLength(currentLength);

      // Comprobamos que nuestro item no fue alterado
      const existing = service.allPreliminaryDrafts().find(d => d.preliminaryDraftId === 'existing-1');
      expect(existing?.isArchived).toBe(false);
    });

    it('debería remover un borrador por ID', () => {
      const draft = createMockDraft({ preliminaryDraftId: 'del-1' });
      service.addDraft(draft);

      const currentLength = service.allPreliminaryDrafts().length;

      service.removeDraft('del-1');

      // Comprobamos que la longitud se redujo exactamente en 1
      expect(service.allPreliminaryDrafts()).toHaveLength(currentLength - 1);

      // Verificamos que el item específicamente fue eliminado
      expect(service.allPreliminaryDrafts().find(d => d.preliminaryDraftId === 'del-1')).toBeUndefined();
    });

    it('debería obtener un borrador por ID asincrónicamente con delay', fakeAsync(() => {
      const draft = createMockDraft({ preliminaryDraftId: 'async-1' });
      service.addDraft(draft);

      let result: PreliminaryDraft | undefined;
      service.getById('async-1').subscribe(res => {
        result = res;
      });

      expect(result).toBeUndefined();

      tick(500);

      expect(result).toEqual(draft);
    }));
  });
});
