import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftDocumentService } from './preliminary-draft-document.service';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { User } from '../../users/interfaces/user.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';

describe('PreliminaryDraftDocumentService', () => {
  let service: PreliminaryDraftDocumentService;

  // 🔹 REFACTOR: Spies tipados sin 'unknown'
  let mockStorageService: { updateDraft: jest.Mock };
  let mockUserService: { users: WritableSignal<User[]> }; // Tipado estricto a User[]
  let mockEventBusService: { emit: jest.Mock };

  // 🔹 REFACTOR: Fábricas para generar entidades válidas sin 'as any' o 'as unknown'
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'default-user', roles: [], ...overrides
  } as User);

  const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
    id: 'default-doc', name: 'document.pdf', type: DocumentType.AVANCE, ...overrides
  } as FileDocument);

  const createMockEvaluation = (overrides: Partial<Evaluation> = {}): Evaluation => ({
    documentId: 'default-doc', veredict: stateList.EN_REVISION, ...overrides
  } as Evaluation);

  const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
    id: 'prop-1', title: 'Propuesta Base', authors: [], ...overrides
  } as Proposal);

  const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
    preliminaryDraftId: 'draft-1',
    state: stateList.EN_REVISION,
    evaluations: [],
    documents: [],
    createdData: new Date(),
    ...overrides
  } as PreliminaryDraft);

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido en la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockStorageService = {
      updateDraft: jest.fn()
    };

    mockUserService = {
      users: signal([
        createMockUser({ id: 'jefe-1', roles: [UserRoleType.JEFE_DEP] }),
        createMockUser({ id: 'consejo-1', roles: [UserRoleType.CONSEJO] })
      ])
    };

    mockEventBusService = {
      emit: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftDocumentService,
        // 🔹 REFACTOR: Asignaciones directas sin casteo forzado a 'unknown'
        { provide: PreliminaryDraftStorageService, useValue: mockStorageService },
        { provide: UserService, useValue: mockUserService },
        { provide: EventBusService, useValue: mockEventBusService }
      ]
    });

    service = TestBed.inject(PreliminaryDraftDocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar las implementaciones originales de la consola
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateDocumentStatus', () => {
    it('debería retornar EN_REVISION si no hay evaluadores', () => {
      expect(service.calculateDocumentStatus('doc-1', [], 0)).toBe(stateList.EN_REVISION);
    });

    it('debería retornar EN_REVISION si faltan evaluaciones', () => {
      const evals = [createMockEvaluation({ documentId: 'doc-1', veredict: stateList.APROBADO })];
      expect(service.calculateDocumentStatus('doc-1', evals, 2)).toBe(stateList.EN_REVISION);
    });

    it('debería retornar NO_APROBADO si al menos una evaluación es NO_APROBADO', () => {
      const evals = [
        createMockEvaluation({ documentId: 'doc-1', veredict: stateList.APROBADO }),
        createMockEvaluation({ documentId: 'doc-1', veredict: stateList.NO_APROBADO })
      ];
      expect(service.calculateDocumentStatus('doc-1', evals, 2)).toBe(stateList.NO_APROBADO);
    });

    it('debería retornar APROBADO si todas las evaluaciones son APROBADO', () => {
      const evals = [
        createMockEvaluation({ documentId: 'doc-1', veredict: stateList.APROBADO }),
        createMockEvaluation({ documentId: 'doc-1', veredict: stateList.APROBADO })
      ];
      expect(service.calculateDocumentStatus('doc-1', evals, 2)).toBe(stateList.APROBADO);
    });
  });

  describe('addEvaluationMock', () => {
    it('debería añadir evaluación, clasificar el status (ON_TIME) y notificar', fakeAsync(() => {
      const mockEvaluation = createMockEvaluation({ veredict: stateList.APROBADO });
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const mockDraft = createMockDraft({
        proposalData: createMockProposal({
          title: 'Tesis',
          authors: [createMockUser({ id: 'author-1' })]
        }),
        evaluationDeadline: futureDate
      });

      let finalDraft: PreliminaryDraft | undefined;
      mockStorageService.updateDraft.mockImplementation((id: string, cb: (draft: PreliminaryDraft) => PreliminaryDraft) => {
        finalDraft = cb(mockDraft);
      });

      service.addEvaluationMock('draft-1', mockEvaluation).subscribe();
      tick(1000);

      expect(finalDraft?.evaluations?.[0].deadlineStatus).toBe(EvaluationDeadlineStatus.ON_TIME);

      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PRELIMINARY_DRAFT_EVALUATION_REGISTERED,
          targetUserIds: expect.arrayContaining(['author-1', 'jefe-1'])
        })
      );
    }));
  });

  describe('uploadDocumentMock', () => {
    it('debería subir CORRECCION, actualizar deadline y notificar evaluadores', fakeAsync(() => {
      const document = createMockFileDocument({ type: DocumentType.CORRECCION });

      const mockDraft = createMockDraft({
        proposalData: createMockProposal({
          title: 'Correcciones',
          authors: [createMockUser({ id: 'auth-1' })],
          director: createMockUser({ id: 'dir-1' })
        }),
        evaluators: [createMockUser({ id: 'eval-1' })]
      });

      let finalDraft: PreliminaryDraft | undefined;
      mockStorageService.updateDraft.mockImplementation((id: string, cb: (draft: PreliminaryDraft) => PreliminaryDraft) => {
        finalDraft = cb(mockDraft);
      });

      service.uploadDocumentMock('draft-1', document).subscribe();
      tick(1000);

      expect(finalDraft?.evaluationDeadline).toBeDefined();
      expect(finalDraft?.documents?.[0]).toEqual(document);

      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED,
          targetUserIds: expect.arrayContaining(['eval-1', 'dir-1'])
        })
      );
    }));

    it('debería subir FORMATO_C, limpiar deadline y notificar a consejo/jefes', fakeAsync(() => {
      const document = createMockFileDocument({ type: DocumentType.FORMATO_C });

      const mockDraft = createMockDraft({
        proposalData: createMockProposal({
          title: 'Presentacion',
          authors: [createMockUser({ id: 'auth-1' })]
        })
      });

      let finalDraft: PreliminaryDraft | undefined;
      mockStorageService.updateDraft.mockImplementation((id: string, cb: (draft: PreliminaryDraft) => PreliminaryDraft) => {
        finalDraft = cb(mockDraft);
      });

      service.uploadDocumentMock('draft-1', document).subscribe();
      tick(1000);

      expect(finalDraft?.evaluationDeadline).toBeUndefined();

      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PRELIMINARY_DRAFT_COUNCIL_PRESENTATION_UPLOADED,
          targetUserIds: expect.arrayContaining(['auth-1', 'jefe-1', 'consejo-1'])
        })
      );
    }));
  });

  describe('uploadCouncilResolutionMock', () => {
    it('debería registrar resolución, actualizar estado y setear maximumDeliveryDate si es APROBADO', fakeAsync(() => {
      const document = createMockFileDocument({ id: 'doc-resolucion' });
      const evaluation = createMockEvaluation({ veredict: stateList.APROBADO });
      const maxDate = new Date('2024-12-31');

      const mockDraft = createMockDraft({
        proposalData: createMockProposal({
          title: 'Resolucion',
          authors: [createMockUser({ id: 'auth-1' })]
        })
      });

      let finalDraft: PreliminaryDraft | undefined;
      mockStorageService.updateDraft.mockImplementation((id: string, cb: (draft: PreliminaryDraft) => PreliminaryDraft) => {
        finalDraft = cb(mockDraft);
      });

      let returnedDraft: PreliminaryDraft | undefined;
      service.uploadCouncilResolutionMock('draft-1', document, stateList.APROBADO, evaluation, maxDate)
        .subscribe(res => returnedDraft = res);

      tick(1000);

      expect(finalDraft?.state).toBe(stateList.APROBADO);
      expect(finalDraft?.maximumDeliveryDate).toBe(maxDate);
      expect(finalDraft?.documents).toContain(document);
      expect(finalDraft?.evaluations).toContain(evaluation);

      expect(returnedDraft).toEqual(finalDraft);

      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.COUNCIL_RESOLUTION_UPLOADED,
          targetUserIds: expect.arrayContaining(['auth-1', 'jefe-1', 'consejo-1']),
          payload: expect.objectContaining({ finalState: stateList.APROBADO })
        })
      );
    }));
  });
});
