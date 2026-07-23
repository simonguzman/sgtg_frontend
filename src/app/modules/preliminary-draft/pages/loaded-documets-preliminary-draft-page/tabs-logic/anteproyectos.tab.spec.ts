import { AnteproyectosTabConfig } from './anteproyectos.tab';
import { PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';

describe('AnteproyectosTabConfig', () => {
  let mockContext: PreliminaryDraftEvaluationContext;
  let mockPreliminaryDraftService: PreliminaryDraftService; // Tipado estricto del servicio

  beforeEach(() => {
    // 1. Construimos un objeto PreliminaryDraft válido con todas sus propiedades obligatorias
    const mockPreliminaryDraft: PreliminaryDraft = {
      preliminaryDraftId: '1',
      proposalId: 'prop-1',
      proposalData: {} as unknown as Proposal, // Aserción segura sin usar 'any'
      evaluators: [],
      evaluations: [],
      documents: [],
      state: stateList.EN_REVISION,
      createdData: new Date(),
      isArchived: false
    };

    // 2. Asignamos el objeto tipado al contexto
    mockContext = {
      preliminaryDraft: mockPreliminaryDraft,
      currentUser: { id: 'u1', firstName: 'Juan', lastName: 'Perez' },
      isAdmin: false,
      isJefe: false,
      isDirector: false,
      isAssignedEvaluator: false,
      isConsejoMember: false,
      totalEvaluatorsCount: 2,
      latestAnteproyectoId: 'doc-1'
    };

    // 3. Mockeamos el servicio utilizando aserción cruzada para satisfacer a TypeScript
    mockPreliminaryDraftService = {
      calculateDocumentStatus: jest.fn().mockReturnValue(stateList.EN_REVISION)
    } as unknown as PreliminaryDraftService;
  });

  describe('getTableData', () => {
    it('debería mapear documentos de anteproyecto y permitir evaluar a evaluadores asignados', () => {
      mockContext.isAssignedEvaluator = true;

      // Construimos un FileDocument con todas sus propiedades requeridas
      const documents: FileDocument[] = [
        {
          id: 'doc-1',
          name: 'v1.pdf',
          url: 'http://localhost/v1.pdf',
          uploadDate: new Date(),
          // Forzamos el string al enum por si la lógica interna compara con la cadena 'Anteproyecto'
          type: 'Anteproyecto' as unknown as DocumentType
        }
      ];

      const result = AnteproyectosTabConfig.getTableData(documents, mockContext, mockPreliminaryDraftService);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(stateList.EN_REVISION);
      expect(result[0].allowedActions).toContain('download');
      expect(result[0].allowedActions).toContain('evaluate');
    });

    it('no debería permitir evaluar si el usuario ya realizó la evaluación', () => {
      mockContext.isAssignedEvaluator = true;

      // Construimos una Evaluation completa para el mock
      const mockEvaluation: Evaluation = {
        id: 'ev-1',
        proposalId: 'prop-1',
        documentId: 'doc-1',
        evaluatorId: 'u1',
        evaluatorName: 'Juan Perez',
        evaluatorRole: 'Evaluador Asignado',
        veredict: stateList.EN_REVISION,
        observations: 'Observaciones de prueba',
        date: new Date()
      };

      mockContext.preliminaryDraft.evaluations = [mockEvaluation];

      const documents: FileDocument[] = [
        {
          id: 'doc-1',
          name: 'v1.pdf',
          url: 'http://localhost/v1.pdf',
          uploadDate: new Date(),
          type: 'Anteproyecto' as unknown as DocumentType
        }
      ];

      const result = AnteproyectosTabConfig.getTableData(documents, mockContext, mockPreliminaryDraftService);

      expect(result[0].allowedActions).not.toContain('evaluate');
    });
  });

  describe('getHeaderButtons', () => {
    it('debería retornar el botón de "Asignar evaluadores" para el Jefe si no hay evaluadores', () => {
      mockContext.isJefe = true;
      mockContext.totalEvaluatorsCount = 0;

      const result = AnteproyectosTabConfig.getHeaderButtons(mockContext, mockPreliminaryDraftService);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('assign_evaluators');
      expect(result[0].disabled).toBeFalsy();
    });

    it('debería retornar botones deshabilitados si el proyecto está archivado', () => {
      // TypeScript ya reconoce 'isArchived' porque mockContext.preliminaryDraft cumple con 'Archivable'
      mockContext.preliminaryDraft.isArchived = true;
      const result = AnteproyectosTabConfig.getHeaderButtons(mockContext, mockPreliminaryDraftService);

      expect(result).toHaveLength(0);
    });
  });
});
