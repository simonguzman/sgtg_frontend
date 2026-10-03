import { AnteproyectosTabConfig } from './anteproyectos.tab';
import { PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { User } from '../../../../users/interfaces/user.interface';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  firstName: 'Juan',
  lastName: 'Perez',
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Mock Proposal',
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: '1',
  proposalId: 'prop-1',
  proposalData: createMockProposal(),
  evaluators: [],
  evaluations: [],
  documents: [],
  state: stateList.EN_REVISION,
  createdData: new Date(),
  isArchived: false,
  ...overrides
} as PreliminaryDraft);

const createMockContext = (overrides: Partial<PreliminaryDraftEvaluationContext> = {}): PreliminaryDraftEvaluationContext => ({
  preliminaryDraft: createMockPreliminaryDraft(),
  currentUser: createMockUser(),
  isAdmin: false,
  isJefe: false,
  isDirector: false,
  isAssignedEvaluator: false,
  isConsejoMember: false,
  totalEvaluatorsCount: 2,
  latestAnteproyectoId: 'doc-1',
  ...overrides
});

describe('AnteproyectosTabConfig', () => {
  let mockContext: PreliminaryDraftEvaluationContext;
  let mockPreliminaryDraftService: { calculateDocumentStatus: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockContext = createMockContext();

    mockPreliminaryDraftService = {
      calculateDocumentStatus: jest.fn().mockReturnValue(stateList.EN_REVISION)
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getTableData', () => {
    it('debería mapear documentos de anteproyecto y permitir evaluar a evaluadores asignados', () => {
      mockContext.isAssignedEvaluator = true;

      const documents: FileDocument[] = [{
        id: 'doc-1',
        name: 'v1',
        url: 'http://localhost/v1.pdf',
        uploadDate: new Date(),
        type: DocumentType.ANTEPROYECTO
      } as FileDocument];

      const result = AnteproyectosTabConfig.getTableData(
        documents,
        mockContext,
        mockPreliminaryDraftService as Partial<PreliminaryDraftService> as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(stateList.EN_REVISION);
      expect(result[0].allowedActions).toContain('download');
      expect(result[0].allowedActions).toContain('evaluate');
    });

    it('no debería permitir evaluar si el usuario ya realizó la evaluación', () => {
      mockContext.isAssignedEvaluator = true;

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

      const documents: FileDocument[] = [{
        id: 'doc-1',
        name: 'v1',
        url: 'http://localhost/v1.pdf',
        uploadDate: new Date(),
        type: DocumentType.ANTEPROYECTO
      } as FileDocument];

      const result = AnteproyectosTabConfig.getTableData(
        documents,
        mockContext,
        mockPreliminaryDraftService as Partial<PreliminaryDraftService> as PreliminaryDraftService
      );

      expect(result[0].allowedActions).not.toContain('evaluate');
    });

    it('debería setear el estado a NO_APROBADO para documentos antiguos si antes estaban aprobados', () => {
      const documents: FileDocument[] = [{
        id: 'doc-old',
        name: 'old_version',
        url: 'url',
        uploadDate: new Date(),
        type: DocumentType.ANTEPROYECTO
      } as FileDocument];

      mockPreliminaryDraftService.calculateDocumentStatus.mockReturnValue(stateList.APROBADO);

      const result = AnteproyectosTabConfig.getTableData(
        documents,
        mockContext,
        mockPreliminaryDraftService as Partial<PreliminaryDraftService> as PreliminaryDraftService
      );

      expect(result[0].status).toBe(stateList.NO_APROBADO);
    });
  });

  describe('getHeaderButtons', () => {
    it('debería retornar el botón de "Asignar evaluadores" para el Jefe si no hay evaluadores', () => {
      mockContext.isJefe = true;
      mockContext.totalEvaluatorsCount = 0;

      const result = AnteproyectosTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as Partial<PreliminaryDraftService> as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('assign_evaluators');
      expect(result[0].disabled).toBeFalsy();
    });

    it('debería retornar el botón de "Evaluadores ya asignados" deshabilitado para el Jefe si ya existen', () => {
      mockContext.isJefe = true;
      mockContext.totalEvaluatorsCount = 2;

      const result = AnteproyectosTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as Partial<PreliminaryDraftService> as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('assign_evaluators');
      expect(result[0].label).toBe('Evaluadores ya asignados');
      expect(result[0].disabled).toBeTruthy();
    });

    it('debería retornar botones deshabilitados (vacíos) si el proyecto está archivado', () => {
      mockContext.preliminaryDraft.isArchived = true;

      const result = AnteproyectosTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as Partial<PreliminaryDraftService> as PreliminaryDraftService
      );

      expect(result).toHaveLength(0);
    });

    it('debería retornar el botón de "Cargar anteproyecto" bloqueado para el Director si está En Revisión', () => {
      mockContext.isDirector = true;
      mockPreliminaryDraftService.calculateDocumentStatus.mockReturnValue(stateList.EN_REVISION);

      const result = AnteproyectosTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as Partial<PreliminaryDraftService> as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('upload_document');
      expect(result[0].disabled).toBeTruthy();
    });

    it('debería retornar el botón de "Cargar anteproyecto" habilitado para el Director si el último fue Rechazado', () => {
      mockContext.isDirector = true;
      mockContext.preliminaryDraft.state = stateList.NO_APROBADO;
      mockPreliminaryDraftService.calculateDocumentStatus.mockReturnValue(stateList.NO_APROBADO);

      const result = AnteproyectosTabConfig.getHeaderButtons(
        mockContext,
        mockPreliminaryDraftService as Partial<PreliminaryDraftService> as PreliminaryDraftService
      );

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('upload_document');
      expect(result[0].disabled).toBeFalsy();
    });
  });
});
