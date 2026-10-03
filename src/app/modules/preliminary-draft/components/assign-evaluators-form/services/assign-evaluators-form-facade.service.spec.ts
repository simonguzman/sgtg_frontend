import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';
import { AssignEvaluatorsFormFacadeService } from './assign-evaluators-form-facade.service';
import { UserService } from '../../../../users/services/user.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { User } from '../../../../users/interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  firstName: 'Nombre',
  lastName: 'Apellido',
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'p1',
  title: 'Propuesta de Prueba',
  state: stateList.APROBADO,
  director: createMockUser(),
  evaluations: [],
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'p1',
  proposalData: createMockProposal(),
  documents: [],
  state: stateList.EN_REVISION,
  createdData: new Date(),
  evaluations: [],
  evaluators: [],
  isArchived: false,
  ...overrides
} as PreliminaryDraft);

describe('AssignEvaluatorsFormFacadeService', () => {
  let facade: AssignEvaluatorsFormFacadeService;

  let mockUserService: { users: WritableSignal<User[]>; getAuthorsNames: jest.Mock };
  let mockPreliminaryDraftService: { validateReviewersRules: jest.Mock };
  let mockNotificationService: { show: jest.Mock };

  const mockUsers: User[] = [
    createMockUser({ id: 'u1', firstName: 'Docente', lastName: 'Uno', roles: [UserRoleType.DOCENTE] }),
    createMockUser({ id: 'u2', firstName: 'Docente', lastName: 'Dos', roles: [UserRoleType.DOCENTE] }),
    createMockUser({ id: 'u3', firstName: 'Jefe', lastName: 'Dep', roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP] }),
    createMockUser({ id: 'u4', firstName: 'Director', lastName: 'Proyecto', roles: [UserRoleType.DOCENTE] }),
    createMockUser({ id: 'u5', firstName: 'Codirector', lastName: 'Proyecto', roles: [UserRoleType.DOCENTE] }),
    createMockUser({ id: 'u6', firstName: 'Asesor', lastName: 'Proyecto', roles: [UserRoleType.DOCENTE] }),
    createMockUser({ id: 'u7', firstName: 'Autor', lastName: 'String', roles: [UserRoleType.DOCENTE] }),
    createMockUser({ id: 'u8', firstName: 'Autor', lastName: 'Object', roles: [UserRoleType.DOCENTE] }),
    createMockUser({ id: 'u9', firstName: 'Sin', lastName: 'RolDocente', roles: [] }),
  ];

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUserService = {
      users: signal(mockUsers),
      getAuthorsNames: jest.fn().mockReturnValue('Autor Test')
    };

    mockPreliminaryDraftService = {
      validateReviewersRules: jest.fn()
    };

    mockNotificationService = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        AssignEvaluatorsFormFacadeService,
        { provide: UserService, useValue: mockUserService },
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    facade = TestBed.inject(AssignEvaluatorsFormFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Computados: availableEvaluators & options', () => {
    it('debería retornar vacío si no hay preliminaryDraft o proposalData', () => {
      facade.preliminaryDraft.set(null);
      expect(facade.evaluator1Options()).toEqual([]);

      facade.preliminaryDraft.set(createMockPreliminaryDraft({ proposalData: undefined }));
      expect(facade.evaluator1Options()).toEqual([]);
    });

    it('debería filtrar participantes del proyecto, no-docentes y roles conflictivos', () => {
      const mockDraft = createMockPreliminaryDraft({
        proposalData: createMockProposal({
          director: createMockUser({ id: 'u4' }),
          codirector: createMockUser({ id: 'u5' }),
          advisor: createMockUser({ id: 'u6' }),
          authors: [createMockUser({ id: 'u7' }), createMockUser({ id: 'u8' })]
        })
      });

      facade.preliminaryDraft.set(mockDraft);

      const ev1Options = facade.evaluator1Options();

      expect(ev1Options).toHaveLength(2);
      expect(ev1Options.map(opt => opt.id)).toEqual(['u1', 'u2']);
    });

    it('evaluator2Options no debería incluir al usuario seleccionado en evaluator1', () => {
      const mockDraft = createMockPreliminaryDraft();
      facade.preliminaryDraft.set(mockDraft);

      facade.form.get('evaluator1')?.setValue('u1');

      const ev2Options = facade.evaluator2Options();

      expect(ev2Options.map(opt => opt.id)).not.toContain('u1');
      expect(ev2Options.map(opt => opt.id)).toContain('u2');
    });
  });

  describe('Validación Cruzada de Formularios (setupFormSubscriptions)', () => {
    it('debería limpiar evaluator2 si el valor de evaluator1 cambia a ser idéntico', () => {
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });

      facade.form.get('evaluator1')?.setValue('u2');

      expect(facade.form.get('evaluator2')?.value).toBe('');
    });
  });

  describe('Helpers de la vista', () => {
    it('getMemberFullName debería concatenar los nombres ignorando undefined', () => {
      const userFull = createMockUser({ firstName: 'Juan', secondName: 'Carlos', lastName: 'Pérez', secondLastName: '' });
      expect(facade.getMemberFullName(userFull)).toBe('Juan Carlos Pérez');
      expect(facade.getMemberFullName(undefined)).toBe('No asignado');
    });

    it('getAuthorsNames debería retornar la cadena del servicio o fallback', () => {
      expect(facade.getAuthorsNames([])).toBe('Autor Test');
      mockUserService.getAuthorsNames.mockReturnValueOnce('');
      expect(facade.getAuthorsNames([])).toBe('No asignado');
    });

    it('isFieldInvalid e isFieldValid deberían funcionar según el estado del formControl', () => {
      const control = facade.form.get('evaluator1');

      expect(facade.isFieldInvalid('evaluator1')).toBeFalsy();
      expect(facade.isFieldValid('evaluator1')).toBeFalsy();

      control?.markAsTouched();
      expect(facade.isFieldInvalid('evaluator1')).toBeTruthy();
      expect(facade.isFieldValid('evaluator1')).toBeFalsy();

      control?.setValue('u1');
      expect(facade.isFieldInvalid('evaluator1')).toBeFalsy();
      expect(facade.isFieldValid('evaluator1')).toBeTruthy();
    });
  });

  describe('validateAndGetPayload', () => {
    it('debería retornar null y notificar si el formulario es inválido', () => {
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: '' });

      const result = facade.validateAndGetPayload();

      expect(result).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Formulario incompleto' })
      );
    });

    it('debería retornar null si el formulario es válido pero no hay preliminaryDraft cargado', () => {
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });
      facade.preliminaryDraft.set(null);

      const result = facade.validateAndGetPayload();

      expect(result).toBeNull();
      expect(mockPreliminaryDraftService.validateReviewersRules).not.toHaveBeenCalled();
    });

    it('debería retornar null y notificar si validateReviewersRules falla', () => {
      const mockDraft = createMockPreliminaryDraft();
      facade.preliminaryDraft.set(mockDraft);
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });

      mockPreliminaryDraftService.validateReviewersRules.mockReturnValue('Regla rota');

      const result = facade.validateAndGetPayload();

      expect(result).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, message: 'Regla rota' })
      );
    });

    it('debería retornar el payload si el formulario y las reglas de negocio son válidos', () => {
      const mockDraft = createMockPreliminaryDraft();
      facade.preliminaryDraft.set(mockDraft);
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });

      mockPreliminaryDraftService.validateReviewersRules.mockReturnValue(null);

      const result = facade.validateAndGetPayload();

      expect(result).toEqual({ ev1: 'u1', ev2: 'u2' });
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });
  });
});
