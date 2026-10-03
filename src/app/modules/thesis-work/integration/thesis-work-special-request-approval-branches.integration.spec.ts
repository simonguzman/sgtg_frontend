import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';
import { ThesisWorkService } from '../services/thesis-work.service';
import { ThesisWorkStorageService } from '../services/thesis-work-storage.service';
import { ThesisWorkSpecialRequestService } from '../services/thesis-work-special-request.service';
import { ThesisWorkAdvanceService } from '../services/thesis-work-advance.service';
import { ThesisWorkDeliveryService } from '../services/thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from '../services/thesis-work-evaluation.service';
import { ThesisWorkSustentationService } from '../services/thesis-work-sustentation.service';
import { ThesisWorkApiService } from '../services/thesis-work-api.service';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SpecialRequest } from '../interfaces/special-request.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { SustentationStatus } from '../enums/sustentation-status.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);

describe('Integración [Trabajo de Grado]: Ramas de aprobación de solicitudes especiales', () => {
  let thesisService: ThesisWorkService;
  let thesisStorage: ThesisWorkStorageService;
  let userStorage: UserStorageService;

  const thesisId = 'thesis-req-1';
  const directorId = 'dir-req-1';
  const evaluatorId = 'evaluator-req-1';

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  function buildBaseThesisWork(requestType: SpecialRequestType, extra: Partial<ThesisWork> = {}): ThesisWork {
    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const evaluator = createMockUser({ id: evaluatorId, firstName: 'Evaluador', roles: [UserRoleType.DOCENTE, UserRoleType.EVALUADOR] });
    userStorage.updateUsersList(() => [director, evaluator]);

    const proposalPartial: Partial<Proposal> = {
      id: 'prop-req-1', title: 'Tesis con solicitud', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const proposal = proposalPartial as Proposal;

    const draftPartial: Partial<PreliminaryDraft> = {
      preliminaryDraftId: 'draft-req-1', proposalId: proposal.id, proposalData: proposal,
      evaluators: [evaluator], evaluations: [], documents: [],
      state: stateList.APROBADO, createdData: new Date(), isArchived: false
    };
    const draft = draftPartial as PreliminaryDraft;

    const pendingRequestPartial: Partial<SpecialRequest> = {
      id: 'req-1', directorId, requestType, requestDate: new Date(),
      description: 'Solicitud de prueba', status: stateList.EN_REVISION
    };
    const pendingRequest = pendingRequestPartial as SpecialRequest;

    const thesisPartial: Partial<ThesisWork> = {
      thesisWorkId: thesisId, preliminaryDraftId: draft.preliminaryDraftId, preliminaryDraftData: draft,
      createdDate: new Date(), state: stateList.EN_DESARROLLO,
      advances: [], evaluations: [], finalDeliveries: [], documents: [],
      sustentations: [], pazYSalvos: [], specialRequests: [pendingRequest], isArchived: false,
      ...extra
    };
    return thesisPartial as ThesisWork;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkService, ThesisWorkStorageService, ThesisWorkSpecialRequestService,
        ThesisWorkAdvanceService, ThesisWorkDeliveryService, ThesisWorkEvaluationService,
        ThesisWorkSustentationService, ThesisWorkApiService,
        PreliminaryDraftStorageService, ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        EventBusService,
        { provide: AuthService, useValue: { currentUser: () => createMockUser({ id: 'consejo-1' }), hasAnyRole: () => true } },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    thesisService = TestBed.inject(ThesisWorkService);
    thesisStorage = TestBed.inject(ThesisWorkStorageService);
    userStorage = TestBed.inject(UserStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(thesisStorage.isHydrated, injector);
  });

  function seedThesisWork(thesisWork: ThesisWork) {
    if ('updateThesisWorks' in thesisStorage) {
      (thesisStorage as unknown as { updateThesisWorks: (cb: () => ThesisWork[]) => void }).updateThesisWorks(() => [thesisWork]);
    } else {
      const storageAsRecord = thesisStorage as Record<string, any>;
      if (storageAsRecord['_thesisWorksList']) {
        storageAsRecord['_thesisWorksList'].set([thesisWork]);
      }
    }
  }

  it('CANCELACION: debe archivar el trabajo (con cascada) y retirar el rol de evaluador', fakeAsync(() => {
    const thesisWork = buildBaseThesisWork(SpecialRequestType.CANCELACION);
    seedThesisWork(thesisWork);

    thesisService.evaluateSpecialRequestMock(thesisId, 'req-1', {
      status: stateList.APROBADO, resolutionDetails: 'Cancelación aprobada'
    }).subscribe({
      error: err => { fail('Fallo inesperado al evaluar CANCELACION: ' + err); }
    });

    tick(2000);

    const updated = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(updated?.state).toBe(stateList.CANCELADO);
    expect(updated?.isArchived).toBe(true);
    expect(userStorage.getUsersSnapshot().find(u => u.id === evaluatorId)?.roles).not.toContain(UserRoleType.EVALUADOR);
  }));

  it('PRORROGA: debe extender la fecha máxima sin cambiar el estado ni archivar', fakeAsync(() => {
    const thesisWork = buildBaseThesisWork(SpecialRequestType.PRORROGA);
    seedThesisWork(thesisWork);
    const newDeadline = new Date('2027-06-30');

    thesisService.evaluateSpecialRequestMock(thesisId, 'req-1', {
      status: stateList.APROBADO, resolutionDetails: 'Prórroga concedida', grantedDeadline: newDeadline
    }).subscribe({
      error: err => { fail('Fallo inesperado al evaluar PRORROGA: ' + err); }
    });

    tick(2000);

    const updated = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(updated?.state).toBe(stateList.EN_DESARROLLO);
    expect(updated?.isArchived).toBe(false);
    expect(updated?.preliminaryDraftData?.maximumDeliveryDate).toEqual(newDeadline);

    expect(userStorage.getUsersSnapshot().find(u => u.id === evaluatorId)?.roles).toContain(UserRoleType.EVALUADOR);
  }));

  it('NUEVA_SUSTENTACION: debe aplazar la sustentación y propagar el estado al documento Formato_E vinculado', fakeAsync(() => {
    type ExactDocumentType = NonNullable<ThesisWork['documents']>[number];

    const formatEDocPartial: Partial<ExactDocumentType> = {
      id: 'doc-fe-1',
      name: 'Formato E',
      url: 'data:fe',
      uploadDate: '10 - 10 - 2026',
      type: DocumentType.FORMATO_E,
      status: stateList.EN_REVISION
    };
    const formatEDoc = formatEDocPartial as ExactDocumentType;

    const thesisWork = buildBaseThesisWork(SpecialRequestType.NUEVA_SUSTENTACION, {
      documents: [formatEDoc],
      sustentations: [{ id: 'sust-1', assignedJurors: [], verdicts: [], formatEDocument: formatEDoc }]
    });
    seedThesisWork(thesisWork);

    thesisService.evaluateSpecialRequestMock(thesisId, 'req-1', {
      status: stateList.APROBADO, resolutionDetails: 'Se autoriza nueva fecha de sustentación'
    }).subscribe({
      error: err => { fail('Fallo inesperado al evaluar NUEVA_SUSTENTACION: ' + err); }
    });

    tick(2000);

    const updated = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(updated?.sustentations?.[0].status).toBe(SustentationStatus.APLAZADA);
    expect(updated?.sustentations?.[0].formatEDocument?.status).toBe(stateList.APLAZADO);

    const docCopy = updated?.documents.find(d => d.id === 'doc-fe-1');
    expect(docCopy?.status).toBe(stateList.APLAZADO);
  }));
});
