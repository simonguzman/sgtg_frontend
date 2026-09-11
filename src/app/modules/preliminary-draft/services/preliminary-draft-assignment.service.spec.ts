import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';

// Mock externo para aislar utilidades de fecha e independizar la prueba del día actual
jest.mock('../../../core/utils/date-utils', () => ({
  addBusinessDays: jest.fn()
}));
import { addBusinessDays } from '../../../core/utils/date-utils';

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
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

// ── Mocks Estrictos de Servicios ─────────────────────────────────────────────

interface MockPreliminaryDraftStorageService {
  updateDraft: jest.Mock;
}

interface MockUserService {
  addRoleToUser: jest.Mock;
  users: WritableSignal<User[]>;
}

interface MockEventBusService {
  emit: jest.Mock;
}

// ── Funciones Fábrica fuertemente tipadas (Adiós "any") ──────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'default-user',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Name',
  secondName: '',
  lastName: 'Lastname',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'user@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
} as User);

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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('PreliminaryDraftAssignmentService', () => {
  let service: PreliminaryDraftAssignmentService;

  let storageSpy: MockPreliminaryDraftStorageService;
  let userSpy: MockUserService;
  let eventBusSpy: MockEventBusService;

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    storageSpy = {
      updateDraft: jest.fn()
    };

    userSpy = {
      // FIX: Debe retornar un observable para que .pipe(first()) no falle en el servicio
      addRoleToUser: jest.fn().mockReturnValue(of(undefined)),
      users: signal([
        createMockUser({ id: 'eval-1' }),
        createMockUser({ id: 'eval-2' })
      ])
    };

    eventBusSpy = {
      emit: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftAssignmentService,
        { provide: PreliminaryDraftStorageService, useValue: storageSpy },
        { provide: UserService, useValue: userSpy },
        { provide: EventBusService, useValue: eventBusSpy }
      ]
    });

    service = TestBed.inject(PreliminaryDraftAssignmentService);

    // Mockeamos la fecha que se calculará como deadline
    (addBusinessDays as jest.Mock).mockReturnValue(new Date('2026-09-20'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateReviewersRules', () => {
    it('debería retornar error si se selecciona el mismo evaluador dos veces', () => {
      const mockProposal = createMockProposal();
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-1');
      expect(result).toBe('Debe seleccionar dos evaluadores diferentes.');
    });

    it('debería retornar error si no se proporciona la propuesta', () => {
      // Probamos la defensa contra null en runtime usando 'unknown' en lugar de ts-expect-error
      const result = service.validateReviewersRules(null as unknown as Proposal, 'eval-1', 'eval-2');
      expect(result).toBe('No se proporcionaron los datos de la propuesta.');
    });

    it('debería retornar error si el evaluador 1 tiene vínculos (ej: es director)', () => {
      const mockProposal = createMockProposal({ director: createMockUser({ id: 'eval-1' }) });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El primer docente tiene vínculos con la propuesta.');
    });

    it('debería retornar error si el evaluador 2 tiene vínculos (ej: es autor/estudiante)', () => {
      const mockProposal = createMockProposal({ authors: [createMockUser({ id: 'eval-2' })] });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El segundo docente tiene vínculos con la propuesta.');
    });

    it('debería retornar error si el evaluador tiene vínculos y el autor es un string ID', () => {
      // Simulamos una entrada malformada proveniente de una API o componente legacy
      const mockProposal = createMockProposal({ authors: ['eval-1'] as unknown as User[] });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El primer docente tiene vínculos con la propuesta.');
    });

    it('debería retornar null si los evaluadores son válidos y distintos', () => {
      const mockProposal = createMockProposal({
        director: createMockUser({ id: 'dir-1' }),
        authors: [createMockUser({ id: 'student-1' })]
      });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBeNull();
    });
  });

  describe('assignReviewersMock', () => {
    it('debería asignar roles, actualizar el borrador y notificar tras un delay', fakeAsync(() => {
      const preliminaryDraftId = 'draft-1';
      const evaluatorsIds = ['eval-1', 'eval-2'];

      const mockDraftState = createMockDraft({
        preliminaryDraftId,
        proposalData: createMockProposal({
          title: 'Sistema AI',
          authors: [createMockUser({ id: 'author-1' })],
          director: createMockUser({ id: 'dir-1' })
        })
      });

      let finalDraftState: PreliminaryDraft | undefined;

      // Interceptamos la actualización para evaluar cómo quedó el objeto
      storageSpy.updateDraft.mockImplementation((id: string, mutator: (draft: PreliminaryDraft) => PreliminaryDraft) => {
        finalDraftState = mutator(mockDraftState);
      });

      let isCompleted = false;

      service.assignReviewersMock(preliminaryDraftId, evaluatorsIds).subscribe({
        complete: () => { isCompleted = true; }
      });

      expect(userSpy.addRoleToUser).not.toHaveBeenCalled();

      // Avanzamos el tiempo del delay de RxJS
      tick(800);

      expect(userSpy.addRoleToUser).toHaveBeenCalledWith('eval-1', UserRoleType.EVALUADOR);
      expect(userSpy.addRoleToUser).toHaveBeenCalledWith('eval-2', UserRoleType.EVALUADOR);

      expect(storageSpy.updateDraft).toHaveBeenCalledWith(preliminaryDraftId, expect.any(Function));

      // Verificamos que la mutación de estado fue correcta y usó el Mock de la fecha
      expect(finalDraftState).toBeDefined();
      expect(finalDraftState?.state).toBe(stateList.EN_REVISION);
      expect(finalDraftState?.evaluators?.length).toBe(2);
      expect(finalDraftState?.evaluationDeadline).toEqual(new Date('2026-09-20'));

      // Usamos el poder nativo de Jest para verificar la emisión del evento limpiamente
      expect(eventBusSpy.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.REVIEWERS_ASSIGNED,
          targetUserIds: expect.arrayContaining(['eval-1', 'eval-2', 'author-1', 'dir-1']),
          payload: expect.objectContaining({
            preliminaryDraftId,
            evaluators: evaluatorsIds,
            preliminaryDraftTitle: 'Sistema AI'
          })
        })
      );

      expect(isCompleted).toBe(true);
    }));
  });
});
