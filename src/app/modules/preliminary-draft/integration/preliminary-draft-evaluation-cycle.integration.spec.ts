// src/app/modules/preliminary-draft/integration/preliminary-draft-evaluation-cycle.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ApplicationRef, Injector } from '@angular/core';

// Servicios
import { PreliminaryDraftService } from '../services/preliminary-draft.service';
import { PreliminaryDraftStorageService } from '../services/preliminary-draft-storage.service';
import { PreliminaryDraftAssignmentService } from '../services/preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService } from '../services/preliminary-draft-document.service';
import { PreliminaryDraftApiService } from '../services/preliminary-draft-api.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

// Helper de hidratación
import { waitForHydration } from '../../../testing/wait-for-hydration';

// Modelos y Enums
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { Modality } from '../../proposal/enums/modality.enum';
import { FileDocument } from '../../../core/interfaces/file-document.interface';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

describe('Integración [Anteproyectos]: Ciclo de Asignación y Evaluación', () => {
  let draftService: PreliminaryDraftService;
  let draftStorage: PreliminaryDraftStorageService;
  let userStorage: UserStorageService;
  let eventBus: EventBusService;
  let appRef: ApplicationRef;
  let injector: Injector;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftService,
        PreliminaryDraftStorageService,
        PreliminaryDraftAssignmentService,
        PreliminaryDraftDocumentService,
        PreliminaryDraftApiService,
        UserService,
        UserStorageService,
        UserApiService,
        EventBusService
      ]
    });

    draftService = TestBed.inject(PreliminaryDraftService);
    draftStorage = TestBed.inject(PreliminaryDraftStorageService);
    userStorage = TestBed.inject(UserStorageService);
    eventBus = TestBed.inject(EventBusService);
    appRef = TestBed.inject(ApplicationRef);
    injector = TestBed.inject(Injector);

    await waitForHydration(draftStorage.isHydrated, injector);

    userStorage.updateUsersList(() => []);

    const drafts = draftStorage.allPreliminaryDrafts();
    drafts.forEach(d => {
      if (d.preliminaryDraftId) draftStorage.removeDraft(d.preliminaryDraftId);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe asignar evaluadores (otorgando el rol), registrar sus veredictos y calcular el estado final sin consenso', fakeAsync(() => {
    const evaluator1 = createMockUser({ id: 'doc-ev-1', firstName: 'Docente', lastName: 'Uno', roles: [UserRoleType.DOCENTE] });
    const evaluator2 = createMockUser({ id: 'doc-ev-2', firstName: 'Docente', lastName: 'Dos', roles: [UserRoleType.DOCENTE] });
    const director = createMockUser({ id: 'doc-dir-1', firstName: 'Director', roles: [UserRoleType.DIRECTOR] });

    userStorage.updateUsersList(() => [evaluator1, evaluator2, director]);

    const mockProposal: Proposal = {
      id: 'prop-100', title: 'IA en Agricultura', description: '', modality: Modality.TI,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(), documents: [], evaluations: []
    };

    const draftId = 'pd-100';
    const documentId = 'doc-100';

    const initialDraft: PreliminaryDraft = {
      preliminaryDraftId: draftId,
      proposalId: 'prop-100',
      proposalData: mockProposal,
      state: stateList.EN_REVISION,
      createdData: new Date(),
      documents: [{
        id: documentId, name: 'Documento_V1', url: 'base64...', uploadDate: new Date(),
        type: DocumentType.ANTEPROYECTO, status: stateList.EN_REVISION
      }],
      evaluations: [],
      evaluators: []
    };

    draftStorage.addDraft(initialDraft);
    const eventBusSpy = jest.spyOn(eventBus, 'emit');

    draftService.assignReviewers(draftId, ['doc-ev-1', 'doc-ev-2']).subscribe();

    tick(2000); // Aumentado para cubrir los retardos asíncronos del servicio real de usuarios
    flush();
    appRef.tick();

    const updatedUsers = userStorage.getUsersSnapshot();
    const ev1Updated = updatedUsers.find(u => u.id === 'doc-ev-1');
    const ev2Updated = updatedUsers.find(u => u.id === 'doc-ev-2');

    expect(ev1Updated?.roles).toContain(UserRoleType.EVALUADOR);
    expect(ev2Updated?.roles).toContain(UserRoleType.EVALUADOR);

    const draftAfterAssignment = draftStorage.allPreliminaryDrafts().find(d => d.preliminaryDraftId === draftId);
    expect(draftAfterAssignment?.evaluators?.length).toBe(2);
    expect(eventBusSpy).toHaveBeenCalledWith(expect.objectContaining({ type: AppEventType.REVIEWERS_ASSIGNED }));

    const evaluation1: Evaluation = {
      id: 'eval-1', proposalId: 'prop-100', documentId, evaluatorId: 'doc-ev-1', evaluatorName: 'Docente Uno',
      evaluatorRole: 'Evaluador', veredict: stateList.APROBADO, observations: 'Muy buen trabajo', date: new Date()
    };

    const evaluation2: Evaluation = {
      id: 'eval-2', proposalId: 'prop-100', documentId, evaluatorId: 'doc-ev-2', evaluatorName: 'Docente Dos',
      evaluatorRole: 'Evaluador', veredict: stateList.NO_APROBADO, observations: 'Falta marco teórico', date: new Date()
    };

    draftService.addEvaluation(draftId, evaluation1).subscribe();
    tick(1000);

    draftService.addEvaluation(draftId, evaluation2).subscribe();
    tick(1000);

    flush();
    appRef.tick();

    const finalDraft = draftStorage.allPreliminaryDrafts().find(d => d.preliminaryDraftId === draftId);
    expect(finalDraft?.evaluations.length).toBe(2);

    const documentFinalStatus = draftService.calculateDocumentStatus(documentId, finalDraft?.evaluations || [], 2);
    expect(documentFinalStatus).toBe(stateList.NO_APROBADO);

    expect(eventBusSpy).toHaveBeenCalledWith(expect.objectContaining({ type: AppEventType.PRELIMINARY_DRAFT_EVALUATION_REGISTERED }));
  }));

  it('debe prevenir conflictos de interés al validar evaluadores (Motor Antifraude)', () => {
    const student = createMockUser({ id: 'student-1', firstName: 'Estudiante', roles: [UserRoleType.ESTUDIANTE] });
    const director = createMockUser({ id: 'doc-dir-1', firstName: 'Director', roles: [UserRoleType.DIRECTOR] });
    const codirector = createMockUser({ id: 'doc-codir-1', firstName: 'Codirector', roles: [UserRoleType.DOCENTE] });
    const validEvaluator1 = createMockUser({ id: 'doc-ev-1', firstName: 'Docente 1', roles: [UserRoleType.DOCENTE] });
    const validEvaluator2 = createMockUser({ id: 'doc-ev-2', firstName: 'Docente 2', roles: [UserRoleType.DOCENTE] });

    userStorage.updateUsersList(() => [student, director, codirector, validEvaluator1, validEvaluator2]);

    const mockProposal: Proposal = {
      id: 'prop-fraud-test',
      title: 'Sistema de Detección de Fraudes',
      description: '',
      modality: Modality.TI,
      authors: [student],
      director: director,
      codirector: codirector,
      state: stateList.APROBADO,
      createdAt: new Date(),
      documents: [],
      evaluations: []
    };

    expect(draftService.validateReviewersRules(mockProposal, validEvaluator1.id, validEvaluator1.id)).toBeTruthy();
    expect(draftService.validateReviewersRules(mockProposal, director.id, validEvaluator1.id)).toBeTruthy();
    expect(draftService.validateReviewersRules(mockProposal, validEvaluator2.id, codirector.id)).toBeTruthy();
    expect(draftService.validateReviewersRules(mockProposal, student.id, validEvaluator1.id)).toBeTruthy();
    expect(draftService.validateReviewersRules(mockProposal, validEvaluator1.id, validEvaluator2.id)).toBeNull();
  });

  it('debe registrar la resolución del consejo, actualizar el estado final y notificar al sistema', fakeAsync(() => {
    const draftId = 'pd-consejo-200';
    const presentationDocId = 'doc-presentacion-1';

    const councilDirector = createMockUser({
      id: 'doc-dir-200', firstName: 'Director', lastName: 'Consejo', roles: [UserRoleType.DIRECTOR]
    });
    userStorage.updateUsersList(() => [councilDirector]);

    const proposalForConsejo: Proposal = {
      id: 'prop-200',
      title: 'Test Final',
      description: 'Anteproyecto en etapa de resolución del consejo',
      modality: Modality.TI,
      authors: [],
      director: councilDirector,
      state: stateList.EVALUADO,
      createdAt: new Date(),
      documents: [],
      evaluations: []
    };

    const initialDraft: PreliminaryDraft = {
      preliminaryDraftId: draftId,
      proposalId: 'prop-200',
      proposalData: proposalForConsejo,
      state: stateList.EVALUADO,
      createdData: new Date(),
      documents: [{
        id: presentationDocId,
        name: 'Presentacion_Consejo.pdf',
        url: 'base64...',
        uploadDate: new Date(),
        type: DocumentType.FORMATO_C,
        status: stateList.EN_REVISION
      }],
      evaluations: [],
      evaluators: []
    };

    draftStorage.addDraft(initialDraft);
    const eventBusSpy = jest.spyOn(eventBus, 'emit');

    const resolutionDoc: FileDocument = {
      id: 'doc-res-1',
      name: 'Resolucion_Aprobacion_Acta_001.pdf',
      url: 'data:application/pdf;base64,...',
      uploadDate: new Date(),
      type: DocumentType.RESOLUCION,
      status: stateList.APROBADO
    };

    const councilEvaluation: Evaluation = {
      id: 'eval-consejo',
      proposalId: 'prop-200',
      documentId: presentationDocId,
      evaluatorId: 'consejo-001',
      evaluatorName: 'Consejo de Facultad',
      evaluatorRole: 'Consejo de facultad',
      veredict: stateList.APROBADO,
      observations: 'Aprobado con fecha máxima estricta.',
      date: new Date(),
      signedDocuments: [{ name: resolutionDoc.name, url: resolutionDoc.url }]
    };

    const maxDeliveryDate = new Date('2027-12-31');

    draftService.uploadCouncilResolution(
      draftId,
      resolutionDoc,
      stateList.APROBADO,
      councilEvaluation,
      maxDeliveryDate
    ).subscribe();

    tick(1000);
    flush();
    appRef.tick();

    const updatedDraft = draftStorage.allPreliminaryDrafts().find(d => d.preliminaryDraftId === draftId);

    expect(updatedDraft?.state).toBe(stateList.APROBADO);
    expect(updatedDraft?.documents.some(d => d.type === DocumentType.RESOLUCION)).toBe(true);
    expect(updatedDraft?.evaluations.some(e => e.evaluatorRole === 'Consejo de facultad')).toBe(true);

    expect(eventBusSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ preliminaryDraftId: draftId })
      })
    );
  }));

  it('debe registrar la subida de una corrección, reiniciar el estado a EN_REVISION y recalcular la fecha límite', fakeAsync(() => {
    const draftId = 'pd-correccion-300';
    const student = createMockUser({ id: 'student-300', roles: [UserRoleType.ESTUDIANTE] });
    const evaluator = createMockUser({ id: 'ev-300', roles: [UserRoleType.EVALUADOR] });

    userStorage.updateUsersList(() => [student, evaluator]);

    const initialDraft: PreliminaryDraft = {
      preliminaryDraftId: draftId,
      proposalId: 'prop-300',
      proposalData: { id: 'prop-300', title: 'Reconocimiento de Patrones', authors: [student], modality: Modality.TI } as Proposal,
      state: stateList.APROBADO_CON_OBSERVACIONES,
      createdData: new Date(),
      evaluationDeadline: undefined,
      evaluators: [evaluator],
      documents: [{
        id: 'doc-original', name: 'Original.pdf', url: '...', uploadDate: new Date(),
        type: DocumentType.ANTEPROYECTO, status: stateList.EVALUADO
      }],
      evaluations: []
    };

    draftStorage.addDraft(initialDraft);
    const eventBusSpy = jest.spyOn(eventBus, 'emit');

    const correctionDoc: FileDocument = {
      id: 'doc-corr-1',
      name: 'Correccion_V2.pdf',
      url: 'base64...',
      uploadDate: new Date(),
      type: DocumentType.CORRECCION,
      status: stateList.EN_REVISION
    };

    draftService.uploadDocument(draftId, correctionDoc).subscribe();

    tick(1000);
    flush();
    appRef.tick();

    const updatedDraft = draftStorage.allPreliminaryDrafts().find(d => d.preliminaryDraftId === draftId);

    expect(updatedDraft?.state).toBe(stateList.EN_REVISION);
    expect(updatedDraft?.documents.length).toBe(2);
    expect(updatedDraft?.documents[0].type).toBe(DocumentType.CORRECCION);

    expect(updatedDraft?.evaluationDeadline).toBeTruthy();
    const newDeadline = new Date(updatedDraft!.evaluationDeadline!).getTime();
    expect(newDeadline).toBeGreaterThan(new Date().getTime());

    expect(eventBusSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED,
        payload: expect.objectContaining({ documentType: DocumentType.CORRECCION })
      })
    );
  }));
});
