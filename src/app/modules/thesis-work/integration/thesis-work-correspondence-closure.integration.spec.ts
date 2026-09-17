// src/app/modules/thesis-work/integration/thesis-work-correspondence-closure.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { RegisterCorrespondenceFacadeService } from '../pages/register-correspondence-page/services/register-correspondence-facade.service';
import { ThesisWorkService } from '../services/thesis-work.service';
import { ThesisWorkStorageService } from '../services/thesis-work-storage.service';
import { ThesisWorkAdvanceService } from '../services/thesis-work-advance.service';
import { ThesisWorkDeliveryService } from '../services/thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from '../services/thesis-work-evaluation.service';
import { ThesisWorkSpecialRequestService } from '../services/thesis-work-special-request.service';
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

describe('Integración [Trabajo de Grado]: Correspondencia final — cierre completo del proceso', () => {
  let facade: RegisterCorrespondenceFacadeService;
  let thesisStorage: ThesisWorkStorageService;
  let preliminaryDraftStorage: PreliminaryDraftStorageService;
  let proposalStorage: ProposalStorageService;
  let userStorage: UserStorageService;

  const thesisId = 'thesis-corr-1';
  const proposalId = 'prop-corr-1';
  const draftId = 'draft-corr-1';
  const evaluatorId = 'evaluator-corr-1';
  const jurorId = 'juror-corr-1';
  const directorId = 'dir-corr-1';

  beforeAll(() => {
    // Interceptamos la API nativa de lectura de archivos
    Object.defineProperty(window, 'FileReader', {
      writable: true,
      value: class {
        onload: Function | null = null;
        onerror: Function | null = null;
        result: string | null = null;

        readAsDataURL(file: File) {
          setTimeout(() => {
            if (!file || file.size === 0) {
              if (this.onerror) this.onerror({ target: { error: new Error('Invalid') } });
            } else {
              this.result = `data:application/pdf;base64,mock_${file.name}`;
              if (this.onload) this.onload({ target: this });
            }
          }, 10);
        }
      }
    });
  });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrespondenceFacadeService,
        ThesisWorkService, ThesisWorkStorageService, ThesisWorkAdvanceService,
        ThesisWorkDeliveryService, ThesisWorkEvaluationService,
        ThesisWorkSpecialRequestService, ThesisWorkSustentationService, ThesisWorkApiService,
        PreliminaryDraftStorageService, ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        EventBusService,
        { provide: AuthService, useValue: { currentUser: () => null, hasAnyRole: () => false } },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    facade = TestBed.inject(RegisterCorrespondenceFacadeService);
    thesisStorage = TestBed.inject(ThesisWorkStorageService);
    preliminaryDraftStorage = TestBed.inject(PreliminaryDraftStorageService);
    proposalStorage = TestBed.inject(ProposalStorageService);
    userStorage = TestBed.inject(UserStorageService);
    const injector = TestBed.inject(Injector);

    await waitForHydration(thesisStorage.isHydrated, injector);
    await waitForHydration(preliminaryDraftStorage.isHydrated, injector);
    await waitForHydration(proposalStorage.isHydrated, injector);

    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const evaluator = createMockUser({ id: evaluatorId, firstName: 'Evaluador', roles: [UserRoleType.DOCENTE, UserRoleType.EVALUADOR] });
    const juror = createMockUser({ id: jurorId, firstName: 'Jurado', roles: [UserRoleType.DOCENTE, UserRoleType.JURADO] });
    userStorage.updateUsersList(() => [director, evaluator, juror]);

    const proposal: Proposal = {
      id: proposalId, title: 'Tesis a cerrar', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    proposalStorage.updateProposals(() => [proposal]);

    const draft: PreliminaryDraft = {
      preliminaryDraftId: draftId, proposalId, proposalData: proposal,
      evaluators: [evaluator], evaluations: [], documents: [],
      state: stateList.APROBADO, createdData: new Date(), isArchived: false
    };
    preliminaryDraftStorage.addDraft(draft);

    const pendingDelivery: FinalDelivery = {
      id: 'delivery-1',
      uploadDate: '10 - 10 - 2026',
      monograph: { id: 'doc-mono', name: 'Monografía', url: 'data:mono', uploadDate: '10 - 10 - 2026', type: DocumentType.MONOGRAFIA, status: stateList.EN_REVISION },
      formatE: { id: 'doc-fe', name: 'Formato E', url: 'data:fe', uploadDate: '10 - 10 - 2026', type: DocumentType.FORMATO_E, status: stateList.EN_REVISION },
      status: stateList.EN_REVISION
    };

    const thesisWork: ThesisWork = {
      thesisWorkId: thesisId, preliminaryDraftId: draftId, preliminaryDraftData: draft,
      createdDate: new Date(), state: stateList.EN_DESARROLLO,
      advances: [], evaluations: [], finalDeliveries: [pendingDelivery], documents: [],
      sustentations: [{ id: 'sust-corr-1', assignedJurors: [juror], verdicts: [] }],
      pazYSalvos: [], specialRequests: [], isArchived: false
    };
    thesisStorage['_thesisWorksList'].set([thesisWork]);
  });

  it('debe leer el Formato H real, cerrar la entrega final, archivar los 3 niveles y retirar evaluador+jurado', fakeAsync(() => {
    const formatoHFile = new File(['contenido oficial'], 'resolucion-final.pdf', { type: 'application/pdf' });

    let successCalled = false;
    facade.processCorrespondence(thesisId, formatoHFile, () => { successCalled = true; }, () => {});
    tick(1500); // Reemplaza flush() para garantizar que la microtarea asíncrona fluya

    expect(successCalled).toBe(true);
    const updatedThesis = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);

    const formatoH = updatedThesis?.documents.find(d => d.type === DocumentType.FORMATO_H);
    expect(formatoH?.url).toMatch(/^data:/);
    expect(formatoH?.name).toBe('resolucion-final');

    const delivery = updatedThesis?.finalDeliveries?.[0];
    expect(delivery?.status).toBe(stateList.APROBADO);
    expect(delivery?.monograph.status).toBe(stateList.APROBADO);
    expect(delivery?.formatE.status).toBe(stateList.APROBADO);

    expect(updatedThesis?.isArchived).toBe(true);

    expect(preliminaryDraftStorage.allPreliminaryDrafts().find(d => d.preliminaryDraftId === draftId)?.isArchived).toBe(true);
    expect(proposalStorage.allProposals().find(p => p.id === proposalId)?.isArchived).toBe(true);

    const users = userStorage.getUsersSnapshot();
    expect(users.find(u => u.id === evaluatorId)?.roles).not.toContain(UserRoleType.EVALUADOR);
    expect(users.find(u => u.id === jurorId)?.roles).not.toContain(UserRoleType.JURADO);
    expect(users.find(u => u.id === evaluatorId)?.roles).toContain(UserRoleType.DOCENTE);
  }));

  it('debe notificar el error y no mutar nada si la lectura del archivo falla', fakeAsync(() => {
    // Archivo inválido (size 0) para disparar el this.onerror en el mock
    const brokenFile = { size: 0 } as File;

    let errorCalled = false;
    facade.processCorrespondence(thesisId, brokenFile, () => {}, () => { errorCalled = true; });
    tick(1500);

    expect(errorCalled).toBe(true);
    const untouchedThesis = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(untouchedThesis?.isArchived).toBe(false);
    expect(untouchedThesis?.documents).toHaveLength(0);
  }));
});
