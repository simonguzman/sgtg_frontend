import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';

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

describe('PreliminaryDraftService', () => {
  let service: PreliminaryDraftService;

  let mockStorageService: jest.Mocked<PreliminaryDraftStorageService>;
  let mockApiService: jest.Mocked<PreliminaryDraftApiService>;
  let mockAssignmentService: jest.Mocked<PreliminaryDraftAssignmentService>;
  let mockDocumentService: jest.Mocked<PreliminaryDraftDocumentService>;

  beforeEach(() => {
    mockStorageService = {
      preliminaryDrafts: signal([]),
      allPreliminaryDrafts: signal([])
    } as unknown as jest.Mocked<PreliminaryDraftStorageService>;

    mockApiService = {
      getPreliminaryDraftById: jest.fn(),
      createPreliminaryDraft: jest.fn(),
      updatePreliminaryDraft: jest.fn(),
      deleteDraft: jest.fn()
    } as unknown as jest.Mocked<PreliminaryDraftApiService>;

    mockAssignmentService = {
      validateReviewersRules: jest.fn(),
      assignReviewersMock: jest.fn()
    } as unknown as jest.Mocked<PreliminaryDraftAssignmentService>;

    mockDocumentService = {
      addEvaluationMock: jest.fn(),
      uploadDocumentMock: jest.fn(),
      uploadCouncilResolutionMock: jest.fn(),
      calculateDocumentStatus: jest.fn()
    } as unknown as jest.Mocked<PreliminaryDraftDocumentService>;

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
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Estado Reactivo (Signals)', () => {
    it('debería exponer las señales del StorageService', () => {
      expect(service.preliminaryDrafts).toBe(mockStorageService.preliminaryDrafts);
      expect(service.allPreliminaryDrafts).toBe(mockStorageService.allPreliminaryDrafts);
    });
  });

  describe('Delegación de operaciones CRUD a API Service', () => {
    const mockDraft = { preliminaryDraftId: '1' } as unknown as PreliminaryDraft;

    it('debería delegar getPreliminaryDraftById', () => {
      mockApiService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));
      service.getPreliminaryDraftById('1').subscribe(res => {
        expect(res).toEqual(mockDraft);
      });
      expect(mockApiService.getPreliminaryDraftById).toHaveBeenCalledWith('1');
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
      service.updatePreliminaryDraft('1', mockDraft).subscribe(res => {
        expect(res).toEqual(mockDraft);
      });
      expect(mockApiService.updatePreliminaryDraft).toHaveBeenCalledWith('1', mockDraft);
    });

    it('debería delegar deleteDraft', () => {
      mockApiService.deleteDraft.mockReturnValue(of(undefined));
      service.deleteDraft('1').subscribe();
      expect(mockApiService.deleteDraft).toHaveBeenCalledWith('1');
    });
  });

  describe('Delegación de operaciones de Asignación', () => {
    it('debería delegar validateReviewersRules', () => {
      const mockProposal = { id: 'prop-1' } as unknown as Proposal;
      mockAssignmentService.validateReviewersRules.mockReturnValue('Error simulado');

      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');

      expect(result).toBe('Error simulado');
      expect(mockAssignmentService.validateReviewersRules).toHaveBeenCalledWith(mockProposal, 'eval-1', 'eval-2');
    });

    it('debería delegar assignReviewers al método assignReviewersMock', () => {
      mockAssignmentService.assignReviewersMock.mockReturnValue(of(undefined));

      service.assignReviewers('draft-1', ['eval-1', 'eval-2']).subscribe();

      expect(mockAssignmentService.assignReviewersMock).toHaveBeenCalledWith('draft-1', ['eval-1', 'eval-2']);
    });
  });

  describe('Delegación de Documentos y Evaluaciones', () => {
    it('debería delegar addEvaluation', () => {
      const mockEval = { id: 'eval-1' } as unknown as Evaluation;
      mockDocumentService.addEvaluationMock.mockReturnValue(of(undefined));

      service.addEvaluation('draft-1', mockEval).subscribe();

      expect(mockDocumentService.addEvaluationMock).toHaveBeenCalledWith('draft-1', mockEval);
    });

    it('debería delegar uploadDocument', () => {
      const mockDoc = { id: 'doc-1' } as unknown as FileDocument;
      mockDocumentService.uploadDocumentMock.mockReturnValue(of(undefined));

      service.uploadDocument('draft-1', mockDoc).subscribe();

      expect(mockDocumentService.uploadDocumentMock).toHaveBeenCalledWith('draft-1', mockDoc);
    });

    it('debería delegar uploadCouncilResolution', () => {
      const mockDoc = { id: 'doc-resolucion' } as unknown as FileDocument;
      const mockEval = { veredict: stateList.APROBADO } as unknown as Evaluation;
      const mockDraft = { preliminaryDraftId: 'draft-1' } as unknown as PreliminaryDraft;
      const maxDate = new Date();

      mockDocumentService.uploadCouncilResolutionMock.mockReturnValue(of(mockDraft));

      service.uploadCouncilResolution('draft-1', mockDoc, stateList.APROBADO, mockEval, maxDate).subscribe(res => {
        expect(res).toEqual(mockDraft);
      });

      expect(mockDocumentService.uploadCouncilResolutionMock).toHaveBeenCalledWith('draft-1', mockDoc, stateList.APROBADO, mockEval, maxDate);
    });

    it('debería delegar calculateDocumentStatus', () => {
      const mockEvals = [] as Evaluation[];
      mockDocumentService.calculateDocumentStatus.mockReturnValue(stateList.APROBADO);

      const result = service.calculateDocumentStatus('doc-1', mockEvals, 2);

      expect(result).toBe(stateList.APROBADO);
      expect(mockDocumentService.calculateDocumentStatus).toHaveBeenCalledWith('doc-1', mockEvals, 2);
    });
  });
});
