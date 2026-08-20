import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { User } from '../../users/interfaces/user.interface';

describe('PreliminaryDraftAssignmentService', () => {
  let service: PreliminaryDraftAssignmentService;

  let storageSpy: { updateDraft: jest.Mock };
  let userSpy: {
    addRoleToUser: jest.Mock;
    users: WritableSignal<Partial<User>[]>;
  };
  let eventBusSpy: { emit: jest.Mock };

  const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
    id: 'prop-1',
    title: 'Propuesta Base',
    authors: [],
    ...overrides
  } as Proposal);

  const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
    preliminaryDraftId: 'draft-1',
    state: stateList.EN_REVISION,
    evaluations: [],
    documents: [],
    createdData: new Date(),
    ...overrides
  } as PreliminaryDraft);

  beforeEach(() => {
    storageSpy = {
      updateDraft: jest.fn()
    };

    userSpy = {
      addRoleToUser: jest.fn(),
      users: signal([
        { id: 'eval-1', roles: [] },
        { id: 'eval-2', roles: [] }
      ])
    };

    eventBusSpy = {
      emit: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftAssignmentService,
        { provide: PreliminaryDraftStorageService, useValue: storageSpy as unknown as PreliminaryDraftStorageService },
        { provide: UserService, useValue: userSpy as unknown as UserService },
        { provide: EventBusService, useValue: eventBusSpy as unknown as EventBusService }
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
      const mockProposal = createMockProposal();
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-1');
      expect(result).toBe('Debe seleccionar dos evaluadores diferentes.');
    });

    it('debería retornar error si no se proporciona la propuesta', () => {
      const result = service.validateReviewersRules(null as unknown as Proposal, 'eval-1', 'eval-2');
      expect(result).toBe('No se proporcionaron los datos de la propuesta.');
    });

    it('debería retornar error si el evaluador 1 tiene vínculos (ej: es director)', () => {
      // 🔹 FIX: Convertido a `as User`
      const mockProposal = createMockProposal({ director: { id: 'eval-1' } as User });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El primer docente tiene vínculos con la propuesta.');
    });

    it('debería retornar error si el evaluador 2 tiene vínculos (ej: es autor/estudiante)', () => {
      // 🔹 FIX: Arreglo de objetos `User` en lugar de strings sueltos
      const mockProposal = createMockProposal({ authors: [{ id: 'eval-2' } as User] });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El segundo docente tiene vínculos con la propuesta.');
    });

    it('debería retornar error si el evaluador tiene vínculos y el autor es un string ID', () => {
      // 🔹 FIX: Forzamos el tipo 'string' a 'User[]' específicamente para probar la defensa del servicio
      const mockProposal = createMockProposal({ authors: ['eval-1'] as unknown as User[] });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El primer docente tiene vínculos con la propuesta.');
    });

    it('debería retornar null si los evaluadores son válidos y distintos', () => {
      // 🔹 FIX: Objetos `User` en lugar de strings
      const mockProposal = createMockProposal({
        director: { id: 'dir-1' } as User,
        authors: [{ id: 'student-1' } as User]
      });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBeNull();
    });
  });

  describe('assignReviewersMock', () => {
    it('debería asignar roles, actualizar el borrador y notificar tras un delay', fakeAsync(() => {
      const preliminaryDraftId = 'draft-1';
      const evaluatorsIds = ['eval-1', 'eval-2'];

      // 1. Preparamos el estado inicial del anteproyecto
      const mockDraftState = createMockDraft({
        preliminaryDraftId,
        proposalData: createMockProposal({
          title: 'Sistema AI',
          authors: [{ id: 'author-1' } as User],
          director: { id: 'dir-1' } as User
        })
      });

      let finalDraftState: PreliminaryDraft | undefined;

      // 2. 🔹 FIX CLAVE: Configuramos el espía para que ejecute el callback INMEDIATAMENTE
      // Así las variables currentDraftTitle y notifyUserIds se llenan antes de emitir el evento.
      storageSpy.updateDraft.mockImplementation((id: string, callback: (draft: PreliminaryDraft) => PreliminaryDraft) => {
        finalDraftState = callback(mockDraftState);
      });

      let isCompleted = false;

      service.assignReviewersMock(preliminaryDraftId, evaluatorsIds).subscribe({
        complete: () => { isCompleted = true; }
      });

      expect(userSpy.addRoleToUser).not.toHaveBeenCalled();

      // Avanzamos el tiempo de los 800ms del delay
      tick(800);

      expect(userSpy.addRoleToUser).toHaveBeenCalledWith('eval-1', UserRoleType.EVALUADOR);
      expect(userSpy.addRoleToUser).toHaveBeenCalledWith('eval-2', UserRoleType.EVALUADOR);

      expect(storageSpy.updateDraft).toHaveBeenCalledWith(preliminaryDraftId, expect.any(Function));

      // 3. Verificamos que el estado modificado es el correcto
      expect(finalDraftState).toBeDefined();
      expect(finalDraftState?.state).toBe(stateList.EN_REVISION);
      expect(finalDraftState?.evaluators?.length).toBe(2);
      expect(finalDraftState?.evaluationDeadline).toBeDefined();

      // 4. Verificamos emisión de notificaciones (EventBus)
      // Ahora el título SÍ será 'Sistema AI' porque el callback se ejecutó a tiempo.
      expect(eventBusSpy.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.REVIEWERS_ASSIGNED,
          payload: {
            preliminaryDraftId,
            evaluators: evaluatorsIds,
            preliminaryDraftTitle: 'Sistema AI'
          }
        })
      );

      type EmitParams = Parameters<typeof service['eventBus']['emit']>[0];
      const emitCallArgs = eventBusSpy.emit.mock.calls[0][0] as EmitParams;
      const targetUserIds = emitCallArgs.targetUserIds || [];

      // 5. Verificamos que los autores y el director se añadieron correctamente
      expect(targetUserIds).toContain('eval-1');
      expect(targetUserIds).toContain('eval-2');
      expect(targetUserIds).toContain('author-1');
      expect(targetUserIds).toContain('dir-1');

      expect(isCompleted).toBe(true);
    }));
  });
});
