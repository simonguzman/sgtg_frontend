import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { ThesisWorkSpecialRequestService } from './thesis-work-special-request.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { UserService } from '../../users/services/user.service';
import { AuthService } from '../../../core/services/auth/auth.service';

import { SpecialRequestType } from '../enums/special-request-type.enum';
import { SustentationStatus } from '../enums/sustentation-status.enum';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { SpecialRequest } from '../interfaces/special-request.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';

// 1. Tipado estricto para las dependencias mockeadas
type MockThesisWorkStorageService = {
  updateWork: jest.Mock<void, [string, (w: ThesisWork) => ThesisWork]>;
};

type MockEventBusService = {
  emit: jest.Mock<void, [object]>;
};

type MockUserService = {
  users: jest.Mock<User[], []>;
  removeRolesFromUsersMock: jest.Mock<Observable<void>, [string[], UserRoleType[]]>;
};

type MockAuthService = {
  currentUser: jest.Mock<User | null, []>;
};

// 2. Extracción de tipos anidados del dominio
type PreliminaryDraftType = NonNullable<ThesisWork['preliminaryDraftData']>;
type ProposalType = NonNullable<PreliminaryDraftType['proposalData']>;
type SustentationType = NonNullable<ThesisWork['sustentations']>[number];

// 3. Helper para Mocks: Evita errores de intersección estricta de TypeScript
const asMock = <T>(data: Partial<T>): T => data as T;

// Mock de la función helper externa
jest.mock('../helpers/thesis-participants.helper', () => ({
  collectParticipantIds: jest.fn().mockReturnValue(['participant-1', 'participant-2'])
}));

