import { TestBed } from '@angular/core/testing';
import { AssignEvaluatorsFormFacadeService } from './assign-evaluators-form-facade.service';
import { UserService } from '../../../../users/services/user.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';
import { User } from '../../../../users/interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('AssignEvaluatorsFormFacadeService', () => {
  let facade: AssignEvaluatorsFormFacadeService;

  let mockUserService: jest.Mocked<Partial<UserService>>;
  let mockPreliminaryDraftService: jest.Mocked<Partial<PreliminaryDraftService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;

  const mockUsers: User[] = [
    { id: 'u1', firstName: 'Docente', lastName: 'Uno', roles: [UserRoleType.DOCENTE] },
    { id: 'u2', firstName: 'Docente', lastName: 'Dos', roles: [UserRoleType.DOCENTE] },
    { id: 'u3', firstName: 'Jefe', lastName: 'Dep', roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP] }, // Conflicto
    { id: 'u4', firstName: 'Director', lastName: 'Proyecto', roles: [UserRoleType.DOCENTE] }, // Participante
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

  describe('Lógica de Filtrado de Evaluadores (Computed Signals)', () => {
    it('debería filtrar participantes del proyecto y roles conflictivos', () => {
      const mockDraft = {
        proposalData: {
          director: { id: 'u4' } // u4 no debe aparecer por ser director
        } as Proposal
      } as PreliminaryDraft;

      facade.draft.set(mockDraft);

      const ev1Options = facade.evaluator1Options();

      // Esperamos solo a u1 y u2 (u3 es jefe, u4 es director)
      expect(ev1Options).toHaveLength(2);
      expect(ev1Options.map(opt => opt.id)).toEqual(['u1', 'u2']);
    });

    it('evaluator2Options no debería incluir al usuario seleccionado en evaluator1', () => {
      const mockDraft = { proposalData: {} as Proposal } as PreliminaryDraft;
      facade.draft.set(mockDraft);

      // Simulamos que el usuario selecciona 'u1' en el primer select
      facade.form.get('evaluator1')?.setValue('u1');

      const ev2Options = facade.evaluator2Options();

      // u1 ya no debería estar disponible para el evaluador 2
      expect(ev2Options.map(opt => opt.id)).not.toContain('u1');
      expect(ev2Options.map(opt => opt.id)).toContain('u2');
    });
  });

  describe('Validación Cruzada de Formularios', () => {
    it('debería limpiar evaluator2 si se selecciona el mismo en evaluator1', () => {
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });

      // El usuario cambia el evaluador 1 por el que ya estaba en el evaluador 2
      facade.form.get('evaluator1')?.setValue('u2');

      expect(facade.form.get('evaluator2')?.value).toBe('');
    });
  });

  describe('Helpers de la vista', () => {
    it('getMemberFullName debería concatenar correctamente los nombres', () => {
      const user = { firstName: 'Juan', secondName: 'Carlos', lastName: 'Pérez' } as User;
      expect(facade.getMemberFullName(user)).toBe('Juan Carlos Pérez');
      expect(facade.getMemberFullName(undefined)).toBe('No asignado');
    });
  });

  describe('validateAndGetPayload', () => {
    it('debería retornar null y mostrar error si el formulario es inválido', () => {
      facade.form.patchValue({ evaluator1: '', evaluator2: '' }); // Inválido

      const result = facade.validateAndGetPayload();

      expect(result).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Formulario incompleto' })
      );
    });

    it('debería retornar null y mostrar error si validateReviewersRules falla', () => {
      const mockDraft = { proposalData: {} as Proposal } as PreliminaryDraft;
      facade.draft.set(mockDraft);
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });

      (mockPreliminaryDraftService.validateReviewersRules as jest.Mock).mockReturnValue('Error de regla de negocio');

      const result = facade.validateAndGetPayload();

      expect(result).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, message: 'Error de regla de negocio' })
      );
    });

    it('debería retornar el payload si todo es válido', () => {
      const mockDraft = { proposalData: {} as Proposal } as PreliminaryDraft;
      facade.draft.set(mockDraft);
      facade.form.patchValue({ evaluator1: 'u1', evaluator2: 'u2' });

      (mockPreliminaryDraftService.validateReviewersRules as jest.Mock).mockReturnValue(null); // Sin errores

      const result = facade.validateAndGetPayload();

      expect(result).toEqual({ ev1: 'u1', ev2: 'u2' });
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });
  });
});
