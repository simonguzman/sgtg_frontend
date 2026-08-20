import { TestBed } from '@angular/core/testing';
import { ProjectDataMapperService } from './project-data-mapper.service';
import { UserService } from '../../users/services/user.service';

import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';

import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';

// Importamos los helpers como módulos para poder espiarlos
import * as academicPeriodHelper from '../helpers/academic-period.helper';
import * as projectStatusHelper from '../helpers/project-status.helper';

describe('ProjectDataMapperService', () => {
  let service: ProjectDataMapperService;
  let mockUserService: Partial<UserService>;

  let resolveAcademicPeriodSpy: jest.SpyInstance;
  let mapStateToProjectStatusSpy: jest.SpyInstance;

  const FIXED_SYSTEM_DATE = new Date('2026-08-20T12:00:00.000Z');

  beforeAll(() => {
    // Congelamos el tiempo pasando el timestamp numérico
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_SYSTEM_DATE.getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
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
  });

  describe('mapProposal', () => {
    it('debe mapear una propuesta completa a RawProjectData correctamente con deadlineStatus nulo si no hay evaluaciones', () => {
      const mockUser = { id: 'usr-1', firstName: 'Ana', lastName: 'Pérez' } as User;
      const mockProposal: Proposal = {
        id: 'prop-123',
        title: 'Sistema de Gestión',
        state: 'PENDIENTE',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        director: mockUser,
        isArchived: false,
        evaluations: []
      } as unknown as Proposal;

      const result = service.mapProposal(mockProposal);

      expect(resolveAcademicPeriodSpy).toHaveBeenCalled();
      expect(mapStateToProjectStatusSpy).toHaveBeenCalledWith('PENDIENTE');
      expect(mockUserService.formatFullName).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual({
        id: 'prop-123',
        title: 'Sistema de Gestión',
        stage: ProjectStage.PROPUESTA,
        status: ProjectStatus.EN_DESARROLLO,
        originalState: 'PENDIENTE',
        period: '2026-1',
        directorId: 'usr-1',
        directorName: 'Ana Pérez',
        registrationDate: new Date('2026-03-01T00:00:00.000Z'),
        isArchived: false,
        deadlineStatus: null
      });
    });

    it('debe extraer el deadlineStatus correctamente de la evaluación más reciente (índice 0)', () => {
      const mockProposal: Proposal = {
        title: 'Propuesta testeada',
        evaluations: [
          { deadlineStatus: EvaluationDeadlineStatus.DELAYED },
          { deadlineStatus: EvaluationDeadlineStatus.ON_TIME }
        ]
      } as unknown as Proposal;

      const result = service.mapProposal(mockProposal);
      expect(result.deadlineStatus).toBe(EvaluationDeadlineStatus.DELAYED);
    });

    it('debe manejar valores por defecto cuando faltan datos esenciales y usar la fecha del sistema', () => {
      const mockProposal: Proposal = {
        title: 'Propuesta sin director',
        state: 'BORRADOR',
        createdAt: undefined,
        director: undefined,
        isArchived: true,
      } as unknown as Proposal;

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
      const mockDraft: PreliminaryDraft = {
        preliminaryDraftId: 'draft-456',
        state: 'APROBADO',
        documents: [{ id: 'doc-1', type: DocumentType.ANTEPROYECTO }],
        evaluations: [{ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.ON_TIME } as Evaluation]
      } as unknown as PreliminaryDraft;

      const result = service.mapPreliminaryDraft(mockDraft);

      expect(result.id).toBe('draft-456');
      expect(result.deadlineStatus).toBe(EvaluationDeadlineStatus.ON_TIME);
    });

    it('debe mapear el estado DELAYED si al menos una evaluación del documento relevante está retrasada', () => {
      const mockDraft: PreliminaryDraft = {
        documents: [{ id: 'doc-2', type: DocumentType.CORRECCION }],
        evaluations: [
          { documentId: 'doc-2', deadlineStatus: EvaluationDeadlineStatus.ON_TIME },
          { documentId: 'doc-2', deadlineStatus: EvaluationDeadlineStatus.DELAYED }
        ]
      } as unknown as PreliminaryDraft;

      const result = service.mapPreliminaryDraft(mockDraft);
      expect(result.deadlineStatus).toBe(EvaluationDeadlineStatus.DELAYED);
    });

    it('debe retornar deadlineStatus null si no hay evaluaciones para el documento relevante', () => {
      const mockDraft: PreliminaryDraft = {
        documents: [{ id: 'doc-3', type: DocumentType.ANTEPROYECTO }],
        evaluations: [{ documentId: 'otro-doc', deadlineStatus: EvaluationDeadlineStatus.ON_TIME }]
      } as unknown as PreliminaryDraft;

      const result = service.mapPreliminaryDraft(mockDraft);
      expect(result.deadlineStatus).toBeNull();
    });

    it('debe retornar deadlineStatus null si no se encuentra un documento tipo ANTEPROYECTO o CORRECCION', () => {
      const mockDraft: PreliminaryDraft = {
        documents: [{ id: 'doc-4', type: 'OTRO_TIPO' as any }],
        evaluations: [{ documentId: 'doc-4', deadlineStatus: EvaluationDeadlineStatus.DELAYED }]
      } as unknown as PreliminaryDraft;

      const result = service.mapPreliminaryDraft(mockDraft);
      expect(result.deadlineStatus).toBeNull();
    });

    it('debe usar fallback de título y fecha proveniente de proposalData si createdData no existe', () => {
      const mockDraft: PreliminaryDraft = {
        preliminaryDraftId: 'draft-789',
        state: 'REVISION',
        createdData: undefined,
        proposalData: {
          title: 'Título desde propuesta',
          createdAt: new Date('2026-01-10T00:00:00.000Z'),
        },
      } as unknown as PreliminaryDraft;

      const result = service.mapPreliminaryDraft(mockDraft);

      expect(result.title).toBe('Título desde propuesta');
      expect(result.registrationDate).toEqual(new Date('2026-01-10T00:00:00.000Z'));
    });
  });

  describe('mapThesisWork', () => {
    it('debe mapear un trabajo de grado correctamente y forzar deadlineStatus a null', () => {
      const mockUser = { id: 'usr-3', firstName: 'Lucía', lastName: 'Torres' } as User;
      const mockThesis: ThesisWork = {
        thesisWorkId: 'thesis-999',
        state: 'FINALIZADO',
        createdDate: new Date('2026-05-01T00:00:00.000Z'),
        isArchived: false,
        preliminaryDraftData: {
          proposalData: {
            title: 'Tesis de Big Data',
            director: mockUser,
          },
        },
      } as unknown as ThesisWork;

      const result = service.mapThesisWork(mockThesis);

      expect(result.id).toBe('thesis-999');
      expect(result.stage).toBe(ProjectStage.TRABAJO_GRADO);
      expect(result.directorId).toBe('usr-3');
      expect(result.directorName).toBe('Lucía Torres');
      expect(result.deadlineStatus).toBeNull();
    });

    it('debe manejar nulos y defaults cuando la tesis carece de estructuras anidadas', () => {
      const mockThesis: ThesisWork = {
        thesisWorkId: 'thesis-empty',
        state: 'EN_CURSO',
        createdDate: undefined,
        preliminaryDraftData: undefined,
      } as unknown as ThesisWork;

      const result = service.mapThesisWork(mockThesis);

      expect(result.title).toBe('Sin Título');
      expect(result.directorId).toBe('sin-director');
      expect(result.directorName).toBe('Sin Asignar');
      expect(result.registrationDate).toEqual(FIXED_SYSTEM_DATE);
      expect(result.deadlineStatus).toBeNull();
    });
  });
});
