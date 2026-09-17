// src/app/modules/thesis-work/integration/thesis-work-paz-y-salvo-rejection.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { provideHttpClient } from '@angular/common/http'; // <-- Importación agregada
import { provideHttpClientTesting } from '@angular/common/http/testing'; // <-- Importación agregada
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { RegisterPazYSalvoFacadeService } from '../pages/register-paz-y-salvo-page/services/register-paz-y-salvo-facade.service';
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
import { FileDownloadService } from '../../../core/services/filedownload/file-download.service';

import { ThesisWork } from '../interfaces/thesis-work.interface';
import { FinalDelivery } from '../interfaces/final-delivery.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
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

describe('Integración [Trabajo de Grado]: Rechazo de Paz y Salvo — cascada sobre la entrega final', () => {
  let facade: RegisterPazYSalvoFacadeService;
  let thesisStorage: ThesisWorkStorageService;

  const thesisId = 'thesis-pys-1';
  const directorId = 'dir-pys-1';

  function seedThesisWork(deliveries: FinalDelivery[]): ThesisWork {
    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const proposal: Proposal = {
      id: 'prop-pys-1', title: 'Tesis Paz y Salvo', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const draft: PreliminaryDraft = {
      preliminaryDraftId: 'draft-pys-1', proposalId: proposal.id!, proposalData: proposal,
      evaluators: [], evaluations: [], documents: [],
      state: stateList.APROBADO, createdData: new Date(), isArchived: false
    };
    return {
      thesisWorkId: thesisId, preliminaryDraftId: draft.preliminaryDraftId!, preliminaryDraftData: draft,
      createdDate: new Date(), state: stateList.EN_DESARROLLO,
      advances: [], evaluations: [], finalDeliveries: deliveries, documents: [],
      sustentations: [], pazYSalvos: [], specialRequests: [], isArchived: false
    };
  }

  function buildDelivery(id: string): FinalDelivery {
    return {
      id, uploadDate: '10 - 10 - 2026',
      monograph: { id: `mono-${id}`, name: 'Monografía', url: 'data:mono', uploadDate: '10 - 10 - 2026', type: DocumentType.MONOGRAFIA, status: stateList.EN_REVISION },
      formatE: { id: `fe-${id}`, name: 'Formato E', url: 'data:fe', uploadDate: '10 - 10 - 2026', type: DocumentType.FORMATO_E, status: stateList.EN_REVISION },
      status: stateList.EN_REVISION
    };
  }

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), // <-- PROVEEDOR AGREGADO
        provideHttpClientTesting(), // <-- PROVEEDOR AGREGADO
        RegisterPazYSalvoFacadeService,
        ThesisWorkService, ThesisWorkStorageService, ThesisWorkAdvanceService,
        ThesisWorkDeliveryService, ThesisWorkEvaluationService,
        ThesisWorkSpecialRequestService, ThesisWorkSustentationService, ThesisWorkApiService,
        PreliminaryDraftStorageService, ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        EventBusService, FileDownloadService,
        { provide: AuthService, useValue: { currentUser: () => null, hasAnyRole: () => false } },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    facade = TestBed.inject(RegisterPazYSalvoFacadeService);
    thesisStorage = TestBed.inject(ThesisWorkStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(thesisStorage.isHydrated, injector);
  });

  it('debe marcar como NO_APROBADO solo la entrega final más reciente (monografía + Formato_E incluidos), y dejar EN_REVISION al trabajo', async () => {
    const olderDelivery = buildDelivery('delivery-old');
    const latestDelivery = buildDelivery('delivery-latest');
    thesisStorage['_thesisWorksList'].set([seedThesisWork([latestDelivery, olderDelivery])]);

    const file = new File(['contenido'], 'paz-y-salvo.pdf', { type: 'application/pdf' });
    let successCalled = false;

    await new Promise<void>(resolve => {
      facade.processPazYSalvo(
        thesisId,
        { academicApproved: true, academicComments: 'Cumple', financialApproved: false, financialComments: 'Debe pendiente de biblioteca' },
        file,
        () => { successCalled = true; resolve(); },
        () => resolve()
      );
    });

    expect(successCalled).toBe(true);
    const updated = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);

    // A. El documento de Paz y Salvo queda como NO_APROBADO (falta la
    // parte financiera para la aprobación completa).
    const pysDoc = updated?.documents.find(d => d.type === DocumentType.PAZ_Y_SALVO);
    expect(pysDoc?.status).toBe(stateList.NO_APROBADO);
    expect(pysDoc?.url).toMatch(/^data:/);

    // B. SOLO la entrega más reciente (índice 0) queda rechazada — la
    // anterior no se toca.
    const latest = updated?.finalDeliveries?.find(d => d.id === 'delivery-latest');
    const older = updated?.finalDeliveries?.find(d => d.id === 'delivery-old');
    expect(latest?.status).toBe(stateList.NO_APROBADO);
    expect(latest?.monograph.status).toBe(stateList.NO_APROBADO);
    expect(latest?.formatE.status).toBe(stateList.NO_APROBADO);
    expect(older?.status).toBe(stateList.EN_REVISION);

    // C. El trabajo vuelve a EN_REVISION — no se archiva, el estudiante
    // debe poder volver a radicar la entrega.
    expect(updated?.state).toBe(stateList.EN_REVISION);
    expect(updated?.isArchived).toBe(false);
  }, 10000);

  it('debe aprobar sin tocar el estado de las entregas cuando ambas partes aprueban', async () => {
    const delivery = buildDelivery('delivery-full-approve');
    thesisStorage['_thesisWorksList'].set([seedThesisWork([delivery])]);

    const file = new File(['contenido'], 'paz-y-salvo.pdf', { type: 'application/pdf' });

    await new Promise<void>(resolve => {
      facade.processPazYSalvo(
        thesisId,
        { academicApproved: true, academicComments: '', financialApproved: true, financialComments: '' },
        file, () => resolve(), () => resolve()
      );
    });

    const updated = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(updated?.documents.find(d => d.type === DocumentType.PAZ_Y_SALVO)?.status).toBe(stateList.APROBADO);

    // La rama de rechazo de finalDeliveries solo corre si !isFullyApproved.
    expect(updated?.finalDeliveries?.find(d => d.id === 'delivery-full-approve')?.status).toBe(stateList.EN_REVISION);
  }, 10000);
});
