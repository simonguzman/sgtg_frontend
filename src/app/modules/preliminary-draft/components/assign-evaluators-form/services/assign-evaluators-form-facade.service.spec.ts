import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';

import { AssignEvaluatorsFormFacadeService } from './assign-evaluators-form-facade.service';
import { UserService } from '../../../../users/services/user.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

import { User } from '../../../../users/interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('AssignEvaluatorsFormFacadeService', () => {
  let facade: AssignEvaluatorsFormFacadeService;

  let mockUserService: { users: ReturnType<typeof signal>; getAuthorsNames: jest.Mock };
  let mockPreliminaryDraftService: { validateReviewersRules: jest.Mock };
  let mockNotificationService: { show: jest.Mock };

  // Ampliamos el mock de usuarios para cubrir TODAS las ramas lógicas del computado
  const mockUsers: User[] = [
    { id: 'u1', firstName: 'Docente', lastName: 'Uno', roles: [UserRoleType.DOCENTE] },
    { id: 'u2', firstName: 'Docente', lastName: 'Dos', roles: [UserRoleType.DOCENTE] },
    { id: 'u3', firstName: 'Jefe', lastName: 'Dep', roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP] }, // Conflicto: Jefe
    { id: 'u4', firstName: 'Director', lastName: 'Proyecto', roles: [UserRoleType.DOCENTE] }, // Participante: Director
    { id: 'u5', firstName: 'Codirector', lastName: 'Proyecto', roles: [UserRoleType.DOCENTE] }, // Participante: Codirector
    { id: 'u6', firstName: 'Asesor', lastName: 'Proyecto', roles: [UserRoleType.DOCENTE] }, // Participante: Asesor
    { id: 'u7', firstName: 'Autor', lastName: 'String', roles: [UserRoleType.DOCENTE] }, // Participante: Autor (ID string)
    { id: 'u8', firstName: 'Autor', lastName: 'Object', roles: [UserRoleType.DOCENTE] }, // Participante: Autor (Objeto)
    { id: 'u9', firstName: 'Sin', lastName: 'RolDocente', roles: [] }, // No es docente
  ] as unknown as User[];

  beforeEach(() => {
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
  });

  describe('Computados: availableEvaluators & options', () => {
    it('debería retornar vacío si no hay preliminaryDraft o proposalData', () => {
      facade.preliminaryDraft.set(null);
      expect(facade.evaluator1Options()).toEqual([]);

      facade.preliminaryDraft.set({} as PreliminaryDraft); // Sin proposalData
      expect(facade.evaluator1Options()).toEqual([]);
    });

    it('debería filtrar participantes del proyecto, no-docentes y roles conflictivos', () => {
      const mockDraft = {
        proposalData: {
          director: { id: 'u4' },
          codirector: { id: 'u5' },
          advisor: { id: 'u6' },
          authors: ['u7', { id: 'u8' } as User] // Prueba la rama string y la rama User
        } as Proposal
      } as PreliminaryDraft;

      facade.preliminaryDraft.set(mockDraft);

      const ev1Options = facade.evaluator1Options();

      // De los 9 usuarios, solo u1 y u2 son docentes puros sin participación ni conflicto
      expect(ev1Options).toHaveLength(2);
      expect(ev1Options.map(opt => opt.id)).toEqual(['u1', 'u2']);
    });

    it('evaluator2Options no debería incluir al usuario seleccionado en evaluator1', () => {
      const mockDraft = { proposalData: {} as Proposal } as PreliminaryDraft;
      facade.preliminaryDraft.set(mockDraft);

      // Simulamos selección en el primer select (reacciona al valueChanges)
      facade.form.get('evaluator1')?.setValue('u1');

      const ev2Options = facade.evaluator2Options();

      expect(ev2Options.map(opt => opt.id)).not.toContain('u1'); // u1 desaparece
      expect(ev2Options.map(opt => opt.id)).toContain('u2'); // u2 sigue disponible
    });
  });

  describe('Validación Cruzada de Formularios (setupFormSubscriptions)', () => {
    it('debería limpiar evaluator2 si el valor de evaluator1 cambia a ser idéntico', () => {
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });

      // El usuario cambia el evaluador 1 y elige a u2 (que ya estaba en el evaluador 2)
      facade.form.get('evaluator1')?.setValue('u2');

      expect(facade.form.get('evaluator2')?.value).toBe('');
    });
  });

  describe('Helpers de la vista', () => {
    it('getMemberFullName debería concatenar los nombres ignorando undefined', () => {
      const userFull = { firstName: 'Juan', secondName: 'Carlos', lastName: 'Pérez' } as User;
      expect(facade.getMemberFullName(userFull)).toBe('Juan Carlos Pérez');
      expect(facade.getMemberFullName(undefined)).toBe('No asignado');
    });

    it('getAuthorsNames debería retornar la cadena del servicio o fallback', () => {
      expect(facade.getAuthorsNames([])).toBe('Autor Test'); // Valor mockeado
      mockUserService.getAuthorsNames.mockReturnValueOnce(''); // Simulamos vacío
      expect(facade.getAuthorsNames([])).toBe('No asignado');
    });

    it('isFieldInvalid e isFieldValid deberían funcionar según el estado del formControl', () => {
      const control = facade.form.get('evaluator1');

      // Estado inicial (untouched)
      expect(facade.isFieldInvalid('evaluator1')).toBeFalsy();
      expect(facade.isFieldValid('evaluator1')).toBeFalsy();

      // Marcamos como tocado pero está vacío (inválido)
      control?.markAsTouched();
      expect(facade.isFieldInvalid('evaluator1')).toBeTruthy();
      expect(facade.isFieldValid('evaluator1')).toBeFalsy();

      // Asignamos un valor (válido)
      control?.setValue('u1');
      expect(facade.isFieldInvalid('evaluator1')).toBeFalsy();
      expect(facade.isFieldValid('evaluator1')).toBeTruthy();
    });
  });

  describe('validateAndGetPayload', () => {
    it('debería retornar null y notificar si el formulario es inválido', () => {
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: '' }); // Falta el 2

      const result = facade.validateAndGetPayload();

      expect(result).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Formulario incompleto' })
      );
    });

    it('debería retornar null si el formulario es válido pero no hay preliminaryDraft cargado', () => {
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });
      facade.preliminaryDraft.set(null); // Caso límite (edge case)

      const result = facade.validateAndGetPayload();

      expect(result).toBeNull();
      expect(mockPreliminaryDraftService.validateReviewersRules).not.toHaveBeenCalled();
    });

    it('debería retornar null y notificar si validateReviewersRules falla', () => {
      const mockDraft = { proposalData: {} as Proposal } as PreliminaryDraft;
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
      const mockDraft = { proposalData: {} as Proposal } as PreliminaryDraft;
      facade.preliminaryDraft.set(mockDraft);
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });

      mockPreliminaryDraftService.validateReviewersRules.mockReturnValue(null); // Sin error

      const result = facade.validateAndGetPayload();

      expect(result).toEqual({ ev1: 'u1', ev2: 'u2' });
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });
  });
});
