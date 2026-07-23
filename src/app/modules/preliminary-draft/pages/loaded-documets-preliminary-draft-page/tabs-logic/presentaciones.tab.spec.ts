import { PresentacionesTabConfig } from './presentaciones.tab';
import { PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';

describe('PresentacionesTabConfig', () => {
  let mockContext: PreliminaryDraftEvaluationContext;
  let mockPreliminaryDraftService: PreliminaryDraftService;

  beforeEach(() => {
    const mockPreliminaryDraft: PreliminaryDraft = {
      preliminaryDraftId: '1',
      proposalId: 'prop-1',
      proposalData: {} as unknown as Proposal,
      evaluators: [],
      evaluations: [],
      documents: [],
      state: stateList.EN_REVISION,
      createdData: new Date(),
      isArchived: false
    };

    mockContext = {
      preliminaryDraft: mockPreliminaryDraft,
      currentUser: { id: 'u1', firstName: 'Juan', lastName: 'Perez' },
      isAdmin: false,
      isJefe: false,
      isDirector: false,
      isAssignedEvaluator: false,
      isConsejoMember: false,
      totalEvaluatorsCount: 2,
      latestPresentacionId: 'doc-presentacion-1'
    };

    mockPreliminaryDraftService = {
      calculateDocumentStatus: jest.fn().mockReturnValue(stateList.APROBADO)
    } as unknown as PreliminaryDraftService;
  });

  describe('getTableData', () => {
    it('debería mapear documentos FORMATO_C y permitir evaluar a miembros del consejo si está en revisión', () => {
      mockContext.isConsejoMember = true;
      const documents: FileDocument[] = [
        {
          id: 'doc-presentacion-1',
          name: 'presentacion.pdf',
          url: 'http://localhost',
          uploadDate: new Date(),
          type: DocumentType.FORMATO_C
        }
      ];

      const result = PresentacionesTabConfig.getTableData(documents, mockContext, mockPreliminaryDraftService);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(stateList.EN_REVISION);
      expect(result[0].allowedActions).toContain('download');
      expect(result[0].allowedActions).toContain('evaluate-presentation');
    });

    it('no debería permitir evaluar si el documento no es el más reciente o ya está evaluado', () => {
      mockContext.isConsejoMember = true;
      mockContext.preliminaryDraft.state = stateList.APROBADO; // Simulamos que ya se aprobó a nivel global

      const documents: FileDocument[] = [
        {
          id: 'doc-presentacion-1', // Es el latest
          name: 'presentacion.pdf',
          url: 'http://localhost',
          uploadDate: new Date(),
          type: DocumentType.FORMATO_C
        }
      ];

      // Añadimos una evaluación para que el cálculo interno asigne un status final
      const mockEvaluation: Evaluation = {
        id: 'ev-1', proposalId: 'p1', documentId: 'doc-presentacion-1', evaluatorId: 'c1',
        evaluatorName: 'Consejo', evaluatorRole: 'Consejo', veredict: stateList.APROBADO,
        observations: '', date: new Date()
      };
      mockContext.preliminaryDraft.evaluations = [mockEvaluation];

      const result = PresentacionesTabConfig.getTableData(documents, mockContext, mockPreliminaryDraftService);

      expect(result[0].status).toBe(stateList.APROBADO);
      expect(result[0].allowedActions).not.toContain('evaluate-presentation');
    });
  });

  describe('getHeaderButtons', () => {
    it('debería retornar un arreglo vacío si el usuario no es Jefe ni Admin', () => {
      const result = PresentacionesTabConfig.getHeaderButtons(mockContext, mockPreliminaryDraftService);
      expect(result).toHaveLength(0);
    });

    it('debería retornar el botón deshabilitado si el anteproyecto previo no está APROBADO', () => {
      mockContext.isJefe = true;

      // El anteproyecto está en revisión
      mockPreliminaryDraftService.calculateDocumentStatus = jest.fn().mockReturnValue(stateList.EN_REVISION);

      mockContext.preliminaryDraft.documents = [
        { id: 'doc-anteproyecto-1', name: 'v1.pdf', url: '', uploadDate: new Date(), type: 'Anteproyecto' as unknown as DocumentType }
      ];

      const result = PresentacionesTabConfig.getHeaderButtons(mockContext, mockPreliminaryDraftService);

      expect(result).toHaveLength(1);
      expect(result[0].disabled).toBeTruthy();
    });

    it('debería retornar el botón habilitado si el Jefe intenta cargar, el anteproyecto está aprobado y no hay procesos pendientes', () => {
      mockContext.isJefe = true;

      // El anteproyecto está Aprobado
      mockPreliminaryDraftService.calculateDocumentStatus = jest.fn().mockReturnValue(stateList.APROBADO);

      mockContext.preliminaryDraft.documents = [
        { id: 'doc-anteproyecto-1', name: 'v1.pdf', url: '', uploadDate: new Date(), type: 'Anteproyecto' as unknown as DocumentType }
      ];

      const result = PresentacionesTabConfig.getHeaderButtons(mockContext, mockPreliminaryDraftService);

      expect(result).toHaveLength(1);
      expect(result[0].disabled).toBeFalsy();
    });
  });
});
