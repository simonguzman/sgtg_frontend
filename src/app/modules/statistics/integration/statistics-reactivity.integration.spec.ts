import 'fake-indexeddb/auto';
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
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';

if (typeof structuredClone === 'undefined') {
  global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-default',
  title: 'Propuesta Base',
  state: stateList.APROBADO,
  createdAt: new Date(),
  isArchived: false,
  evaluations: [],
  ...overrides
} as Proposal);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-default',
  state: stateList.EN_REVISION,
  createdData: new Date(),
  isArchived: false,
  documents: [],
  evaluations: [],
  ...overrides
} as PreliminaryDraft);

const createMockThesis = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'thesis-default',
  state: stateList.CANCELADO,
  createdDate: new Date(),
  isArchived: true,
  ...overrides
} as ThesisWork);

describe('Estadísticas - Integración del Motor Reactivo (State + Metrics + Charts)', () => {
  let stateService: StatisticsStateService;
  let metricsService: StatisticsMetricsService;
  let chartService: StatisticsChartDataService;
  let mockProposalService: { allProposals: jest.Mock<Proposal[], []> };
  let mockDraftService: { allPreliminaryDrafts: jest.Mock<PreliminaryDraft[], []> };
  let mockThesisService: { allThesisWorks: jest.Mock<ThesisWork[], []> };
  let mockUserService: { formatFullName: jest.Mock<string, [string | undefined]> };
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
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
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  const buildMockData = () => {
    const p1 = createMockProposal({
      id: 'prop-1',
      title: 'Propuesta 1',
      state: stateList.APROBADO,
      createdAt: new Date('2026-05-10T10:00:00Z'),
      isArchived: false,
      evaluations: [{ deadlineStatus: EvaluationDeadlineStatus.ON_TIME } as any]
    });
    const d1 = createMockDraft({
      preliminaryDraftId: 'draft-1',
      state: stateList.EN_REVISION,
      createdData: new Date('2026-08-15T10:00:00Z'),
      isArchived: false,
      documents: [{ id: 'doc-1', type: DocumentType.ANTEPROYECTO } as any],
      evaluations: [{ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.DELAYED } as any]
    });
    const t1 = createMockThesis({
      thesisWorkId: 'thesis-1',
      state: stateList.CANCELADO,
      createdDate: new Date('2026-09-01T10:00:00Z'),
      isArchived: true
    });
    mockProposalService.allProposals.mockReturnValue([p1]);
    mockDraftService.allPreliminaryDrafts.mockReturnValue([d1]);
    mockThesisService.allThesisWorks.mockReturnValue([t1]);
  };
  it('debe inicializar el estado consolidando y mapeando correctamente las tres fuentes', () => {
    buildMockData();
    const rawData = stateService.rawData();
    expect(rawData).toHaveLength(3);
    expect(rawData.find(p => p.id === 'prop-1')?.period).toBe('2026-1');
    expect(rawData.find(p => p.id === 'draft-1')?.period).toBe('2026-2');
    const periods = stateService.periodsOptions();
    expect(periods).toEqual(['2026-2', '2026-1']);
  });
  it('debe calcular los KPIs iniciales ignorando registros archivados por defecto (filtro ACTIVE)', () => {
    buildMockData();
    expect(metricsService.totalLoaded()).toBe(2);
    expect(metricsService.totalApproved()).toBe(1);
    expect(metricsService.totalNotApproved()).toBe(0);
  });
  it('debe actualizar los gráficos y KPIs reactivamente al filtrar por Etapa', () => {
    buildMockData();
    stateService.updateFilters({ stage: ProjectStage.ANTEPROYECTO });
    expect(metricsService.totalLoaded()).toBe(1);
    const stageChart = chartService.stageChartData();
    const anteproyectoIndex = stageChart.labels.indexOf('Anteproyectos');
    expect(stageChart.datasets[0].data[anteproyectoIndex]).toBe(1);
    expect(stageChart.datasets[0].data[stageChart.labels.indexOf('Propuestas')]).toBe(0);
  });
  it('debe incluir los registros archivados y contar los No Aprobados al cambiar el filtro de archivo a ALL', () => {
    buildMockData();
    stateService.updateFilters({ archiveStatus: 'ALL' });
    expect(metricsService.totalLoaded()).toBe(3);
    expect(metricsService.totalNotApproved()).toBe(1);
    const statusChart = chartService.statusChartData();
    const canceladoIndex = statusChart.labels.indexOf('Cancelados');
    expect(statusChart.datasets[0].data[canceladoIndex]).toBe(1);
  });
  it('debe filtrar correctamente por el estado del plazo de evaluación (deadlineFilter)', () => {
    buildMockData();
    stateService.updateFilters({ deadlineFilter: EvaluationDeadlineStatus.DELAYED });
    const filtered = stateService.filteredData();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('draft-1');
    stateService.updateFilters({ deadlineFilter: 'NOT_EVALUATED', archiveStatus: 'ALL' });
    expect(stateService.filteredData()).toHaveLength(1);
    expect(stateService.filteredData()[0].id).toBe('thesis-1');
  });
  it('debe restablecer todos los filtros y recuperar la data por defecto al llamar clearFilters', () => {
    buildMockData();
    stateService.updateFilters({ period: '2026-1', deadlineFilter: EvaluationDeadlineStatus.DELAYED });
    expect(metricsService.totalLoaded()).toBe(0);
    stateService.clearFilters();
    expect(metricsService.totalLoaded()).toBe(2);
    expect(stateService.currentFilters().deadlineFilter).toBe('ALL');
  });
});
