import { TestBed } from '@angular/core/testing';
import { EvaluationsMapperService } from './evaluations-mapper.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { stateList } from '../../../../core/enums/state.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { Proposal } from '../../../../modules/proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../../../modules/preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../../../modules/thesis-work/interfaces/thesis-work.interface';

describe('EvaluationsMapperService', () => {
  let service: EvaluationsMapperService;
  let mockUserService: { getUserFullName: jest.Mock };

  beforeEach(() => {
    mockUserService = {
      getUserFullName: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluationsMapperService,
        { provide: UserService, useValue: mockUserService },
      ],
    });

    service = TestBed.inject(EvaluationsMapperService);

    // Mock de crypto.randomUUID para entornos Node/Jest
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-1234' }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Casos base y validaciones nulas', () => {
    it('debería devolver un arreglo vacío si se pasa undefined', () => {
      expect(service.processProposalEvaluations(undefined)).toEqual([]);
      expect(service.processDraftEvaluations(undefined)).toEqual([]);
      expect(service.processThesisEvaluations(undefined)).toEqual([]);
    });
  });

  describe('processProposalEvaluations()', () => {
    it('debería mapear correctamente las evaluaciones de una Propuesta', () => {
      mockUserService.getUserFullName.mockReturnValue('Dr. Juan Pérez');

      const mockProposal = {
        title: 'Propuesta de Software',
        evaluations: [{
          id: 'eval-1',
          evaluatorId: 'user-1',
          veredict: stateList.APROBADO,
          observations: 'Excelente',
          date: new Date('2024-01-01'),
        }],
        documents: []
      } as unknown as Proposal;

      const result = service.processProposalEvaluations(mockProposal);

      expect(result.length).toBe(1);
      expect(result[0].evaluatorName).toBe('Dr. Juan Pérez'); // Resolución desde UserService
      expect(result[0].documentTargetName).toBe('Propuesta de Software'); // Fallback al título
      expect(result[0].veredict).toBe(stateList.APROBADO);
    });
  });

  describe('processDraftEvaluations()', () => {
    it('debería mapear correctamente las evaluaciones de un Anteproyecto', () => {
      mockUserService.getUserFullName.mockReturnValue(''); // Simula usuario sin nombre

      const mockDraft = {
        proposalData: { title: 'Anteproyecto de IA' },
        evaluations: [{
          id: 'eval-2',
          evaluatorName: 'Evaluador Externo',
          veredict: stateList.NO_APROBADO,
          observations: 'Falta contexto',
          documentId: 'doc-1'
        }],
        documents: [{ id: 'doc-1', name: 'Documento Principal', url: 'http://doc.pdf' }]
      } as unknown as PreliminaryDraft;

      const result = service.processDraftEvaluations(mockDraft);

      expect(result[0].evaluatorName).toBe('Evaluador Externo'); // Conserva el nombre crudo si userService falla
      expect(result[0].documentTargetName).toBe('Documento Principal'); // Resolución del nombre del documento
      expect(result[0].signedDocuments.length).toBe(1); // El formato de tabla incluye el targetDocument si no hay signed
    });
  });

  describe('processThesisEvaluations()', () => {
    it('debería procesar evaluaciones de avance y corrección correctamente', () => {
      const mockThesis = {
        advances: [{ id: 'adv-1', title: 'Avance Capítulo 1' }],
        documents: [],
        evaluations: [
          { advanceId: 'adv-1', veredict: stateList.APROBADO, signedDocuments: ['http://url-cruda.pdf'] }, // Avance
          { veredict: stateList.EN_REVISION, signedDocuments: [{ name: 'Correcciones', url: 'http://corr.pdf' }] } // Corrección
        ]
      } as unknown as ThesisWork;

      const result = service.processThesisEvaluations(mockThesis);

      expect(result.length).toBe(2);

      // Evaluación de Avance
      expect(result[0].documentTargetName).toBe('Avance Capítulo 1');
      expect(result[0].signedDocuments[0].name).toBe('http://url-cruda.pdf'); // Fallback real del componente
      expect(result[0].signedDocuments[0].url).toBe('http://url-cruda.pdf');

      // Evaluación de Corrección
      expect(result[1].documentTargetName).toBe('Documentos corregidos');
      expect(result[1].signedDocuments[0].name).toBe('Correcciones');
    });

    it('debería mapear veredictos de jurados ignorando los de tipo CORRECCION', () => {
      const mockThesis = {
        sustentations: [{
          id: 'sust-1',
          assignedJurors: [{ id: 'juror-1', firstName: 'Ana', lastName: 'López' }],
          verdicts: [
            { jurorId: 'juror-1', veredict: stateList.APROBADO, evaluationDate: new Date(), attachedDocument: { name: 'Acta', url: 'url' } },
            { jurorId: 'juror-2', attachedDocument: { type: DocumentType.CORRECCION } } // Debe ignorarse
          ]
        }]
      } as unknown as ThesisWork;

      const result = service.processThesisEvaluations(mockThesis);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('verdict-juror-1-sust-1');
      expect(result[0].evaluatorRole).toBe('Jurado');
      expect(result[0].evaluatorName).toBe('Ana López');
    });

    it('debería procesar solicitudes especiales filtrando las que están EN_REVISION y aplicando formato Consejo', () => {
      const mockThesis = {
        specialRequests: [
          { id: 'req-1', requestType: 'PRORROGA_TIEMPO', status: stateList.APROBADO, requestDate: new Date() },
          { id: 'req-2', requestType: 'CANCELACION', status: stateList.EN_REVISION } // Debe ignorarse
        ]
      } as unknown as ThesisWork;

      const result = service.processThesisEvaluations(mockThesis);

      expect(result.length).toBe(1);
      expect(result[0].evaluatorRole).toBe('Consejo');
      expect(result[0].evaluatorName).toBe('Consejo de Facultad'); // Nombre exacto que asigna tu componente
      expect(result[0].documentTargetName).toBe('Solicitud Especial (Prorroga tiempo)');
    });
  });

  describe('Helper formatEvaluationsForTable (Edge cases)', () => {
    it('debería usar Formato C como nombre si es Consejo y no hay nombre de documento previo', () => {
      const mockProposal = {
        title: 'Titulo default',
        evaluations: [{ evaluatorRole: 'Consejo', veredict: stateList.APROBADO }],
        documents: [{ type: DocumentType.FORMATO_C, name: 'Formato C Oficial', url: 'url' }]
      } as unknown as Proposal;

      const result = service.processProposalEvaluations(mockProposal);

      expect(result[0].documentTargetName).toBe('Formato C Oficial');
    });

    it('debería usar crypto.randomUUID como fallback si la evaluación no tiene id', () => {
      const mockProposal = {
        evaluations: [{ veredict: stateList.APROBADO }]
      } as unknown as Proposal;

      const result = service.processProposalEvaluations(mockProposal);

      expect(result[0].id).toBe('mock-uuid-1234');
    });
  });
});