describe('ThesisWorkSpecialRequestService', () => {
  let service: ThesisWorkSpecialRequestService;
  let storageMock: MockThesisWorkStorageService;
  let eventBusMock: MockEventBusService;
  let userServiceMock: MockUserService;
  let authServiceMock: MockAuthService;

  const buildUser = (id: string, roles: UserRoleType[] = []): User => asMock<User>({ id, roles });

  const createMockThesisWork = (overrides?: Partial<ThesisWork>): ThesisWork => asMock<ThesisWork>({
    thesisWorkId: 'thesis-1',
    state: stateList.EN_DESARROLLO,
    isArchived: false,
    documents: [],
    sustentations: [],
    specialRequests: [],
    preliminaryDraftData: asMock<PreliminaryDraftType>({
      evaluators: [],
      proposalData: asMock<ProposalType>({
        title: 'Tesis de Prueba',
        director: buildUser('dir-1')
      })
    }),
    ...overrides
  });

  beforeEach(() => {
    storageMock = {
      updateWork: jest.fn()
    };

    eventBusMock = {
      emit: jest.fn()
    };

    userServiceMock = {
      users: jest.fn().mockReturnValue([buildUser('consejo-1', [UserRoleType.CONSEJO])]),
      removeRolesFromUsersMock: jest.fn().mockReturnValue(of(undefined))
    };

    authServiceMock = {
      currentUser: jest.fn().mockReturnValue(buildUser('auth-user-1'))
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkSpecialRequestService,
        { provide: ThesisWorkStorageService, useValue: storageMock },
        { provide: EventBusService, useValue: eventBusMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });

    service = TestBed.inject(ThesisWorkSpecialRequestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('createSpecialRequestMock', () => {
    it('debería agregar una nueva solicitud especial y emitir evento a participantes y consejo', fakeAsync(() => {
      const payload = {
        requestType: SpecialRequestType.PRORROGA,
        comments: 'Necesito más tiempo',
        thesisId: 'thesis-1'
      };

      const baseThesis = createMockThesisWork();
      let updatedThesisWork: ThesisWork | undefined;

      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedThesisWork = updateFn(baseThesis);
      });

      service.createSpecialRequestMock(payload).subscribe();
      tick(800);

      expect(storageMock.updateWork).toHaveBeenCalledWith('thesis-1', expect.any(Function));
      expect(updatedThesisWork?.specialRequests).toHaveLength(1);
      expect(updatedThesisWork?.specialRequests?.[0]).toEqual(expect.objectContaining({
        id: expect.any(String),
        directorId: 'dir-1',
        requestType: SpecialRequestType.PRORROGA,
        description: 'Necesito más tiempo',
        status: stateList.EN_REVISION
      }));

      expect(eventBusMock.emit).toHaveBeenCalledWith({
        type: AppEventType.SPECIAL_REQUEST_CREATED,
        targetUserIds: ['participant-1', 'participant-2', 'consejo-1'],
        payload: {
          thesisId: 'thesis-1',
          thesisWorkId: 'thesis-1',
          type: SpecialRequestType.PRORROGA,
          thesisTitle: 'Tesis de Prueba'
        }
      });
    }));
  });

  describe('evaluateSpecialRequestMock', () => {
    let baseThesisWork: ThesisWork;

    beforeEach(() => {
      baseThesisWork = createMockThesisWork({
        preliminaryDraftData: asMock<PreliminaryDraftType>({
          evaluators: [buildUser('eval-1', [UserRoleType.EVALUADOR])],
          proposalData: asMock<ProposalType>({ title: 'Tesis de Prueba' })
        }),
        specialRequests: [
          asMock<SpecialRequest>({
            id: 'req-1',
            requestType: SpecialRequestType.CANCELACION,
            status: stateList.EN_REVISION
          })
        ],
        sustentations: [
          asMock<SustentationType>({
            id: 'sus-1',
            status: SustentationStatus.PROGRAMADA,
            formatEDocument: asMock<FileDocument>({ id: 'doc-1', status: stateList.EN_REVISION })
          })
        ],
        documents: [
          asMock<FileDocument>({ id: 'doc-1', status: stateList.EN_REVISION })
        ]
      });
    });

    it('debería procesar APROBADO para CANCELACION de manera reactiva y limpiar evaluadores', fakeAsync(() => {
      let updatedThesisWork: ThesisWork | undefined;

      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedThesisWork = updateFn(baseThesisWork);
      });

      const payload = {
        status: stateList.APROBADO as stateList.APROBADO | stateList.NO_APROBADO,
        resolutionDetails: 'Aprobado en sesión'
      };

      service.evaluateSpecialRequestMock('thesis-1', 'req-1', payload).subscribe();

      expect(storageMock.updateWork).not.toHaveBeenCalled();

      tick(900);

      expect(updatedThesisWork?.state).toBe(stateList.CANCELADO);
      expect(updatedThesisWork?.isArchived).toBe(true);

      const updatedReq = updatedThesisWork?.specialRequests?.find(r => r.id === 'req-1');
      expect(updatedReq?.status).toBe(stateList.APROBADO);
      expect(updatedReq?.evaluatorId).toBe('auth-user-1');

      expect(userServiceMock.removeRolesFromUsersMock).toHaveBeenCalledWith(['eval-1'], [UserRoleType.EVALUADOR]);
      expect(eventBusMock.emit).toHaveBeenCalledTimes(1);
    }));

    it('debería procesar APROBADO para NUEVA_SUSTENTACION modificando documentos y sustentaciones', fakeAsync(() => {
      if (baseThesisWork.specialRequests) {
        baseThesisWork.specialRequests[0].requestType = SpecialRequestType.NUEVA_SUSTENTACION;
      }

      let updatedThesisWork: ThesisWork | undefined;
      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedThesisWork = updateFn(baseThesisWork);
      });

      service.evaluateSpecialRequestMock('thesis-1', 'req-1', {
        status: stateList.APROBADO,
        resolutionDetails: 'Aprobado nueva sustentación'
      }).subscribe();

      tick(900);

      const pendingSus = updatedThesisWork?.sustentations?.[0];
      expect(pendingSus?.status).toBe(SustentationStatus.APLAZADA);
      expect(pendingSus?.formatEDocument?.status).toBe(stateList.APLAZADO);

      const updatedDoc = updatedThesisWork?.documents?.find(d => d.id === 'doc-1');
      expect(updatedDoc?.status).toBe(stateList.APLAZADO);
    }));

    it('debería procesar APROBADO para SUSPENSION con fecha límite', fakeAsync(() => {
      if (baseThesisWork.specialRequests) {
        baseThesisWork.specialRequests[0].requestType = SpecialRequestType.SUSPENSION;
      }

      let updatedThesisWork: ThesisWork | undefined;
      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedThesisWork = updateFn(baseThesisWork);
      });

      const deadline = new Date('2027-01-01');
      service.evaluateSpecialRequestMock('thesis-1', 'req-1', {
        status: stateList.APROBADO,
        resolutionDetails: 'Suspendido temporalmente',
        grantedDeadline: deadline
      }).subscribe();

      tick(900);

      expect(updatedThesisWork?.state).toBe(stateList.SUSPENDIDO);
      expect(updatedThesisWork?.preliminaryDraftData?.maximumDeliveryDate).toBe(deadline);
    }));

    it('debería procesar NO_APROBADO sin mutar el estado global de la tesis', fakeAsync(() => {
      let updatedThesisWork: ThesisWork | undefined;
      storageMock.updateWork.mockImplementation((id: string, updateFn: (w: ThesisWork) => ThesisWork) => {
        updatedThesisWork = updateFn(baseThesisWork);
      });

      service.evaluateSpecialRequestMock('thesis-1', 'req-1', {
        status: stateList.NO_APROBADO,
        resolutionDetails: 'No hay justificación suficiente'
      }).subscribe();

      tick(900);

      expect(updatedThesisWork?.state).toBe(stateList.EN_DESARROLLO);
      expect(updatedThesisWork?.isArchived).toBe(false);

      const updatedReq = updatedThesisWork?.specialRequests?.find(r => r.id === 'req-1');
      expect(updatedReq?.status).toBe(stateList.NO_APROBADO);

      expect(userServiceMock.removeRolesFromUsersMock).not.toHaveBeenCalled();
    }));
  });
});
