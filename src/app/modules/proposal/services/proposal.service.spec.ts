import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { ProposalService } from './proposal.service';
import { ProposalStorageService } from './proposal-storage.service';
import { ProposalRulesService } from './proposal-rules.service';
import { ProposalDocumentService } from './proposal-document.service';
import { ProposalApiService } from './proposal-api.service';

import { Proposal } from '../interfaces/proposal.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';

describe('ProposalService', () => {
  let service: ProposalService;

  let mockStorageService: jest.Mocked<ProposalStorageService>;
  let mockRulesService: jest.Mocked<ProposalRulesService>;
  let mockDocumentService: jest.Mocked<ProposalDocumentService>;
  let mockApiService: jest.Mocked<ProposalApiService>;

  beforeEach(() => {
    // Mock del Storage
    mockStorageService = {
      proposals: signal([] as Proposal[]),
      allProposals: signal([] as Proposal[]),
      getProposalsListSnapshot: jest.fn()
    } as unknown as jest.Mocked<ProposalStorageService>;

    // Mock de Rules
    mockRulesService = {
      validateProposalRules: jest.fn()
    } as unknown as jest.Mocked<ProposalRulesService>;

    // Mock de Documents
    mockDocumentService = {
      addEvaluationMock: jest.fn(),
      uploadCorrectionMock: jest.fn()
    } as unknown as jest.Mocked<ProposalDocumentService>;

    // Mock de API
    mockApiService = {
      getProposalByIdMock: jest.fn(),
      createProposalMock: jest.fn(),
      updateProposalMock: jest.fn(),
      deleteProposalMock: jest.fn()
    } as unknown as jest.Mocked<ProposalApiService>;

    TestBed.configureTestingModule({
      providers: [
        ProposalService,
        { provide: ProposalStorageService, useValue: mockStorageService },
        { provide: ProposalRulesService, useValue: mockRulesService },
        { provide: ProposalDocumentService, useValue: mockDocumentService },
        { provide: ProposalApiService, useValue: mockApiService }
      ]
    });

    service = TestBed.inject(ProposalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Delegación: API', () => {
    it('debería delegar getProposalByIdMock al apiService', (done) => {
      const mockProp = { id: '1', title: 'Test' } as Proposal;
      mockApiService.getProposalByIdMock.mockReturnValue(of(mockProp));

      service.getProposalByIdMock('1').subscribe(result => {
        expect(result).toEqual(mockProp);
        expect(mockApiService.getProposalByIdMock).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('debería delegar createProposalMock al apiService', (done) => {
      const payload = { title: 'Nueva' } as Proposal;
      mockApiService.createProposalMock.mockReturnValue(of(payload));

      service.createProposalMock(payload).subscribe(result => {
        expect(result).toEqual(payload);
        expect(mockApiService.createProposalMock).toHaveBeenCalledWith(payload);
        done();
      });
    });

    it('debería delegar updateProposalMock al apiService', (done) => {
      const changes = { title: 'Modificada' } as Partial<Proposal>;
      const updatedProp = { id: '1', ...changes } as Proposal;
      mockApiService.updateProposalMock.mockReturnValue(of(updatedProp));

      service.updateProposalMock('1', changes).subscribe(result => {
        expect(result).toEqual(updatedProp);
        expect(mockApiService.updateProposalMock).toHaveBeenCalledWith('1', changes);
        done();
      });
    });

    it('debería delegar deleteProposalMock al apiService', (done) => {
      mockApiService.deleteProposalMock.mockReturnValue(of(true));

      service.deleteProposalMock('1').subscribe(result => {
        expect(result).toBe(true);
        expect(mockApiService.deleteProposalMock).toHaveBeenCalledWith('1');
        done();
      });
    });
  });

  describe('Delegación: Reglas de Negocio', () => {
    it('debería delegar validateProposalRules al rulesService', () => {
      const payload = { id: '1' } as Partial<Proposal>;
      mockRulesService.validateProposalRules.mockReturnValue('Error de validación');

      const result = service.validateProposalRules(payload);

      expect(result).toBe('Error de validación');
      expect(mockRulesService.validateProposalRules).toHaveBeenCalledWith(payload);
    });
  });

  describe('Delegación: Documentos y Evaluaciones', () => {
    it('debería delegar addEvaluationMock al documentService', (done) => {
      const evalPayload = { id: 'ev-1' } as Evaluation;
      const updatedProp = { id: '1' } as Proposal;
      mockDocumentService.addEvaluationMock.mockReturnValue(of(updatedProp));

      service.addEvaluationMock('1', evalPayload).subscribe(result => {
        expect(result).toEqual(updatedProp);
        expect(mockDocumentService.addEvaluationMock).toHaveBeenCalledWith('1', evalPayload);
        done();
      });
    });

    it('debería delegar uploadCorrectionMock al documentService', (done) => {
      const docPayload = { id: 'doc-1' } as FileDocument;
      const updatedProp = { id: '1' } as Proposal;
      mockDocumentService.uploadCorrectionMock.mockReturnValue(of(updatedProp));

      service.uploadCorrectionMock('1', docPayload).subscribe(result => {
        expect(result).toEqual(updatedProp);
        expect(mockDocumentService.uploadCorrectionMock).toHaveBeenCalledWith('1', docPayload);
        done();
      });
    });
  });

  describe('Métodos Propios: getDocumentsByProposalId', () => {
    it('debería retornar los documentos si la propuesta existe', () => {
      const mockDocs = [{ id: 'doc-1' }] as FileDocument[];
      mockStorageService.getProposalsListSnapshot.mockReturnValue([
        { id: '1', documents: mockDocs } as Proposal
      ]);

      const result = service.getDocumentsByProposalId('1');

      expect(result).toEqual(mockDocs);
      expect(mockStorageService.getProposalsListSnapshot).toHaveBeenCalled();
    });

    it('debería retornar un array vacío si la propuesta no existe', () => {
      mockStorageService.getProposalsListSnapshot.mockReturnValue([]);

      const result = service.getDocumentsByProposalId('99');

      expect(result).toEqual([]);
    });

    it('debería retornar un array vacío si la propuesta existe pero no tiene documentos definidos', () => {
      mockStorageService.getProposalsListSnapshot.mockReturnValue([
        { id: '1' } as Proposal // Sin propiedad documents
      ]);

      const result = service.getDocumentsByProposalId('1');

      expect(result).toEqual([]);
    });
  });
});
