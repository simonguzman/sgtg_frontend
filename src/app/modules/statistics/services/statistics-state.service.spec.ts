import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { StatisticsStateService } from '../../statistics/services/statistics-state.service';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { ProjectDataMapperService } from '../../statistics/services/project-data-mapper.service';

import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { RawProjectData } from '../../statistics/interfaces/rawProjectData.interface';
import { StatisticsFilters } from '../../statistics/interfaces/statisticsFilters.interface';

import { ProjectStage } from '../../statistics/enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

describe('StatisticsStateService', () => {
  let service: StatisticsStateService;

  // Signals reactivos con tipado estricto
  let mockProposalsSignal: WritableSignal<Proposal[]>;
  let mockDraftsSignal: WritableSignal<PreliminaryDraft[]>;
  let mockThesisSignal: WritableSignal<ThesisWork[]>;
  let mockMapper: Partial<ProjectDataMapperService>;

  beforeEach(() => {
    mockProposalsSignal = signal<Proposal[]>([]);
    mockDraftsSignal = signal<PreliminaryDraft[]>([]);
    mockThesisSignal = signal<ThesisWork[]>([]);

    const mockProposalService: Partial<ProposalService> = {
      allProposals: mockProposalsSignal,
    };
    const mockPreliminaryDraftService: Partial<PreliminaryDraftService> = {
      allPreliminaryDrafts: mockDraftsSignal,
    };
    const mockThesisWorkService: Partial<ThesisWorkService> = {
      allThesisWorks: mockThesisSignal,
    };

    mockMapper = {
      mapProposal: jest.fn((p: Proposal): RawProjectData => p as unknown as RawProjectData),
      mapPreliminaryDraft: jest.fn((d: PreliminaryDraft): RawProjectData => d as unknown as RawProjectData),
      mapThesisWork: jest.fn((t: ThesisWork): RawProjectData => t as unknown as RawProjectData),
    };

    TestBed.configureTestingModule({
      providers: [
        StatisticsStateService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: ThesisWorkService, useValue: mockThesisWorkService },
        { provide: ProjectDataMapperService, useValue: mockMapper },
      ],
    });

    service = TestBed.inject(StatisticsStateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Estado inicial y gestión de filtros', () => {
    it('debe inicializar con los filtros por defecto (incluyendo deadlineFilter)', () => {
      const expectedInitialState: StatisticsFilters = {
        stage: null,
        period: null,
        directorId: null,
        archiveStatus: 'ACTIVE',
        deadlineFilter: 'ALL',
      };

      expect(service.currentFilters()).toEqual(expectedInitialState);
    });

    it('debe actualizar los filtros parcialmente manteniendo el resto', () => {
      const updatePayload: Partial<StatisticsFilters> = {
        stage: ProjectStage.PROPUESTA,
      };

      service.updateFilters(updatePayload);

      expect(service.currentFilters()).toEqual({
        stage: ProjectStage.PROPUESTA,
        period: null,
        directorId: null,
        archiveStatus: 'ACTIVE',
        deadlineFilter: 'ALL',
      });
    });

    it('debe limpiar los filtros volviendo al estado por defecto', () => {
      service.updateFilters({
        period: '2025-1',
        archiveStatus: 'ALL',
        deadlineFilter: EvaluationDeadlineStatus.DELAYED,
      });

      service.clearFilters();

      expect(service.currentFilters()).toEqual({
        stage: null,
        period: null,
        directorId: null,
        archiveStatus: 'ACTIVE',
        deadlineFilter: 'ALL',
      });
    });
  });

  describe('Computeds de Datos base y Opciones', () => {
    const mockProject1: RawProjectData = {
      id: '1',
      title: 'Desarrollo de sistema web',
      status: ProjectStatus.EN_DESARROLLO,
      registrationDate: new Date('2025-02-15'),
      period: '2025-1',
      directorId: 'dir-1',
      directorName: 'Juan Pérez',
      originalState: stateList.EN_REVISION,
      stage: ProjectStage.PROPUESTA,
      isArchived: false,
      deadlineStatus: EvaluationDeadlineStatus.ON_TIME,
    };

    const mockProject2: RawProjectData = {
      id: '2',
      title: 'Implementación de IA',
      status: ProjectStatus.APROBADO,
      registrationDate: new Date('2026-03-10'),
      period: '2026-1',
      directorId: 'dir-2',
      directorName: 'Ana Gómez',
      originalState: stateList.APROBADO,
      stage: ProjectStage.ANTEPROYECTO,
      isArchived: false,
      deadlineStatus: EvaluationDeadlineStatus.DELAYED,
    };

    const mockProject3: RawProjectData = {
      id: '3',
      title: 'Aplicación móvil de salud',
      status: ProjectStatus.EN_DESARROLLO,
      registrationDate: new Date('2025-05-20'),
      period: '2025-1',
      directorId: 'dir-1',
      directorName: 'Juan Pérez',
      originalState: stateList.EN_REVISION,
      stage: ProjectStage.TRABAJO_GRADO,
      isArchived: false,
      deadlineStatus: null,
    };

    const mockProjectNoDirector: RawProjectData = {
      id: '4',
      title: 'Proyecto sin asignar',
      status: ProjectStatus.EN_DESARROLLO,
      registrationDate: new Date('2024-11-05'),
      period: '2024-2',
      directorId: 'sin-director',
      directorName: 'Sin Asignar',
      originalState: stateList.EN_REVISION,
      stage: ProjectStage.ANTEPROYECTO,
      isArchived: false,
      deadlineStatus: null,
    };

    beforeEach(() => {
      mockProposalsSignal.set([mockProject1 as unknown as Proposal]);
      mockDraftsSignal.set([
        mockProject2 as unknown as PreliminaryDraft,
        mockProjectNoDirector as unknown as PreliminaryDraft,
      ]);
      mockThesisSignal.set([mockProject3 as unknown as ThesisWork]);
    });

    it('rawData: debe combinar y mapear los datos de los 3 servicios', () => {
      const data: RawProjectData[] = service.rawData();
      expect(data).toHaveLength(4);
      expect(mockMapper.mapProposal).toHaveBeenCalledTimes(1);
      expect(mockMapper.mapPreliminaryDraft).toHaveBeenCalledTimes(2);
      expect(mockMapper.mapThesisWork).toHaveBeenCalledTimes(1);
    });

    it('periodsOptions: debe extraer periodos únicos y ordenarlos descendentemente', () => {
      const periods: string[] = service.periodsOptions();
      expect(periods).toEqual(['2026-1', '2025-1', '2024-2']);
    });

    it('directorsOptions: debe extraer directores únicos ignorando "sin-director"', () => {
      const directors = service.directorsOptions();
      expect(directors).toHaveLength(2);
      expect(directors).toEqual([
        { id: 'dir-1', name: 'Juan Pérez' },
        { id: 'dir-2', name: 'Ana Gómez' },
      ]);
    });
  });

  describe('filteredData (Lógica de filtrado)', () => {
    const activeProject: RawProjectData = {
      id: 'p1',
      title: 'Proyecto Activo On Time',
      status: ProjectStatus.EN_DESARROLLO,
      registrationDate: new Date('2026-02-01'),
      originalState: stateList.EN_REVISION,
      stage: ProjectStage.PROPUESTA,
      period: '2026-1',
      directorId: 'd1',
      directorName: 'Carlos',
      isArchived: false,
      deadlineStatus: EvaluationDeadlineStatus.ON_TIME,
    };

    const archivedProject: RawProjectData = {
      id: 'p2',
      title: 'Proyecto Archivado Delayed',
      status: ProjectStatus.APROBADO,
      registrationDate: new Date('2025-08-15'),
      originalState: stateList.APROBADO,
      stage: ProjectStage.ANTEPROYECTO,
      period: '2025-2',
      directorId: 'd2',
      directorName: 'María',
      isArchived: true,
      deadlineStatus: EvaluationDeadlineStatus.DELAYED,
    };

    const unevaluatedProject: RawProjectData = {
      id: 'p3',
      title: 'Proyecto Sin Evaluar',
      status: ProjectStatus.EN_DESARROLLO,
      registrationDate: new Date('2026-01-10'),
      originalState: stateList.EN_REVISION,
      stage: ProjectStage.PROPUESTA,
      period: '2026-1',
      directorId: 'd1',
      directorName: 'Carlos',
      isArchived: false,
      deadlineStatus: null,
    };

    const evaluatedProject: RawProjectData = {
      id: 'p4',
      title: 'Proyecto Evaluado Excluido',
      status: ProjectStatus.EN_DESARROLLO,
      registrationDate: new Date('2026-01-01'),
      originalState: stateList.EVALUADO,
      stage: ProjectStage.PROPUESTA,
      period: '2026-1',
      directorId: 'd1',
      directorName: 'Carlos',
      isArchived: false,
      deadlineStatus: EvaluationDeadlineStatus.ON_TIME,
    };

    beforeEach(() => {
      mockProposalsSignal.set([
        activeProject as unknown as Proposal,
        archivedProject as unknown as Proposal,
        unevaluatedProject as unknown as Proposal,
        evaluatedProject as unknown as Proposal,
      ]);
    });

    it('debe excluir siempre proyectos cuyo originalState sea EVALUADO', () => {
      service.updateFilters({ archiveStatus: 'ALL', deadlineFilter: 'ALL' });
      const resultIds = service.filteredData().map((p) => p.id);

      expect(resultIds).not.toContain('p4');
    });

    it('debe filtrar correctamente por archiveStatus', () => {
      // Estado por defecto: 'ACTIVE'
      expect(service.filteredData().map((p) => p.id)).toEqual(['p1', 'p3']);

      // Cambio a 'ARCHIVED'
      service.updateFilters({ archiveStatus: 'ARCHIVED' });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p2']);

      // Cambio a 'ALL'
      service.updateFilters({ archiveStatus: 'ALL' });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    });

    it('debe filtrar correctamente por deadlineFilter', () => {
      service.updateFilters({ archiveStatus: 'ALL' });

      // ALL
      service.updateFilters({ deadlineFilter: 'ALL' });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);

      // NOT_EVALUATED (donde deadlineStatus es null)
      service.updateFilters({ deadlineFilter: 'NOT_EVALUATED' });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p3']);

      // ON_TIME
      service.updateFilters({ deadlineFilter: EvaluationDeadlineStatus.ON_TIME });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p1']);

      // DELAYED
      service.updateFilters({ deadlineFilter: EvaluationDeadlineStatus.DELAYED });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p2']);
    });

    it('debe aplicar filtros combinados de etapa, periodo, director y estado de entrega', () => {
      service.updateFilters({
        archiveStatus: 'ALL',
        stage: ProjectStage.PROPUESTA,
        period: '2026-1',
        directorId: 'd1',
        deadlineFilter: EvaluationDeadlineStatus.ON_TIME,
      });

      expect(service.filteredData().map((p) => p.id)).toEqual(['p1']);
    });
  });
});
