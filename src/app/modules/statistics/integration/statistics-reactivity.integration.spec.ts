import { TestBed } from '@angular/core/testing';
import { StatisticsStateService } from '../services/statistics-state.service';
import { StatisticsMetricsService } from '../services/statistics-metrics.service';
import { StatisticsChartDataService } from '../services/statistics-chart-data.service';
import { ProjectDataMapperService } from '../services/project-data-mapper.service';

import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { UserService } from '../../users/services/user.service';

import { stateList } from '../../../core/enums/state.enum';
import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';

import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';

describe('Estadísticas - Integración del Motor Reactivo (State + Metrics + Charts)', () => {
  let stateService: StatisticsStateService;
  let metricsService: StatisticsMetricsService;
  let chartService: StatisticsChartDataService;

  let mockProposalService: { allProposals: jest.Mock };
  let mockDraftService: { allPreliminaryDrafts: jest.Mock };
  let mockThesisService: { allThesisWorks: jest.Mock };
  let mockUserService: { formatFullName: jest.Mock };

  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    // Simulamos las señales/métodos de los servicios de dominio devolviendo arreglos vacíos por defecto
    mockProposalService = { allProposals: jest.fn().mockReturnValue([]) };
    mockDraftService = { allPreliminaryDrafts: jest.fn().mockReturnValue([]) };
    mockThesisService = { allThesisWorks: jest.fn().mockReturnValue([]) };
    mockUserService = { formatFullName: jest.fn().mockReturnValue('Director Prueba') };

    TestBed.configureTestingModule({
      providers: [
        StatisticsStateService,
        StatisticsMetricsService,
        StatisticsChartDataService,
        ProjectDataMapperService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: PreliminaryDraftService, useValue: mockDraftService },
        { provide: ThesisWorkService, useValue: mockThesisService },
        { provide: UserService, useValue: mockUserService }
      ]
    });

    stateService = TestBed.inject(StatisticsStateService);
    metricsService = TestBed.inject(StatisticsMetricsService);
    chartService = TestBed.inject(StatisticsChartDataService);
  });

  const buildMockData = () => {
    // 1 Propuesta: Activa, Aprobada, A tiempo (Mayo 2026 -> 2026-1)
    const p1 = {
      id: 'prop-1',
      title: 'Propuesta 1',
      state: stateList.APROBADO,
      createdAt: new Date('2026-05-10T10:00:00Z'),
      isArchived: false,
      evaluations: [{ deadlineStatus: EvaluationDeadlineStatus.ON_TIME }]
    } as unknown as Proposal;

    // 1 Anteproyecto: Activo, En Revisión, Retrasado (Agosto 2026 -> 2026-2)
    const d1 = {
      preliminaryDraftId: 'draft-1',
      state: stateList.EN_REVISION,
      createdData: new Date('2026-08-15T10:00:00Z'),
      isArchived: false,
      documents: [{ id: 'doc-1', type: DocumentType.ANTEPROYECTO }],
      evaluations: [{ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.DELAYED }]
    } as unknown as PreliminaryDraft;

    // 1 Trabajo de Grado: Archivado, Cancelado (Septiembre 2026 -> 2026-2)
    const t1 = {
      thesisWorkId: 'thesis-1',
      state: stateList.CANCELADO,
      createdDate: new Date('2026-09-01T10:00:00Z'),
      isArchived: true
    } as unknown as ThesisWork;

    mockProposalService.allProposals.mockReturnValue([p1]);
    mockDraftService.allPreliminaryDrafts.mockReturnValue([d1]);
    mockThesisService.allThesisWorks.mockReturnValue([t1]);
  };

  it('debe inicializar el estado consolidando y mapeando correctamente las tres fuentes', () => {
    buildMockData();
    const rawData = stateService.rawData();

    expect(rawData).toHaveLength(3);

    // Verificamos mapeo de periodos (Mayo = 1, Agosto = 2)
    expect(rawData.find(p => p.id === 'prop-1')?.period).toBe('2026-1');
    expect(rawData.find(p => p.id === 'draft-1')?.period).toBe('2026-2');

    // Verificamos opciones dinámicas extraídas
    const periods = stateService.periodsOptions();
    expect(periods).toEqual(['2026-2', '2026-1']); // Orden descendente según lógica
  });

  it('debe calcular los KPIs iniciales ignorando registros archivados por defecto (filtro ACTIVE)', () => {
    buildMockData();

    // Por defecto archiveStatus es 'ACTIVE', por lo que el Trabajo de Grado (Archivado) se excluye
    expect(metricsService.totalLoaded()).toBe(2);
    expect(metricsService.totalApproved()).toBe(1); // La propuesta
    expect(metricsService.totalNotApproved()).toBe(0); // El trabajo cancelado está archivado
  });

  it('debe actualizar los gráficos y KPIs reactivamente al filtrar por Etapa', () => {
    buildMockData();

    stateService.updateFilters({ stage: ProjectStage.ANTEPROYECTO });

    expect(metricsService.totalLoaded()).toBe(1); // Solo queda el anteproyecto

    const stageChart = chartService.stageChartData();
    const anteproyectoIndex = stageChart.labels.indexOf('Anteproyectos');

    expect(stageChart.datasets[0].data[anteproyectoIndex]).toBe(1);
    expect(stageChart.datasets[0].data[stageChart.labels.indexOf('Propuestas')]).toBe(0);
  });

  it('debe incluir los registros archivados y contar los No Aprobados al cambiar el filtro de archivo a ALL', () => {
    buildMockData();

    stateService.updateFilters({ archiveStatus: 'ALL' });

    expect(metricsService.totalLoaded()).toBe(3);
    expect(metricsService.totalNotApproved()).toBe(1); // El trabajo cancelado ahora sí entra

    const statusChart = chartService.statusChartData();
    const canceladoIndex = statusChart.labels.indexOf('Cancelados');
    expect(statusChart.datasets[0].data[canceladoIndex]).toBe(1);
  });

  it('debe filtrar correctamente por el estado del plazo de evaluación (deadlineFilter)', () => {
    buildMockData();

    // Cambiamos a filtro de retrasados. (El anteproyecto está retrasado, la propuesta a tiempo)
    stateService.updateFilters({ deadlineFilter: EvaluationDeadlineStatus.DELAYED });

    const filtered = stateService.filteredData();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('draft-1');

    // Cambiamos a no evaluados (El Trabajo de Grado no maneja plazo por defecto, su status es null)
    stateService.updateFilters({ deadlineFilter: 'NOT_EVALUATED', archiveStatus: 'ALL' });
    expect(stateService.filteredData()).toHaveLength(1);
    expect(stateService.filteredData()[0].id).toBe('thesis-1');
  });

  it('debe restablecer todos los filtros y recuperar la data por defecto al llamar clearFilters', () => {
    buildMockData();

    stateService.updateFilters({ period: '2026-1', deadlineFilter: EvaluationDeadlineStatus.DELAYED });
    expect(metricsService.totalLoaded()).toBe(0); // No hay ninguno retrasado EN el periodo 2026-1

    stateService.clearFilters();
    expect(metricsService.totalLoaded()).toBe(2); // Vuelve a ACTIVE por defecto
    expect(stateService.currentFilters().deadlineFilter).toBe('ALL');
  });
});
