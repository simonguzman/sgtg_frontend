import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ThesisWorkApiService } from './thesis-work-api.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';

// Extraemos los tipos anidados exactos para los mocks parciales
type PreliminaryDraftData = NonNullable<ThesisWork['preliminaryDraftData']>;
type ProposalData = NonNullable<PreliminaryDraftData['proposalData']>;

describe('ThesisWorkApiService', () => {
  let service: ThesisWorkApiService;

  // Mocks con tipado explícito
  let storageMock: {
    getById: jest.Mock;
    allThesisWorks: jest.Mock;
    updateWork: jest.Mock;
  };
  let userServiceMock: {
    removeRolesFromUsersMock: jest.Mock;
  };
  let eventBusMock: {
    emit: jest.Mock;
  };

  // 1. Mock de Evaluador usando el patrón estricto
  const mockEvaluator = {
    id: 'eval-1',
    firstName: 'Carlos',
    lastName: 'Pérez',
    email: 'carlos@unicauca.edu.co',
  } as Partial<User> as User;

  // 2. Mock de la Propuesta (Nivel 3)
  const mockProposalData = {
    title: 'Desarrollo de Software Educativo',
    authors: [{ id: 'student-1' } as Partial<User> as User],
    director: { id: 'director-1' } as Partial<User> as User,
    isArchived: false,
  } as Partial<ProposalData> as ProposalData;

  // 3. Mock del Anteproyecto (Nivel 2)
  const mockPreliminaryDraftData = {
    maximumDeliveryDate: '2020-01-01T00:00:00Z', // Fecha pasada
    isArchived: false,
    evaluators: [mockEvaluator],
    proposalData: mockProposalData,
  } as Partial<PreliminaryDraftData> as PreliminaryDraftData;

  // 4. Mock del Trabajo de Grado (Nivel 1)
  const mockExpiredThesisWork = {
    thesisWorkId: 'thesis-expired-1',
    state: stateList.EN_DESARROLLO,
    isArchived: false,
    finalDeliveries: [],
    preliminaryDraftData: mockPreliminaryDraftData,
  } as Partial<ThesisWork> as ThesisWork;

  beforeEach(() => {
    storageMock = {
      getById: jest.fn(),
      allThesisWorks: jest.fn(),
      updateWork: jest.fn(),
    };

    userServiceMock = {
      removeRolesFromUsersMock: jest.fn().mockReturnValue(of(undefined)),
    };

    eventBusMock = {
      emit: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkApiService,
        { provide: ThesisWorkStorageService, useValue: storageMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: EventBusService, useValue: eventBusMock },
      ],
    });

    service = TestBed.inject(ThesisWorkApiService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('getThesisWorkByIdMock', () => {
    it('debe obtener el trabajo de grado desde el storage por su ID', () => {
      storageMock.getById.mockReturnValue(mockExpiredThesisWork);
      const result = service.getThesisWorkByIdMock('thesis-expired-1');

      expect(storageMock.getById).toHaveBeenCalledWith('thesis-expired-1');
      expect(result).toEqual(mockExpiredThesisWork);
    });
  });

  describe('verifyDeliveryDeadlinesMock', () => {
    it('debe ignorar los trabajos que NO estén en estado EN_DESARROLLO', fakeAsync(() => {
      const nonActiveWork = {
        ...mockExpiredThesisWork,
        state: stateList.APROBADO,
      } as Partial<ThesisWork> as ThesisWork; // Evitando 'unknown'

      storageMock.allThesisWorks.mockReturnValue([nonActiveWork]);

      service.verifyDeliveryDeadlinesMock().subscribe();
      tick(1000);

      expect(storageMock.updateWork).not.toHaveBeenCalled();
      expect(eventBusMock.emit).not.toHaveBeenCalled();
    }));

    it('debe ignorar los trabajos cuya fecha límite aún no haya vencido', fakeAsync(() => {
      const futureWork = {
        ...mockExpiredThesisWork,
        preliminaryDraftData: {
          ...mockExpiredThesisWork.preliminaryDraftData,
          maximumDeliveryDate: '2099-12-31T23:59:59Z', // Fecha futura
        },
      } as Partial<ThesisWork> as ThesisWork;

      storageMock.allThesisWorks.mockReturnValue([futureWork]);

      service.verifyDeliveryDeadlinesMock().subscribe();
      tick(1000);

      expect(storageMock.updateWork).not.toHaveBeenCalled();
      expect(eventBusMock.emit).not.toHaveBeenCalled();
    }));

    it('debe ignorar los trabajos que ya cuentan con entregas finales realizadas', fakeAsync(() => {
      const workWithFinalDelivery = {
        ...mockExpiredThesisWork,
        finalDeliveries: [{ id: 'delivery-1' }],
      } as Partial<ThesisWork> as ThesisWork; // Evitando 'unknown'

      storageMock.allThesisWorks.mockReturnValue([workWithFinalDelivery]);

      service.verifyDeliveryDeadlinesMock().subscribe();
      tick(1000);

      expect(storageMock.updateWork).not.toHaveBeenCalled();
      expect(eventBusMock.emit).not.toHaveBeenCalled();
    }));

    it('debe archivar como NO APROBADO, remover rol de evaluadores y emitir evento si la fecha limite venció', fakeAsync(() => {
      storageMock.allThesisWorks.mockReturnValue([mockExpiredThesisWork]);

      let updatedResult: ThesisWork | undefined;
      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(mockExpiredThesisWork);
      });

      service.verifyDeliveryDeadlinesMock().subscribe();
      tick(1000);

      expect(storageMock.updateWork).toHaveBeenCalledWith('thesis-expired-1', expect.any(Function));

      // Verificación de la inmutabilidad y los estados archivados
      expect(updatedResult?.state).toBe(stateList.NO_APROBADO);
      expect(updatedResult?.isArchived).toBe(true);
      expect(updatedResult?.preliminaryDraftData?.isArchived).toBe(true);
      expect(updatedResult?.preliminaryDraftData?.proposalData?.isArchived).toBe(true);

      // Verificación de la revocación del rol de evaluador
      expect(userServiceMock.removeRolesFromUsersMock).toHaveBeenCalledWith(
        ['eval-1'],
        [UserRoleType.EVALUADOR]
      );

      // Verificación del evento emitido en el bus
      expect(eventBusMock.emit).toHaveBeenCalledWith({
        type: AppEventType.THESIS_DEADLINE_EXPIRED,
        targetUserIds: expect.arrayContaining(['student-1', 'director-1']),
        payload: {
          thesisId: 'thesis-expired-1',
          thesisTitle: 'Desarrollo de Software Educativo',
          message:
            'El plazo máximo de entrega final ha vencido. El trabajo de grado junto con su anteproyecto y propuesta han sido archivados como NO APROBADOS.',
        },
      });
    }));
  });

  describe('reactivateThesisWorkMock', () => {
    it('debe actualizar el estado a EN_DESARROLLO y emitir el evento THESIS_REACTIVATED', fakeAsync(() => {
      let updatedResult: ThesisWork | undefined;
      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedResult = updateFn(mockExpiredThesisWork);
      });

      service.reactivateThesisWorkMock('thesis-expired-1').subscribe();
      tick(500);

      expect(storageMock.updateWork).toHaveBeenCalledWith('thesis-expired-1', expect.any(Function));
      expect(updatedResult?.state).toBe(stateList.EN_DESARROLLO);
      expect(updatedResult?.isArchived).toBe(false);

      expect(eventBusMock.emit).toHaveBeenCalledWith({
        type: AppEventType.THESIS_REACTIVATED,
        targetUserIds: expect.arrayContaining(['student-1', 'director-1']),
        payload: {
          thesisId: 'thesis-expired-1',
          thesisTitle: 'Desarrollo de Software Educativo',
        },
      });
    }));
  });
});
