import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

describe('PreliminaryDraftAssignmentService', () => {
  let service: PreliminaryDraftAssignmentService;

  let mockStorageService: jest.Mocked<PreliminaryDraftStorageService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  beforeEach(() => {
    mockStorageService = {
      updateDraft: jest.fn()
    } as unknown as jest.Mocked<PreliminaryDraftStorageService>;

    mockUserService = {
      addRoleToUser: jest.fn(),
      // Simulamos usuarios existentes para que la búsqueda (find) dentro del servicio funcione
      users: signal([
        { id: 'eval-1', roles: [] },
        { id: 'eval-2', roles: [] }
      ])
    } as unknown as jest.Mocked<UserService>;

    mockEventBusService = {
      emit: jest.fn()
    } as unknown as jest.Mocked<EventBusService>;

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftAssignmentService,
        { provide: PreliminaryDraftStorageService, useValue: mockStorageService },
        { provide: UserService, useValue: mockUserService },
        { provide: EventBusService, useValue: mockEventBusService }
      ]
    });

    service = TestBed.inject(PreliminaryDraftAssignmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('validateReviewersRules', () => {
    it('debería retornar error si se selecciona el mismo evaluador dos veces', () => {
      const mockProposal = { id: '1' } as Proposal;
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-1');
      expect(result).toBe('Debe seleccionar dos evaluadores diferentes.');
    });

    it('debería retornar error si no se proporciona la propuesta', () => {
      const result = service.validateReviewersRules(null as unknown as Proposal, 'eval-1', 'eval-2');
      expect(result).toBe('No se proporcionaron los datos de la propuesta.');
    });

    it('debería retornar error si el evaluador 1 tiene vínculos (ej: es director)', () => {
      const mockProposal = { director: { id: 'eval-1' } } as unknown as Proposal;
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El primer docente tiene vínculos con la propuesta.');
    });

    it('debería retornar error si el evaluador 2 tiene vínculos (ej: es autor/estudiante)', () => {
      const mockProposal = { authors: [{ id: 'eval-2' }] } as unknown as Proposal;
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El segundo docente tiene vínculos con la propuesta.');
    });

    it('debería retornar error si el evaluador tiene vínculos y el autor es un string ID', () => {
      const mockProposal = { authors: ['eval-1'] } as unknown as Proposal;
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El primer docente tiene vínculos con la propuesta.');
    });

    it('debería retornar null si los evaluadores son válidos y distintos', () => {
      const mockProposal = {
        director: { id: 'dir-1' },
        authors: ['student-1']
      } as unknown as Proposal;
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBeNull();
    });
  });

  describe('assignReviewersMock', () => {
    it('debería asignar roles, actualizar el borrador y notificar tras un delay', fakeAsync(() => {
      const preliminaryDraftId = 'draft-1';
      const evaluatorsIds = ['eval-1', 'eval-2'];

      // Estado inicial simulado para que el callback lo lea
      const mockDraftState = {
        preliminaryDraftId,
        proposalData: {
          title: 'Sistema AI',
          authors: ['author-1'],
          director: { id: 'dir-1' }
        }
      } as unknown as PreliminaryDraft;

      let finalDraftState: PreliminaryDraft | undefined;

      // Mockeamos la implementación para que EJECUTE el callback sincronamente
      mockStorageService.updateDraft.mockImplementation((id, callback) => {
        finalDraftState = callback(mockDraftState);
      });

      let isCompleted = false;

      service.assignReviewersMock(preliminaryDraftId, evaluatorsIds).subscribe({
        complete: () => { isCompleted = true; }
      });

      expect(mockUserService.addRoleToUser).not.toHaveBeenCalled();

      // Avanzamos el tiempo virtual
      tick(800);

      // 1. Verificamos asignación de roles
      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('eval-1', UserRoleType.EVALUADOR);
      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('eval-2', UserRoleType.EVALUADOR);

      // 2. Verificamos que el estado modificado es el correcto
      expect(finalDraftState).toBeDefined();
      expect(finalDraftState?.state).toBe(stateList.EN_REVISION);
      expect(finalDraftState?.evaluators?.length).toBe(2);
      expect(finalDraftState?.evaluationDeadline).toBeDefined();

      // 3. Verificamos emisión de notificaciones (EventBus)
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.REVIEWERS_ASSIGNED,
          payload: {
            preliminaryDraftId,
            evaluators: evaluatorsIds,
            preliminaryDraftTitle: 'Sistema AI' // Ahora sí tendrá el título correcto
          }
        })
      );

      // 4. Verificamos la lista de notificados
      const emitCallArgs = mockEventBusService.emit.mock.calls[0][0];
      const targetUserIds = emitCallArgs.targetUserIds;

      expect(targetUserIds).toContain('eval-1');
      expect(targetUserIds).toContain('eval-2');
      expect(targetUserIds).toContain('author-1');
      expect(targetUserIds).toContain('dir-1');

      expect(isCompleted).toBe(true);
    }));
  });
});
