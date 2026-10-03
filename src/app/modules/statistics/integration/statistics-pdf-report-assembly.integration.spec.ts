import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { StatisticsPageFacadeService } from '../pages/statistics-page/services/statistics-page-facade.service';
import { StatisticsStateService } from '../services/statistics-state.service';
import { StatisticsMetricsService } from '../services/statistics-metrics.service';
import { StatisticsChartDataService } from '../services/statistics-chart-data.service';
import { ProjectDataMapperService } from '../services/project-data-mapper.service';
import { StatisticsReportService } from '../services/statistics-reports.service';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { UserService } from '../../users/services/user.service';
import { stateList } from '../../../core/enums/state.enum';
import { Proposal } from '../../proposal/interfaces/proposal.interface';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

describe('Integración [Estadísticas]: Ensamblado real de KPIs para el reporte PDF', () => {
  let facade: StatisticsPageFacadeService;
  let stateService: StatisticsStateService;
  let reportServiceMock: { downloadPdfReport: jest.Mock };
  let mockProposalService: { allProposals: jest.Mock<Proposal[], []> };
  let mockDraftService: { allPreliminaryDrafts: jest.Mock<any[], []> };
  let mockThesisService: { allThesisWorks: jest.Mock<any[], []> };
  let mockUserService: { formatFullName: jest.Mock<string, [any?]> };
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockProposalService = { allProposals: jest.fn().mockReturnValue([]) };
    mockDraftService = { allPreliminaryDrafts: jest.fn().mockReturnValue([]) };
    mockThesisService = { allThesisWorks: jest.fn().mockReturnValue([]) };
    mockUserService = { formatFullName: jest.fn().mockReturnValue('Director Prueba') };
    reportServiceMock = { downloadPdfReport: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        StatisticsPageFacadeService,
        StatisticsStateService, StatisticsMetricsService, StatisticsChartDataService, ProjectDataMapperService,
        { provide: StatisticsReportService, useValue: reportServiceMock },
        { provide: ProposalService, useValue: mockProposalService },
        { provide: PreliminaryDraftService, useValue: mockDraftService },
        { provide: ThesisWorkService, useValue: mockThesisService },
        { provide: UserService, useValue: mockUserService }
      ]
    });
    facade = TestBed.inject(StatisticsPageFacadeService);
    stateService = TestBed.inject(StatisticsStateService);
  });
  it('debe pasar al servicio de reporte los KPIs realmente calculados, no valores inventados', () => {
    const approvedPartial: Partial<Proposal> = { id: 'p1', title: 'Aprobada', state: stateList.APROBADO, createdAt: new Date('2026-05-01'), isArchived: false };
    const approved = approvedPartial as Proposal;
    const withObsPartial: Partial<Proposal> = { id: 'p2', title: 'Con obs', state: stateList.APROBADO_CON_OBSERVACIONES, createdAt: new Date('2026-05-01'), isArchived: false };
    const withObs = withObsPartial as Proposal;
    const rejectedPartial: Partial<Proposal> = { id: 'p3', title: 'Rechazada', state: stateList.NO_APROBADO, createdAt: new Date('2026-05-01'), isArchived: false };
    const rejected = rejectedPartial as Proposal;
    mockProposalService.allProposals.mockReturnValue([approved, withObs, rejected]);
    facade.downloadPdfReport();
    expect(reportServiceMock.downloadPdfReport).toHaveBeenCalledWith(
      stateService.currentFilters(),
      stateService.filteredData(),
      { loaded: 3, approved: 1, obs: 1, rejected: 1 }
    );
  });
  it('debe reflejar los filtros activos en el momento de generar el reporte, no los del estado inicial', () => {
    const proposal2026Partial: Partial<Proposal> = { id: 'p-2026', title: 'De 2026-1', state: stateList.APROBADO, createdAt: new Date('2026-05-01'), isArchived: false };
    const proposal2026 = proposal2026Partial as Proposal;
    const proposal2027Partial: Partial<Proposal> = { id: 'p-2027', title: 'De otro periodo', state: stateList.APROBADO, createdAt: new Date('2027-02-01'), isArchived: false };
    const proposal2027 = proposal2027Partial as Proposal;
    mockProposalService.allProposals.mockReturnValue([proposal2026, proposal2027]);
    stateService.updateFilters({ period: '2026-1' });
    facade.downloadPdfReport();
    const [, dataArg] = reportServiceMock.downloadPdfReport.mock.calls[0];
    expect(dataArg).toHaveLength(1);
    expect(dataArg[0].id).toBe('p-2026');
  });
});
