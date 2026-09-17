// src/app/modules/thesis-work/integration/thesis-work-advance-upload.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { UploadAdvancePageFacadeService } from '../pages/upload-advance-page/services/upload-advance-page-facade.service';
import { LoadedDocumentsThesisWorkFacadeService } from '../pages/loaded-documents-thesis-work-page/services/loaded-documents-thesis-work-facade.service';
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
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
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

// Espera real y corta — reemplaza flush()/fakeAsync() para el margen del
// delay(800) real de ThesisWorkAdvanceService. Más lento en milisegundos,
// pero determinista: sortea por completo la combinación frágil de
// fakeAsync + Promise.all() + FileReader que causaba el bloqueo total
// (ni onSuccess ni onError se disparaban).
const waitForRealDelay = (ms = 900) => new Promise(resolve => setTimeout(resolve, ms));

describe('Integración [Trabajo de Grado]: Subida de avance — ubicación real del documento', () => {
  let uploadFacade: UploadAdvancePageFacadeService;
  let loadedDocsFacade: LoadedDocumentsThesisWorkFacadeService;
  let thesisStorage: ThesisWorkStorageService;
  let userStorage: UserStorageService;
  let downloadMock: { download: jest.Mock };

  const thesisId = 'thesis-adv-1';
  const studentId = 'student-1';

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    downloadMock = { download: jest.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        UploadAdvancePageFacadeService,
        LoadedDocumentsThesisWorkFacadeService,
        ThesisWorkService, ThesisWorkStorageService, ThesisWorkAdvanceService,
        ThesisWorkDeliveryService, ThesisWorkEvaluationService,
        ThesisWorkSpecialRequestService, ThesisWorkSustentationService, ThesisWorkApiService,
        PreliminaryDraftStorageService, ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        EventBusService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: studentId }), hasAnyRole: () => false } },
        { provide: NotificationService, useValue: { show: jest.fn() } },
        { provide: FileDownloadService, useValue: downloadMock }
      ]
    });

    uploadFacade = TestBed.inject(UploadAdvancePageFacadeService);
    loadedDocsFacade = TestBed.inject(LoadedDocumentsThesisWorkFacadeService);
    thesisStorage = TestBed.inject(ThesisWorkStorageService);
    userStorage = TestBed.inject(UserStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(thesisStorage.isHydrated, injector);

    const student = createMockUser({ id: studentId, firstName: 'Estudiante' });
    const director = createMockUser({ id: 'dir-1', firstName: 'Director' });
    userStorage.updateUsersList(() => [director, student]);

    const proposal: Proposal = {
      id: 'prop-adv-1', title: 'Tesis con avances', description: 'desc', modality: Modality.TI,
      authors: [student], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const draft: PreliminaryDraft = {
      preliminaryDraftId: 'draft-adv-1', proposalId: proposal.id!, proposalData: proposal,
      evaluators: [], evaluations: [], documents: [],
      state: stateList.APROBADO, createdData: new Date(), isArchived: false
    };
    const thesisWork: ThesisWork = {
      thesisWorkId: thesisId, preliminaryDraftId: draft.preliminaryDraftId!, preliminaryDraftData: draft,
      createdDate: new Date(), state: stateList.EN_DESARROLLO,
      advances: [], evaluations: [], finalDeliveries: [], documents: [],
      sustentations: [], pazYSalvos: [], specialRequests: [], isArchived: false
    };
    thesisStorage['_thesisWorksList'].set([thesisWork]);
  });

  it('debe agrupar 2 documentos de un mismo envío bajo UN solo avance, sin tocar documents[] plano', async () => {
    const file1 = new File(['contenido 1'], 'capitulo1.pdf', { type: 'application/pdf' });
    const file2 = new File(['contenido 2'], 'capitulo2.pdf', { type: 'application/pdf' });

    let successCalled = false;
    let errorCalled = false;

    await uploadFacade.processAdvance(
      thesisId, studentId,
      { formValues: { title: 'Avance 1', comments: 'Capítulos 1 y 2' }, files: [file1, file2] },
      () => { successCalled = true; },
      () => { errorCalled = true; }
    );
    await waitForRealDelay();

    if (errorCalled) throw new Error('Upload falló: el callback de error fue invocado.');
    expect(successCalled).toBe(true);

    const updatedThesis = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);

    // A. documents[] plano NUNCA recibe documentos de tipo AVANCE.
    expect(updatedThesis?.documents).toHaveLength(0);

    // B. Ambos archivos quedan agrupados bajo UN único avance — verifica
    // que forkJoin() + delay(800) no produce una condición de carrera al
    // mutar el mismo storage dos veces seguidas con el mismo advanceId.
    expect(updatedThesis?.advances).toHaveLength(1);
    expect(updatedThesis?.advances?.[0].documents).toHaveLength(2);
    expect(updatedThesis?.advances?.[0].title).toBe('Avance 1');
    expect(updatedThesis?.advances?.[0].studentId).toBe(studentId);

    // C. Los archivos reales se leyeron — URLs base64 reales, con el
    // FileReader real de jsdom, sin ningún mock.
    updatedThesis?.advances?.[0].documents.forEach(doc => {
      expect(doc.url).toMatch(/^data:/);
    });
  }, 10000);

  it('debe descargar correctamente un documento de avance usando el Advance real resultante de la subida', async () => {
    const file = new File(['contenido'], 'capitulo1.pdf', { type: 'application/pdf' });
    let errorCalled = false;

    await uploadFacade.processAdvance(
      thesisId, studentId,
      { formValues: { title: 'Avance descarga', comments: '' }, files: [file] },
      () => {},
      () => { errorCalled = true; }
    );
    await waitForRealDelay();
    if (errorCalled) throw new Error('Upload de setup falló: el callback de error fue invocado.');

    const updatedThesis = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    const createdAdvance = updatedThesis?.advances?.[0] ?? null;
    const documentName = createdAdvance?.documents[0]?.name ?? '';

    // Integración real entre 2 facades sobre el MISMO storage.
    await loadedDocsFacade.downloadDocumentByName(documentName, createdAdvance);

    expect(downloadMock.download).toHaveBeenCalledWith(
      expect.stringMatching(/^data:/),
      `${documentName}.pdf`
    );
  }, 10000);

  it('debe caer al fallback de error si el nombre buscado no existe en los documentos del avance', async () => {
    const file = new File(['contenido'], 'capitulo1.pdf', { type: 'application/pdf' });
    let errorCalled = false;

    await uploadFacade.processAdvance(
      thesisId, studentId,
      { formValues: { title: 'Avance con doc', comments: '' }, files: [file] },
      () => {},
      () => { errorCalled = true; }
    );
    await waitForRealDelay();
    if (errorCalled) throw new Error('Upload de setup falló: el callback de error fue invocado.');

    const createdAdvance = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId)?.advances?.[0] ?? null;
    await loadedDocsFacade.downloadDocumentByName('archivo-que-no-existe', createdAdvance);

    expect(downloadMock.download).not.toHaveBeenCalled();
  }, 10000);
});
