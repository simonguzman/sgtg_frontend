// src/app/modules/thesis-work/integration/thesis-work-deadline-expiration.integration.spec.ts
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

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

function buildThesisWork(id: string, overrides: Partial<ThesisWork>, draft: PreliminaryDraft): ThesisWork {
  return {
    thesisWorkId: id, preliminaryDraftId: draft.preliminaryDraftId!, preliminaryDraftData: draft,
    createdDate: new Date(), state: stateList.EN_DESARROLLO,
    advances: [], evaluations: [], finalDeliveries: [], documents: [],
    sustentations: [], pazYSalvos: [], specialRequests: [], isArchived: false,
    ...overrides
  };
}

describe('Integración [Trabajo de Grado]: Vencimiento automático de plazo (verifyDeliveryDeadlinesMock)', () => {
  let thesisStorage: ThesisWorkStorageService;
  let preliminaryDraftStorage: PreliminaryDraftStorageService;
  let proposalStorage: ProposalStorageService;
  let userStorage: UserStorageService;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        // ThesisWorkService NO se registra aquí — se inyecta más tarde,
        // dentro de cada it(), después de sembrar los datos.
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

    // Caso A: DEBE archivarse — vencido, EN_DESARROLLO, sin entrega final.
    const proposalA: Proposal = { id: 'prop-exp-a', title: 'Vencido sin entrega', description: '', modality: Modality.TI, authors: [], director: director1, state: stateList.APROBADO, createdAt: new Date(), documents: [], evaluations: [], isArchived: false };
    const draftA: PreliminaryDraft = { preliminaryDraftId: 'draft-exp-a', proposalId: proposalA.id!, proposalData: proposalA, evaluators: [evaluator], evaluations: [], documents: [], state: stateList.APROBADO, createdData: new Date(), isArchived: false, maximumDeliveryDate: yesterday };
    const thesisA = buildThesisWork('thesis-exp-a', {}, draftA);
    proposalStorage.updateProposals(list => [...list, proposalA]);
    preliminaryDraftStorage.addDraft(draftA);

    // Caso B: NO debe archivarse — plazo aún vigente.
    const proposalB: Proposal = { id: 'prop-exp-b', title: 'Plazo vigente', description: '', modality: Modality.TI, authors: [], director: director2, state: stateList.APROBADO, createdAt: new Date(), documents: [], evaluations: [], isArchived: false };
    const draftB: PreliminaryDraft = { preliminaryDraftId: 'draft-exp-b', proposalId: proposalB.id!, proposalData: proposalB, evaluators: [], evaluations: [], documents: [], state: stateList.APROBADO, createdData: new Date(), isArchived: false, maximumDeliveryDate: nextYear };
    const thesisB = buildThesisWork('thesis-exp-b', {}, draftB);

    // Caso C: NO debe archivarse — vencido, pero YA tiene entrega final.
    const proposalC: Proposal = { id: 'prop-exp-c', title: 'Vencido con entrega ya radicada', description: '', modality: Modality.TI, authors: [], director: director3, state: stateList.APROBADO, createdAt: new Date(), documents: [], evaluations: [], isArchived: false };
    const draftC: PreliminaryDraft = { preliminaryDraftId: 'draft-exp-c', proposalId: proposalC.id!, proposalData: proposalC, evaluators: [], evaluations: [], documents: [], state: stateList.APROBADO, createdData: new Date(), isArchived: false, maximumDeliveryDate: yesterday };
    const existingDelivery: FinalDelivery = {
      id: 'delivery-exp-c', uploadDate: '10 - 10 - 2026',
      monograph: { id: 'mono-c', name: 'Monografía', url: 'data:m', uploadDate: '10 - 10 - 2026', type: DocumentType.MONOGRAFIA, status: stateList.EN_REVISION },
      formatE: { id: 'fe-c', name: 'Formato E', url: 'data:fe', uploadDate: '10 - 10 - 2026', type: DocumentType.FORMATO_E, status: stateList.EN_REVISION },
      status: stateList.EN_REVISION
    };
    const thesisC = buildThesisWork('thesis-exp-c', { finalDeliveries: [existingDelivery] }, draftC);

    thesisStorage['_thesisWorksList'].set([thesisA, thesisB, thesisC]);

    // Recién ahora se instancia ThesisWorkService.
    // Su constructor dispara verifyDeliveryDeadlinesMock() automáticamente.
    TestBed.inject(ThesisWorkService);

    // El tick(2000) es lo único que necesitábamos para que los delay(800) de RxJS terminen de procesarse.
    tick(2000);

    // A: archivado en cascada a los 3 niveles.
    const updatedA = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === 'thesis-exp-a');
    expect(updatedA?.state).toBe(stateList.NO_APROBADO);
    expect(updatedA?.isArchived).toBe(true);
    expect(preliminaryDraftStorage.allPreliminaryDrafts().find(d => d.preliminaryDraftId === 'draft-exp-a')?.isArchived).toBe(true);
    expect(proposalStorage.allProposals().find(p => p.id === 'prop-exp-a')?.isArchived).toBe(true);
    expect(userStorage.getUsersSnapshot().find(u => u.id === 'eval-exp-1')?.roles).not.toContain(UserRoleType.EVALUADOR);

    // B: intacto — el plazo no ha vencido.
    const updatedB = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === 'thesis-exp-b');
    expect(updatedB?.state).toBe(stateList.EN_DESARROLLO);
    expect(updatedB?.isArchived).toBe(false);

    // C: intacto — ya tenía entrega final radicada, aunque venció.
    const updatedC = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === 'thesis-exp-c');
    expect(updatedC?.state).toBe(stateList.EN_DESARROLLO);
    expect(updatedC?.isArchived).toBe(false);
  }));
});
