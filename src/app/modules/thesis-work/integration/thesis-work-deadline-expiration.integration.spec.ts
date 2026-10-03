import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';
import { ThesisWorkService } from '../services/thesis-work.service';
import { ThesisWorkStorageService } from '../services/thesis-work-storage.service';
import { ThesisWorkApiService } from '../services/thesis-work-api.service';
import { ThesisWorkAdvanceService } from '../services/thesis-work-advance.service';
import { ThesisWorkDeliveryService } from '../services/thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from '../services/thesis-work-evaluation.service';
import { ThesisWorkSpecialRequestService } from '../services/thesis-work-special-request.service';
import { ThesisWorkSustentationService } from '../services/thesis-work-sustentation.service';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { FinalDelivery } from '../interfaces/final-delivery.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
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

function buildThesisWork(id: string, overrides: Partial<ThesisWork>, draft: PreliminaryDraft): ThesisWork {
  const thesisPartial: Partial<ThesisWork> = {
    thesisWorkId: id, preliminaryDraftId: draft.preliminaryDraftId, preliminaryDraftData: draft,
    createdDate: new Date(), state: stateList.EN_DESARROLLO,
    advances: [], evaluations: [], finalDeliveries: [], documents: [],
    sustentations: [], pazYSalvos: [], specialRequests: [], isArchived: false,
    ...overrides
  };
  return thesisPartial as ThesisWork;
}

