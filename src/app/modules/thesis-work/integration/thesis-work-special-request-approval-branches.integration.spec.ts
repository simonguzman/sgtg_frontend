// src/app/modules/thesis-work/integration/thesis-work-special-request-approval-branches.integration.spec.ts
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

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Trabajo de Grado]: Ramas de aprobación de solicitudes especiales', () => {
  let thesisService: ThesisWorkService;
  let thesisStorage: ThesisWorkStorageService;
  let userStorage: UserStorageService;

  const thesisId = 'thesis-req-1';
  const directorId = 'dir-req-1';
  const evaluatorId = 'evaluator-req-1';

  function buildBaseThesisWork(requestType: SpecialRequestType, extra: Partial<ThesisWork> = {}): ThesisWork {
    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const evaluator = createMockUser({ id: evaluatorId, firstName: 'Evaluador', roles: [UserRoleType.DOCENTE, UserRoleType.EVALUADOR] });
    userStorage.updateUsersList(() => [director, evaluator]);

    const proposal: Proposal = {
      id: 'prop-req-1', title: 'Tesis con solicitud', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const draft: PreliminaryDraft = {
      preliminaryDraftId: 'draft-req-1', proposalId: proposal.id!, proposalData: proposal,
      evaluators: [evaluator], evaluations: [], documents: [],
      state: stateList.APROBADO, createdData: new Date(), isArchived: false
    };
    const pendingRequest: SpecialRequest = {
      id: 'req-1', directorId, requestType, requestDate: new Date(),
      description: 'Solicitud de prueba', status: stateList.EN_REVISION
    };
    return {
      thesisWorkId: thesisId, preliminaryDraftId: draft.preliminaryDraftId!, preliminaryDraftData: draft,
      createdDate: new Date(), state: stateList.EN_DESARROLLO,
      advances: [], evaluations: [], finalDeliveries: [], documents: [],
      sustentations: [], pazYSalvos: [], specialRequests: [pendingRequest], isArchived: false,
      ...extra
    };
  }

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkService, ThesisWorkStorageService, ThesisWorkSpecialRequestService,
        ThesisWorkAdvanceService, ThesisWorkDeliveryService, ThesisWorkEvaluationService,
        ThesisWorkSustentationService, ThesisWorkApiService,
        PreliminaryDraftStorageService, ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        EventBusService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'consejo-1' }), hasAnyRole: () => true } },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    thesisService = TestBed.inject(ThesisWorkService);
    thesisStorage = TestBed.inject(ThesisWorkStorageService);
    userStorage = TestBed.inject(UserStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(thesisStorage.isHydrated, injector);
  });

  it('CANCELACION: debe archivar el trabajo (con cascada) y retirar el rol de evaluador', fakeAsync(() => {
    const thesisWork = buildBaseThesisWork(SpecialRequestType.CANCELACION);
    thesisStorage['_thesisWorksList'].set([thesisWork]);

    thesisService.evaluateSpecialRequestMock(thesisId, 'req-1', {
      status: stateList.APROBADO, resolutionDetails: 'Cancelación aprobada'
    }).subscribe();
    tick(2000); // Simulamos el paso del tiempo para resolver observables con delay(800)

    const updated = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(updated?.state).toBe(stateList.CANCELADO);
    expect(updated?.isArchived).toBe(true);
    expect(userStorage.getUsersSnapshot().find(u => u.id === evaluatorId)?.roles).not.toContain(UserRoleType.EVALUADOR);
  }));

  it('PRORROGA: debe extender la fecha máxima sin cambiar el estado ni archivar', fakeAsync(() => {
    const thesisWork = buildBaseThesisWork(SpecialRequestType.PRORROGA);
    thesisStorage['_thesisWorksList'].set([thesisWork]);
    const newDeadline = new Date('2027-06-30');

    thesisService.evaluateSpecialRequestMock(thesisId, 'req-1', {
      status: stateList.APROBADO, resolutionDetails: 'Prórroga concedida', grantedDeadline: newDeadline
    }).subscribe();
    tick(2000);

    const updated = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(updated?.state).toBe(stateList.EN_DESARROLLO);
    expect(updated?.isArchived).toBe(false);
    expect(updated?.preliminaryDraftData?.maximumDeliveryDate).toEqual(newDeadline);

    expect(userStorage.getUsersSnapshot().find(u => u.id === evaluatorId)?.roles).toContain(UserRoleType.EVALUADOR);
  }));

  it('NUEVA_SUSTENTACION: debe aplazar la sustentación y propagar el estado al documento Formato_E vinculado', fakeAsync(() => {
    const formatEDoc = { id: 'doc-fe-1', name: 'Formato E', url: 'data:fe', uploadDate: '10 - 10 - 2026', type: DocumentType.FORMATO_E, status: stateList.EN_REVISION };
    const thesisWork = buildBaseThesisWork(SpecialRequestType.NUEVA_SUSTENTACION, {
      documents: [{ ...formatEDoc }],
      sustentations: [{ id: 'sust-1', assignedJurors: [], verdicts: [], formatEDocument: { ...formatEDoc } }]
    });
    thesisStorage['_thesisWorksList'].set([thesisWork]);

    thesisService.evaluateSpecialRequestMock(thesisId, 'req-1', {
      status: stateList.APROBADO, resolutionDetails: 'Se autoriza nueva fecha de sustentación'
    }).subscribe();
    tick(2000);

    const updated = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(updated?.sustentations?.[0].status).toBe(SustentationStatus.APLAZADA);
    expect(updated?.sustentations?.[0].formatEDocument?.status).toBe(stateList.APLAZADO);

    const docCopy = updated?.documents.find(d => d.id === 'doc-fe-1');
    expect(docCopy?.status).toBe(stateList.APLAZADO);
  }));
});
