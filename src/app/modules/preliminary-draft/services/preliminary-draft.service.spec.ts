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
import { stateList } from '../../../core/enums/state.enum';

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

describe('PreliminaryDraftService (Facade)', () => {
  let service: PreliminaryDraftService;

  let mockStorageService: {
    preliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
    allPreliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
  };

  let mockApiService: {
    getPreliminaryDraftById: jest.Mock;
    createPreliminaryDraft: jest.Mock;
    updatePreliminaryDraft: jest.Mock;
    annulDraft: jest.Mock;
  };

  let mockAssignmentService: {
    validateReviewersRules: jest.Mock;
    assignReviewers: jest.Mock;
  };

  let mockDocumentService: {
    registerEvaluatorConcept: jest.Mock;
    uploadCorrection: jest.Mock;
    uploadCouncilPresentation: jest.Mock;
    registerCouncilDecision: jest.Mock;
    calculateDocumentStatus: jest.Mock;
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockStorageService = {
      preliminaryDrafts: signal<PreliminaryDraft[]>([]),
      allPreliminaryDrafts: signal<PreliminaryDraft[]>([])
    };

    mockApiService = {
      getPreliminaryDraftById: jest.fn(),
      createPreliminaryDraft: jest.fn(),
      updatePreliminaryDraft: jest.fn(),
      annulDraft: jest.fn()
    };

    mockAssignmentService = {
      validateReviewersRules: jest.fn(),
      assignReviewers: jest.fn()
    };

    mockDocumentService = {
      registerEvaluatorConcept: jest.fn(),
      uploadCorrection: jest.fn(),
      uploadCouncilPresentation: jest.fn(),
      registerCouncilDecision: jest.fn(),
      calculateDocumentStatus: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftService,
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
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Estado Reactivo (Signals)', () => {
    it('debería exponer las señales del StorageService correctamente', () => {
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

    it('debería delegar annulDraft', () => {
      mockApiService.annulDraft.mockReturnValue(of(undefined));

      service.annulDraft('123', 'Motivo').subscribe();

      expect(mockApiService.annulDraft).toHaveBeenCalledWith('123', 'Motivo');
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

    it('debería delegar assignReviewers', () => {
      mockAssignmentService.assignReviewers.mockReturnValue(of(undefined));

      service.assignReviewers('draft-1', ['eval-1', 'eval-2']).subscribe();

      expect(mockAssignmentService.assignReviewers).toHaveBeenCalledWith('draft-1', ['eval-1', 'eval-2']);
    });
  });

  describe('Delegación de Documentos y Evaluaciones', () => {
    const pdf = new File(['%PDF'], 'documento.pdf');
    const draft = createMockDraft({ preliminaryDraftId: 'draft-1' });

    it('debería delegar registerEvaluatorConcept', () => {
      mockDocumentService.registerEvaluatorConcept.mockReturnValue(of(draft));
      const notas = new File(['%PDF'], 'notas.pdf');
      service.registerEvaluatorConcept('draft-1', 'CON_CORRECCIONES', 'Ajustar', pdf, notas).subscribe();
      expect(mockDocumentService.registerEvaluatorConcept)
        .toHaveBeenCalledWith('draft-1', 'CON_CORRECCIONES', 'Ajustar', pdf, notas);
    });

    it('debería delegar uploadCorrection', () => {
      mockDocumentService.uploadCorrection.mockReturnValue(of(draft));
      service.uploadCorrection('draft-1', pdf).subscribe();
      expect(mockDocumentService.uploadCorrection).toHaveBeenCalledWith('draft-1', pdf);
    });

    it('debería delegar uploadCouncilPresentation', () => {
      mockDocumentService.uploadCouncilPresentation.mockReturnValue(of(draft));
      service.uploadCouncilPresentation('draft-1', pdf).subscribe();
      expect(mockDocumentService.uploadCouncilPresentation).toHaveBeenCalledWith('draft-1', pdf);
    });

    it('debería delegar registerCouncilDecision', () => {
      mockDocumentService.registerCouncilDecision.mockReturnValue(of(draft));
      service.registerCouncilDecision('draft-1', stateList.APROBADO, 'Cumple', pdf).subscribe(res => {
        expect(res).toEqual(draft);
      });
      expect(mockDocumentService.registerCouncilDecision).toHaveBeenCalledWith('draft-1', stateList.APROBADO, 'Cumple', pdf);
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
