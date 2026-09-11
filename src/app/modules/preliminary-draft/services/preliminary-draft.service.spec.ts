import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftService } from './preliminary-draft.service';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { PreliminaryDraftApiService } from './preliminary-draft-api.service';
import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService } from './preliminary-draft-document.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { stateList } from '../../../core/enums/state.enum';

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────
function createMockDraft(overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft {
  return {
    preliminaryDraftId: 'draft-default-id',
    isArchived: false,
    evaluators: [],
    evaluations: [],
    ...overrides
  } as PreliminaryDraft;
}

function createMockProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'prop-default-id',
    title: 'Proposal Mock',
    ...overrides
  } as Proposal;
}

function createMockEvaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    id: 'eval-default-id',
    evaluatorId: 'evaluator-1',
    veredict: stateList.APROBADO,
    ...overrides
  } as Evaluation;
}

function createMockDocument(overrides: Partial<FileDocument> = {}): FileDocument {
  return {
    id: 'doc-default-id',
    name: 'document_mock.pdf',
    type: 'Documento',
    ...overrides
  } as FileDocument;
}

describe('PreliminaryDraftService (Facade)', () => {
  let service: PreliminaryDraftService;

  // 🔹 REFACTOR: Definimos la estructura exacta de los espías sin usar 'unknown'
  let mockStorageService: {
    preliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
    allPreliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
  };

  let mockApiService: {
    getPreliminaryDraftById: jest.Mock;
    createPreliminaryDraft: jest.Mock;
    updatePreliminaryDraft: jest.Mock;
    deleteDraft: jest.Mock;
  };

  let mockAssignmentService: {
    validateReviewersRules: jest.Mock;
    assignReviewersMock: jest.Mock;
  };

  let mockDocumentService: {
    addEvaluationMock: jest.Mock;
    uploadDocumentMock: jest.Mock;
    uploadCouncilResolutionMock: jest.Mock;
    calculateDocumentStatus: jest.Mock;
  };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido en la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Configuración limpia de Signals
    mockStorageService = {
      preliminaryDrafts: signal<PreliminaryDraft[]>([]),
      allPreliminaryDrafts: signal<PreliminaryDraft[]>([])
    };

    // Mocks de servicios puramente estructurales (sin as unknown)
    mockApiService = {
      getPreliminaryDraftById: jest.fn(),
      createPreliminaryDraft: jest.fn(),
      updatePreliminaryDraft: jest.fn(),
      deleteDraft: jest.fn()
    };

    mockAssignmentService = {
      validateReviewersRules: jest.fn(),
      assignReviewersMock: jest.fn()
    };

    mockDocumentService = {
      addEvaluationMock: jest.fn(),
      uploadDocumentMock: jest.fn(),
      uploadCouncilResolutionMock: jest.fn(),
      calculateDocumentStatus: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftService,
        // 🔹 REFACTOR: Asignaciones directas y limpias
        { provide: PreliminaryDraftStorageService, useValue: mockStorageService },
        { provide: PreliminaryDraftApiService, useValue: mockApiService },
        { provide: PreliminaryDraftAssignmentService, useValue: mockAssignmentService },
        { provide: PreliminaryDraftDocumentService, useValue: mockDocumentService }
      ]
    });

    service = TestBed.inject(PreliminaryDraftService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar las implementaciones originales de la consola
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Estado Reactivo (Signals)', () => {
    it('debería exponer las señales del StorageService correctamente', () => {
      // Verificamos que la referencia en memoria sea exactamente la misma
      expect(service.preliminaryDrafts).toBe(mockStorageService.preliminaryDrafts);
      expect(service.allPreliminaryDrafts).toBe(mockStorageService.allPreliminaryDrafts);
    });
  });

  describe('Delegación de operaciones CRUD (API Service)', () => {
    const mockDraft = createMockDraft({ preliminaryDraftId: '123' });

    it('debería delegar getPreliminaryDraftById', () => {
      mockApiService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));

      service.getPreliminaryDraftById('123').subscribe(res => {
        expect(res).toEqual(mockDraft);
      });

      expect(mockApiService.getPreliminaryDraftById).toHaveBeenCalledWith('123');
    });

    it('debería delegar createPreliminaryDraft', () => {
      mockApiService.createPreliminaryDraft.mockReturnValue(of(mockDraft));

      service.createPreliminaryDraft(mockDraft).subscribe(res => {
        expect(res).toEqual(mockDraft);
      });

      expect(mockApiService.createPreliminaryDraft).toHaveBeenCalledWith(mockDraft);
    });

    it('debería delegar updatePreliminaryDraft', () => {
      mockApiService.updatePreliminaryDraft.mockReturnValue(of(mockDraft));

      service.updatePreliminaryDraft('123', mockDraft).subscribe(res => {
        expect(res).toEqual(mockDraft);
      });

      expect(mockApiService.updatePreliminaryDraft).toHaveBeenCalledWith('123', mockDraft);
    });

    it('debería delegar deleteDraft', () => {
      mockApiService.deleteDraft.mockReturnValue(of(undefined));

      service.deleteDraft('123').subscribe();

      expect(mockApiService.deleteDraft).toHaveBeenCalledWith('123');
    });
  });

  describe('Delegación de operaciones de Asignación', () => {
    it('debería delegar validateReviewersRules', () => {
      const mockProposal = createMockProposal({ id: 'prop-1' });
      const errorMessage = 'Los evaluadores no pueden ser iguales';

      mockAssignmentService.validateReviewersRules.mockReturnValue(errorMessage);

      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-1');

      expect(result).toBe(errorMessage);
      expect(mockAssignmentService.validateReviewersRules).toHaveBeenCalledWith(mockProposal, 'eval-1', 'eval-1');
    });

    it('debería delegar assignReviewers al método assignReviewersMock', () => {
      mockAssignmentService.assignReviewersMock.mockReturnValue(of(undefined));

      service.assignReviewers('draft-1', ['eval-1', 'eval-2']).subscribe();

      expect(mockAssignmentService.assignReviewersMock).toHaveBeenCalledWith('draft-1', ['eval-1', 'eval-2']);
    });
  });

  describe('Delegación de Documentos y Evaluaciones', () => {
    it('debería delegar addEvaluation', () => {
      const mockEval = createMockEvaluation({ id: 'eval-1' });
      mockDocumentService.addEvaluationMock.mockReturnValue(of(undefined));

      service.addEvaluation('draft-1', mockEval).subscribe();

      expect(mockDocumentService.addEvaluationMock).toHaveBeenCalledWith('draft-1', mockEval);
    });

    it('debería delegar uploadDocument', () => {
      const mockDoc = createMockDocument({ id: 'doc-1' });
      mockDocumentService.uploadDocumentMock.mockReturnValue(of(undefined));

      service.uploadDocument('draft-1', mockDoc).subscribe();

      expect(mockDocumentService.uploadDocumentMock).toHaveBeenCalledWith('draft-1', mockDoc);
    });

    it('debería delegar uploadCouncilResolution', () => {
      const mockDoc = createMockDocument({ id: 'doc-resolucion' });
      const mockEval = createMockEvaluation({ veredict: stateList.APROBADO });
      const mockDraft = createMockDraft({ preliminaryDraftId: 'draft-1' });
      const maxDate = new Date('2026-10-10');

      mockDocumentService.uploadCouncilResolutionMock.mockReturnValue(of(mockDraft));

      service.uploadCouncilResolution('draft-1', mockDoc, stateList.APROBADO, mockEval, maxDate).subscribe(res => {
        expect(res).toEqual(mockDraft);
      });

      expect(mockDocumentService.uploadCouncilResolutionMock).toHaveBeenCalledWith(
        'draft-1',
        mockDoc,
        stateList.APROBADO,
        mockEval,
        maxDate
      );
    });

    it('debería delegar calculateDocumentStatus', () => {
      const mockEvals = [createMockEvaluation(), createMockEvaluation()];
      mockDocumentService.calculateDocumentStatus.mockReturnValue(stateList.APROBADO);

      const result = service.calculateDocumentStatus('doc-1', mockEvals, 2);

      expect(result).toBe(stateList.APROBADO);
      expect(mockDocumentService.calculateDocumentStatus).toHaveBeenCalledWith('doc-1', mockEvals, 2);
    });
  });
});
