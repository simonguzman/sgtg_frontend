import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ThesisWorkEvaluationService } from './thesis-work-evaluation.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';

// 1. Tipado estricto para los mocks de servicios dependientes (Sin any)
type MockThesisWorkStorageService = {
  updateWork: jest.Mock<void, [string, (w: ThesisWork) => ThesisWork]>;
};

type MockEventBusService = {
  emit: jest.Mock<void, [object]>;
};

describe('ThesisWorkEvaluationService', () => {
  let service: ThesisWorkEvaluationService;
  let storageMock: MockThesisWorkStorageService;
  let eventBusMock: MockEventBusService;

  // 2. Factory helper para construir objetos de prueba completos y fuertemente tipados
  const createMockThesisWork = (overrides?: Partial<ThesisWork>): ThesisWork => ({
    id: 'thesis-123',
    state: stateList.EN_DESARROLLO,
    documents: [],
    finalDeliveries: [],
    pazYSalvos: [],
    correctedDeliveries: [],
    evaluations: [],
    advances: [
      {
        id: 'adv-1',
        title: 'Primer Avance',
        status: stateList.EN_REVISION,
      },
    ],
    preliminaryDraftData: {
      proposalData: {
        title: 'Desarrollo de IA',
        authors: [{ id: 'student-1' } as User],
        director: { id: 'director-1' } as User,
        codirector: { id: 'codirector-1' } as User,
      },
    },
    ...overrides,
  } as ThesisWork);

  beforeEach(() => {
    storageMock = {
      updateWork: jest.fn(),
    };

    eventBusMock = {
      emit: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkEvaluationService,
        { provide: ThesisWorkStorageService, useValue: storageMock },
        { provide: EventBusService, useValue: eventBusMock },
      ],
    });

    service = TestBed.inject(ThesisWorkEvaluationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('addEvaluationMock', () => {
    it('debe mantener el avance EN_REVISION si faltan evaluadores por calificar', fakeAsync(() => {
      const evaluation: Evaluation = {
        id: 'eval-1',
        advanceId: 'adv-1',
        evaluatorId: 'director-1',
        veredict: stateList.APROBADO,
      } as Evaluation;

      const baseThesis = createMockThesisWork();
      let updatedResult: ThesisWork | undefined;

      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(baseThesis);
      });

      service.addEvaluationMock('thesis-123', evaluation).subscribe();
      tick(800);

      expect(storageMock.updateWork).toHaveBeenCalledWith('thesis-123', expect.any(Function));
      expect(updatedResult?.evaluations).toHaveLength(1);

      const updatedAdvance = updatedResult?.advances?.find(a => a.id === 'adv-1');
      expect(updatedAdvance?.status).toBe(stateList.EN_REVISION);

      expect(eventBusMock.emit).toHaveBeenCalledWith({
        type: AppEventType.THESIS_ADVANCE_EVALUATED,
        targetUserIds: expect.arrayContaining(['student-1', 'director-1', 'codirector-1']),
        payload: {
          thesisId: 'thesis-123',
          thesisWorkId: 'thesis-123',
          veredict: stateList.APROBADO,
          thesisTitle: 'Desarrollo de IA',
        },
      });
    }));

    it('debe cambiar el avance a EVALUADO cuando todos los evaluadores requeridos aprueban', fakeAsync(() => {
      const previousWork = createMockThesisWork({
        evaluations: [
          {
            id: 'eval-1',
            advanceId: 'adv-1',
            evaluatorId: 'director-1',
            veredict: stateList.APROBADO,
          } as Evaluation,
        ],
      });

      const newEvaluation: Evaluation = {
        id: 'eval-2',
        advanceId: 'adv-1',
        evaluatorId: 'codirector-1',
        veredict: stateList.APROBADO,
      } as Evaluation;

      let updatedResult: ThesisWork | undefined;
      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(previousWork);
      });

      service.addEvaluationMock('thesis-123', newEvaluation).subscribe();
      tick(800);

      expect(updatedResult?.evaluations).toHaveLength(2);

      const updatedAdvance = updatedResult?.advances?.find(a => a.id === 'adv-1');
      expect(updatedAdvance?.status).toBe(stateList.EVALUADO);
    }));

    it('debe mantener el avance EN_REVISION si todos evalúan pero al menos uno solicita revisiones', fakeAsync(() => {
      const previousWork = createMockThesisWork({
        evaluations: [
          {
            id: 'eval-1',
            advanceId: 'adv-1',
            evaluatorId: 'director-1',
            veredict: stateList.APROBADO,
          } as Evaluation,
        ],
      });

      const newEvaluation: Evaluation = {
        id: 'eval-2',
        advanceId: 'adv-1',
        evaluatorId: 'codirector-1',
        veredict: stateList.EN_REVISION,
      } as Evaluation;

      let updatedResult: ThesisWork | undefined;
      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(previousWork);
      });

      service.addEvaluationMock('thesis-123', newEvaluation).subscribe();
      tick(800);

      const updatedAdvance = updatedResult?.advances?.find(a => a.id === 'adv-1');
      expect(updatedAdvance?.status).toBe(stateList.EN_REVISION);
    }));

    it('no debe verse afectado si un mismo evaluador envía múltiples evaluaciones para el mismo avance', fakeAsync(() => {
      const previousWork = createMockThesisWork({
        evaluations: [
          {
            id: 'eval-1',
            advanceId: 'adv-1',
            evaluatorId: 'director-1',
            veredict: stateList.APROBADO,
          } as Evaluation,
        ],
      });

      const repeatedEvaluation: Evaluation = {
        id: 'eval-repeated',
        advanceId: 'adv-1',
        evaluatorId: 'director-1',
        veredict: stateList.APROBADO,
      } as Evaluation;

      let updatedResult: ThesisWork | undefined;
      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(previousWork);
      });

      service.addEvaluationMock('thesis-123', repeatedEvaluation).subscribe();
      tick(800);

      const updatedAdvance = updatedResult?.advances?.find(a => a.id === 'adv-1');
      expect(updatedAdvance?.status).toBe(stateList.EN_REVISION);
    }));
  });
});
