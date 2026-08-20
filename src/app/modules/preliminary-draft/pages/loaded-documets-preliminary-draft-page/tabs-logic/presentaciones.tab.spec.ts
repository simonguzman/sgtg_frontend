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
  let mockPreliminaryDraftService: jest.Mocked<Partial<PreliminaryDraftService>>;

  beforeEach(() => {
    // 1. Construcción limpia del objeto de dominio usando Partial estricto
    const mockPreliminaryDraft: PreliminaryDraft = {
      preliminaryDraftId: '1',
      proposalId: 'prop-1',
      proposalData: { id: 'prop-1', title: 'Mock Proposal' } as Partial<Proposal> as Proposal,
      evaluators: [],
      evaluations: [],
      documents: [],
      state: stateList.EN_REVISION,
      createdData: new Date(),
      isArchived: false
    };

    // 2. Configuración del contexto base
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

    // 3. Mock estricto del servicio
    mockPreliminaryDraftService = {
      calculateDocumentStatus: jest.fn().mockReturnValue(stateList.APROBADO)
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTableData', () => {
    it('debería mapear documentos FORMATO_C y permitir evaluar a miembros del consejo si es el último doc y está en revisión', () => {
      mockContext.isConsejoMember = true;
      const documents: FileDocument[] = [
        {
          id: 'doc-presentacion-1',
          name: 'presentacion.pdf',
          url: 'http://localhost/pres.pdf',
          uploadDate: new Date(),
          type: DocumentType.FORMATO_C
        }
      ];

      const result = PresentacionesTabConfig.getTableData(
        documents,
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(stateList.EN_REVISION);
      expect(result[0].allowedActions).toContain('download');
      expect(result[0].allowedActions).toContain('evaluate-presentation');
    });

    it('debería permitir evaluar también si el usuario es Admin', () => {
      mockContext.isAdmin = true;
      const documents: FileDocument[] = [
        {
          id: 'doc-presentacion-1',
          name: 'presentacion.pdf',
          url: 'http://localhost/pres.pdf',
          uploadDate: new Date(),
          type: DocumentType.FORMATO_C
        }
      ];

      const result = PresentacionesTabConfig.getTableData(
        documents,
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result[0].allowedActions).toContain('evaluate-presentation');
    });

    it('no debería permitir evaluar si el proyecto está archivado', () => {
      mockContext.isConsejoMember = true;
      mockContext.preliminaryDraft.isArchived = true;

      const documents: FileDocument[] = [{
        id: 'doc-presentacion-1',
        name: 'presentacion.pdf',
        url: 'url',
        uploadDate: new Date(),
        type: DocumentType.FORMATO_C
      }];

      const result = PresentacionesTabConfig.getTableData(
        documents,
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result[0].allowedActions).not.toContain('evaluate-presentation');
    });

    it('debería setear el estado a APROBADO globalmente si el documento es el último y el anteproyecto ya fue aprobado', () => {
      mockContext.isConsejoMember = true;
      mockContext.preliminaryDraft.state = stateList.APROBADO;

      const documents: FileDocument[] = [{
        id: 'doc-presentacion-1',
        name: 'presentacion.pdf',
        url: 'url',
        uploadDate: new Date(),
        type: DocumentType.FORMATO_C
      }];

      // Simulamos que el status individual no es NO_APROBADO
      const result = PresentacionesTabConfig.getTableData(
        documents,
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result[0].status).toBe(stateList.APROBADO);
      // No debería permitir evaluar porque el estado general ya es aprobado, no EN_REVISION
      expect(result[0].allowedActions).not.toContain('evaluate-presentation');
    });
  });

  describe('getHeaderButtons', () => {
    it('debería retornar un arreglo vacío si el proyecto está archivado', () => {
      mockContext.preliminaryDraft.isArchived = true;
      mockContext.isJefe = true; // Incluso si es Jefe, si está archivado no muestra botones

      const result = PresentacionesTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result).toHaveLength(0);
    });

    it('debería retornar un arreglo vacío si el usuario no es Jefe ni Admin', () => {
      mockContext.isJefe = false;
      mockContext.isAdmin = false;

      const result = PresentacionesTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result).toHaveLength(0);
    });

    it('debería retornar el botón deshabilitado si el anteproyecto base NO está APROBADO', () => {
      mockContext.isJefe = true;

      // El documento de anteproyecto existe pero el servicio calcula que está En Revisión
      mockPreliminaryDraftService.calculateDocumentStatus = jest.fn().mockReturnValue(stateList.EN_REVISION);
      mockContext.preliminaryDraft.documents = [
        {
          id: 'doc-anteproyecto-1',
          name: 'v1.pdf',
          url: '',
          uploadDate: new Date(),
          type: DocumentType.ANTEPROYECTO
        }
      ];

      const result = PresentacionesTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('upload_document');
      expect(result[0].disabled).toBeTruthy();
    });

    it('debería retornar el botón deshabilitado si ya hay una presentación pendiente de revisión (sin evaluaciones)', () => {
      mockContext.isJefe = true;

      // Anteproyecto está Aprobado
      mockPreliminaryDraftService.calculateDocumentStatus = jest.fn().mockReturnValue(stateList.APROBADO);

      // Tenemos el anteproyecto y una presentación reciente cargada
      mockContext.preliminaryDraft.documents = [
        { id: 'doc-anteproyecto-1', name: 'v1.pdf', url: '', uploadDate: new Date(), type: DocumentType.ANTEPROYECTO },
        { id: 'doc-presentacion-1', name: 'pres.pdf', url: '', uploadDate: new Date(), type: DocumentType.FORMATO_C }
      ];
      // Aún no hay evaluaciones para la presentación, por ende sigue "En Revisión"
      mockContext.preliminaryDraft.evaluations = [];

      const result = PresentacionesTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].disabled).toBeTruthy();
    });

    it('debería retornar el botón deshabilitado si el Anteproyecto en general ya tiene un estado final (APROBADO o NO_APROBADO)', () => {
      mockContext.isJefe = true;
      mockContext.preliminaryDraft.state = stateList.APROBADO; // Proceso finalizado
      mockPreliminaryDraftService.calculateDocumentStatus = jest.fn().mockReturnValue(stateList.APROBADO);

      const result = PresentacionesTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].disabled).toBeTruthy();
    });

    it('debería retornar el botón habilitado para el Jefe si el anteproyecto está aprobado, no está finalizado globalmente, y no hay presentaciones pendientes', () => {
      mockContext.isJefe = true;
      mockContext.preliminaryDraft.state = stateList.EN_REVISION; // El proceso global sigue abierto

      mockPreliminaryDraftService.calculateDocumentStatus = jest.fn().mockReturnValue(stateList.APROBADO);

      // Existe el anteproyecto base
      mockContext.preliminaryDraft.documents = [
        { id: 'doc-anteproyecto-1', name: 'v1.pdf', url: '', uploadDate: new Date(), type: DocumentType.ANTEPROYECTO }
      ];

      const result = PresentacionesTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].disabled).toBeFalsy();
    });
  });
});
