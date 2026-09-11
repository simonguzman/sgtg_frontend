import { TestBed } from '@angular/core/testing';
import { ProjectDataMapperService } from './project-data-mapper.service';
import { UserService } from '../../users/services/user.service';

import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { stateList } from '../../../core/enums/state.enum';

import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';

// Importamos los helpers como módulos para poder espiarlos
import * as academicPeriodHelper from '../helpers/academic-period.helper';
import * as projectStatusHelper from '../helpers/project-status.helper';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'usr-default',
  firstName: 'Nombre',
  lastName: 'Apellido',
  email: 'test@unicauca.edu.co',
  roles: [],
  ...overrides
} as User);

const createMockEvaluation = (overrides: Partial<Evaluation> = {}): Evaluation => ({
  id: 'eval-1',
  proposalId: 'prop-1',
  evaluatorId: 'usr-eval',
  evaluatorName: 'Evaluador',
  evaluatorRole: 'Evaluador',
  veredict: stateList.APROBADO,
  observations: '',
  date: new Date(),
  ...overrides
} as Evaluation);

const createMockDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'documento.pdf',
  url: 'http://test.com/doc.pdf',
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  type: DocumentType.ANTEPROYECTO,
  ...overrides
} as FileDocument);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-123',
  title: 'Default Title',
  state: stateList.EN_REVISION, // FIX: Usamos un estado válido del enum
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  director: createMockUser(),
  authors: [],
  evaluations: [],
  documents: [],
  isArchived: false,
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-456',
  proposalId: 'prop-123',
  state: stateList.APROBADO,
  isArchived: false,
  proposalData: createMockProposal(),
  evaluators: [],
  evaluations: [],
  documents: [],
  createdData: new Date(),
  ...overrides
} as PreliminaryDraft);

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'thesis-999',
  state: 'FINALIZADO' as ThesisWork['state'],
  isArchived: false,
  preliminaryDraftData: createMockPreliminaryDraft(),
  createdDate: new Date(),
  ...overrides
} as ThesisWork);


// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ProjectDataMapperService', () => {
  let service: ProjectDataMapperService;

  // 🔹 REFACTOR: Tipado estricto para el mock
  let mockUserService: { formatFullName: jest.Mock<string, [User]> };

  let resolveAcademicPeriodSpy: jest.SpyInstance;
  let mapStateToProjectStatusSpy: jest.SpyInstance;

  const FIXED_SYSTEM_DATE = new Date('2026-08-20T12:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_SYSTEM_DATE.getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUserService = {
      formatFullName: jest.fn((user: User) => `${user.firstName} ${user.lastName}`),
    };

    resolveAcademicPeriodSpy = jest.spyOn(academicPeriodHelper, 'resolveAcademicPeriod')
      .mockReturnValue('2026-1');

    mapStateToProjectStatusSpy = jest.spyOn(projectStatusHelper, 'mapStateToProjectStatus')
      .mockReturnValue(ProjectStatus.EN_DESARROLLO);

    TestBed.configureTestingModule({
      providers: [
        ProjectDataMapperService,
        { provide: UserService, useValue: mockUserService },
      ],
    });

    service = TestBed.inject(ProjectDataMapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('mapProposal', () => {
    it('debe mapear una propuesta completa a RawProjectData correctamente con deadlineStatus nulo si no hay evaluaciones', () => {
      const mockUser = createMockUser({ id: 'usr-1', firstName: 'Ana', lastName: 'Pérez' });
      const mockProposal = createMockProposal({
        id: 'prop-123',
        title: 'Sistema de Gestión',
        state: stateList.EN_REVISION, // FIX: Usamos un estado real
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        director: mockUser,
        isArchived: false,
        evaluations: []
      });

      const result = service.mapProposal(mockProposal);

      expect(resolveAcademicPeriodSpy).toHaveBeenCalled();
      expect(mapStateToProjectStatusSpy).toHaveBeenCalledWith(stateList.EN_REVISION);
      expect(mockUserService.formatFullName).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual({
        id: 'prop-123',
        title: 'Sistema de Gestión',
        stage: ProjectStage.PROPUESTA,
        status: ProjectStatus.EN_DESARROLLO,
        originalState: stateList.EN_REVISION, // FIX
        period: '2026-1',
        directorId: 'usr-1',
        directorName: 'Ana Pérez',
        registrationDate: new Date('2026-03-01T00:00:00.000Z'),
        isArchived: false,
        deadlineStatus: null
      });
    });

    it('debe extraer el deadlineStatus correctamente de la evaluación más reciente (índice 0)', () => {
      const mockProposal = createMockProposal({
        evaluations: [
          createMockEvaluation({ deadlineStatus: EvaluationDeadlineStatus.DELAYED }),
          createMockEvaluation({ deadlineStatus: EvaluationDeadlineStatus.ON_TIME })
        ]
      });

      const result = service.mapProposal(mockProposal);
      expect(result.deadlineStatus).toBe(EvaluationDeadlineStatus.DELAYED);
    });

    it('debe manejar valores por defecto cuando faltan datos esenciales y usar la fecha del sistema', () => {
      const mockProposal = createMockProposal({
        id: undefined,
        title: 'Propuesta sin director',
        state: stateList.EN_DESARROLLO, // FIX: Reemplazo del falso 'BORRADOR'
        createdAt: undefined,
        director: undefined,
        isArchived: true,
      });

      const result = service.mapProposal(mockProposal);

      expect(result.id).toBe('');
      expect(result.directorId).toBe('sin-director');
      expect(result.directorName).toBe('Sin Asignar');
      expect(result.registrationDate).toEqual(FIXED_SYSTEM_DATE);
      expect(mockUserService.formatFullName).not.toHaveBeenCalled();
    });
  });

  describe('mapPreliminaryDraft', () => {
    it('debe mapear el estado ON_TIME cuando el documento relevante tiene evaluaciones a tiempo', () => {
      const mockDraft = createMockPreliminaryDraft({
        preliminaryDraftId: 'draft-456',
        state: stateList.APROBADO,
        documents: [createMockDocument({ id: 'doc-1', type: DocumentType.ANTEPROYECTO })],
        evaluations: [createMockEvaluation({ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.ON_TIME })]
      });

      const result = service.mapPreliminaryDraft(mockDraft);

      expect(result.id).toBe('draft-456');
      expect(result.deadlineStatus).toBe(EvaluationDeadlineStatus.ON_TIME);
    });

    it('debe mapear el estado DELAYED si al menos una evaluación del documento relevante está retrasada', () => {
      const mockDraft = createMockPreliminaryDraft({
        documents: [createMockDocument({ id: 'doc-2', type: DocumentType.CORRECCION })],
        evaluations: [
          createMockEvaluation({ documentId: 'doc-2', deadlineStatus: EvaluationDeadlineStatus.ON_TIME }),
          createMockEvaluation({ documentId: 'doc-2', deadlineStatus: EvaluationDeadlineStatus.DELAYED })
        ]
      });

      const result = service.mapPreliminaryDraft(mockDraft);
      expect(result.deadlineStatus).toBe(EvaluationDeadlineStatus.DELAYED);
    });

    it('debe retornar deadlineStatus null si no hay evaluaciones para el documento relevante', () => {
      const mockDraft = createMockPreliminaryDraft({
        documents: [createMockDocument({ id: 'doc-3', type: DocumentType.ANTEPROYECTO })],
        evaluations: [createMockEvaluation({ documentId: 'otro-doc', deadlineStatus: EvaluationDeadlineStatus.ON_TIME })]
      });

      const result = service.mapPreliminaryDraft(mockDraft);
      expect(result.deadlineStatus).toBeNull();
    });

    it('debe retornar deadlineStatus null si no se encuentra un documento tipo ANTEPROYECTO o CORRECCION', () => {
      const mockDraft = createMockPreliminaryDraft({
        documents: [createMockDocument({ id: 'doc-4', type: DocumentType.FORMATO_C })],
        evaluations: [createMockEvaluation({ documentId: 'doc-4', deadlineStatus: EvaluationDeadlineStatus.DELAYED })]
      });

      const result = service.mapPreliminaryDraft(mockDraft);
      expect(result.deadlineStatus).toBeNull();
    });

    it('debe usar fallback de título y fecha proveniente de proposalData si createdData no existe', () => {
      const mockDraft = createMockPreliminaryDraft({
        preliminaryDraftId: 'draft-789',
        createdData: undefined,
        proposalData: createMockProposal({
          title: 'Título desde propuesta',
          createdAt: new Date('2026-01-10T00:00:00.000Z'),
        }),
      });

      const result = service.mapPreliminaryDraft(mockDraft);

      expect(result.title).toBe('Título desde propuesta');
      expect(result.registrationDate).toEqual(new Date('2026-01-10T00:00:00.000Z'));
    });
  });

  describe('mapThesisWork', () => {
    it('debe mapear un trabajo de grado correctamente y forzar deadlineStatus a null', () => {
      const mockUser = createMockUser({ id: 'usr-3', firstName: 'Lucía', lastName: 'Torres' });
      const mockThesis = createMockThesisWork({
        thesisWorkId: 'thesis-999',
        state: 'FINALIZADO' as ThesisWork['state'],
        createdDate: new Date('2026-05-01T00:00:00.000Z'),
        isArchived: false,
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({
            title: 'Tesis de Big Data',
            director: mockUser,
          }),
        }),
      });

      const result = service.mapThesisWork(mockThesis);

      expect(result.id).toBe('thesis-999');
      expect(result.stage).toBe(ProjectStage.TRABAJO_GRADO);
      expect(result.directorId).toBe('usr-3');
      expect(result.directorName).toBe('Lucía Torres');
      expect(result.deadlineStatus).toBeNull();
    });

    it('debe manejar nulos y defaults cuando la tesis carece de estructuras anidadas', () => {
      const mockThesis = createMockThesisWork({
        thesisWorkId: 'thesis-empty',
        state: 'EN_CURSO' as ThesisWork['state'],
        createdDate: undefined,
        preliminaryDraftData: undefined,
      });

      const result = service.mapThesisWork(mockThesis);

      expect(result.title).toBe('Sin Título');
      expect(result.directorId).toBe('sin-director');
      expect(result.directorName).toBe('Sin Asignar');
      expect(result.registrationDate).toEqual(FIXED_SYSTEM_DATE);
      expect(result.deadlineStatus).toBeNull();
    });
  });
});