describe('Integración [Trabajo de Grado]: Vencimiento automático de plazo (verifyDeliveryDeadlinesMock)', () => {
  let thesisStorage: ThesisWorkStorageService;
  let preliminaryDraftStorage: PreliminaryDraftStorageService;
  let proposalStorage: ProposalStorageService;
  let userStorage: UserStorageService;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkStorageService, ThesisWorkApiService,
        ThesisWorkAdvanceService, ThesisWorkDeliveryService, ThesisWorkEvaluationService,
        ThesisWorkSpecialRequestService, ThesisWorkSustentationService,
        PreliminaryDraftStorageService, ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        EventBusService,
        { provide: AuthService, useValue: { currentUser: () => null, hasAnyRole: () => false } },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    thesisStorage = TestBed.inject(ThesisWorkStorageService);
    preliminaryDraftStorage = TestBed.inject(PreliminaryDraftStorageService);
    proposalStorage = TestBed.inject(ProposalStorageService);
    userStorage = TestBed.inject(UserStorageService);
    const injector = TestBed.inject(Injector);

    await waitForHydration(thesisStorage.isHydrated, injector);
    await waitForHydration(preliminaryDraftStorage.isHydrated, injector);
    await waitForHydration(proposalStorage.isHydrated, injector);
  });

  it('debe archivar en cascada un trabajo vencido sin entrega final, y dejar intactos los que no aplican', fakeAsync(() => {
    const evaluator = createMockUser({ id: 'eval-exp-1', firstName: 'Evaluador', roles: [UserRoleType.DOCENTE, UserRoleType.EVALUADOR] });
    const director1 = createMockUser({ id: 'dir-exp-1', firstName: 'Director Uno' });
    const director2 = createMockUser({ id: 'dir-exp-2', firstName: 'Director Dos' });
    const director3 = createMockUser({ id: 'dir-exp-3', firstName: 'Director Tres' });
    userStorage.updateUsersList(() => [evaluator, director1, director2, director3]);

    const proposalAPartial: Partial<Proposal> = { id: 'prop-exp-a', title: 'Vencido sin entrega', description: '', modality: Modality.TI, authors: [], director: director1, state: stateList.APROBADO, createdAt: new Date(), documents: [], evaluations: [], isArchived: false };
    const proposalA = proposalAPartial as Proposal;
    const draftAPartial: Partial<PreliminaryDraft> = { preliminaryDraftId: 'draft-exp-a', proposalId: proposalA.id, proposalData: proposalA, evaluators: [evaluator], evaluations: [], documents: [], state: stateList.APROBADO, createdData: new Date(), isArchived: false, maximumDeliveryDate: yesterday };
    const draftA = draftAPartial as PreliminaryDraft;
    const thesisA = buildThesisWork('thesis-exp-a', {}, draftA);

    if ('updateProposals' in proposalStorage) {
      proposalStorage.updateProposals(list => [...list, proposalA]);
    }
    preliminaryDraftStorage.addDraft(draftA);

    const proposalBPartial: Partial<Proposal> = { id: 'prop-exp-b', title: 'Plazo vigente', description: '', modality: Modality.TI, authors: [], director: director2, state: stateList.APROBADO, createdAt: new Date(), documents: [], evaluations: [], isArchived: false };
    const proposalB = proposalBPartial as Proposal;
    const draftBPartial: Partial<PreliminaryDraft> = { preliminaryDraftId: 'draft-exp-b', proposalId: proposalB.id, proposalData: proposalB, evaluators: [], evaluations: [], documents: [], state: stateList.APROBADO, createdData: new Date(), isArchived: false, maximumDeliveryDate: nextYear };
    const draftB = draftBPartial as PreliminaryDraft;
    const thesisB = buildThesisWork('thesis-exp-b', {}, draftB);

    const proposalCPartial: Partial<Proposal> = { id: 'prop-exp-c', title: 'Vencido con entrega', description: '', modality: Modality.TI, authors: [], director: director3, state: stateList.APROBADO, createdAt: new Date(), documents: [], evaluations: [], isArchived: false };
    const proposalC = proposalCPartial as Proposal;
    const draftCPartial: Partial<PreliminaryDraft> = { preliminaryDraftId: 'draft-exp-c', proposalId: proposalC.id, proposalData: proposalC, evaluators: [], evaluations: [], documents: [], state: stateList.APROBADO, createdData: new Date(), isArchived: false, maximumDeliveryDate: yesterday };
    const draftC = draftCPartial as PreliminaryDraft;

    const existingDeliveryPartial: Partial<FinalDelivery> = {
      id: 'delivery-exp-c', uploadDate: '10 - 10 - 2026',
      monograph: { id: 'mono-c', name: 'Monografía', url: 'data:m', uploadDate: '10 - 10 - 2026', type: DocumentType.MONOGRAFIA, status: stateList.EN_REVISION },
      formatE: { id: 'fe-c', name: 'Formato E', url: 'data:fe', uploadDate: '10 - 10 - 2026', type: DocumentType.FORMATO_E, status: stateList.EN_REVISION },
      status: stateList.EN_REVISION
    };
    const existingDelivery = existingDeliveryPartial as FinalDelivery;
    const thesisC = buildThesisWork('thesis-exp-c', { finalDeliveries: [existingDelivery] }, draftC);

    if ('updateThesisWorks' in thesisStorage) {
      (thesisStorage as unknown as { updateThesisWorks: (cb: () => ThesisWork[]) => void }).updateThesisWorks(() => [thesisA, thesisB, thesisC]);
    } else {
      const storageAsRecord = thesisStorage as Record<string, any>;
      if (storageAsRecord['_thesisWorksList']) {
        storageAsRecord['_thesisWorksList'].set([thesisA, thesisB, thesisC]);
      }
    }

    TestBed.inject(ThesisWorkService);

    tick(2000);

    const updatedA = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === 'thesis-exp-a');
    expect(updatedA?.state).toBe(stateList.NO_APROBADO);
    expect(updatedA?.isArchived).toBe(true);
    expect(preliminaryDraftStorage.allPreliminaryDrafts().find(d => d.preliminaryDraftId === 'draft-exp-a')?.isArchived).toBe(true);
    expect(proposalStorage.allProposals().find(p => p.id === 'prop-exp-a')?.isArchived).toBe(true);
    expect(userStorage.getUsersSnapshot().find(u => u.id === 'eval-exp-1')?.roles).not.toContain(UserRoleType.EVALUADOR);

    const updatedB = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === 'thesis-exp-b');
    expect(updatedB?.state).toBe(stateList.EN_DESARROLLO);
    expect(updatedB?.isArchived).toBe(false);

    const updatedC = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === 'thesis-exp-c');
    expect(updatedC?.state).toBe(stateList.EN_DESARROLLO);
    expect(updatedC?.isArchived).toBe(false);
  }));
});
