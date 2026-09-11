import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { StatisticsPageFacadeService } from './statistics-page-facade.service';
import { StatisticsStateService } from '../../../services/statistics-state.service';
import { StatisticsMetricsService } from '../../../services/statistics-metrics.service';
import { StatisticsChartDataService } from '../../../services/statistics-chart-data.service';
import { StatisticsReportService } from '../../../services/statistics-reports.service';

import { StatisticsFilters } from '../../../interfaces/statisticsFilters.interface';
import { StatisticsReportKpis } from '../../../interfaces/statisticsReportKpis.interface';
import { RawProjectData } from '../../../interfaces/rawProjectData.interface';
import { ProjectStage } from '../../../enum/projectStage.enum';

// ── Tipados Estrictos para los Mocks (Zero 'any', 'unknown') ─────────────────

interface MockChartData {
  labels: string[];
  datasets: Record<string, unknown>[];
}

interface MockStageOption {
  label: string;
  value: ProjectStage | null;
}

// ── Funciones Fábrica ────────────────────────────────────────────────────────

const createMockRawProjectData = (overrides: Partial<RawProjectData> = {}): RawProjectData => ({
  id: 'proj-123',
  title: 'Proyecto Mock',
  stage: ProjectStage.PROPUESTA,
  status: 'EN_DESARROLLO' as any, // Simulación genérica del estado
  originalState: 'EN_REVISION',
  period: '2026-1',
  directorId: 'usr-1',
  directorName: 'Director Mock',
  registrationDate: new Date(),
  isArchived: false,
  deadlineStatus: null,
  ...overrides
} as RawProjectData);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('StatisticsPageFacadeService', () => {
  let facadeService: StatisticsPageFacadeService;

  // Mocks con tipado estrictamente definido
  let mockStateService: {
    currentFilters: WritableSignal<StatisticsFilters>;
    filteredData: WritableSignal<RawProjectData[]>;
    stagesOptions: MockStageOption[];
    periodsOptions: WritableSignal<string[]>;
    directorsOptions: WritableSignal<{ id: string; name: string }[]>;
    updateFilters: jest.Mock<void, [Partial<StatisticsFilters>]>;
    clearFilters: jest.Mock<void, []>;
  };

  let mockMetricsService: {
    totalLoaded: WritableSignal<number>;
    totalApproved: WritableSignal<number>;
    totalApprovedWithObservations: WritableSignal<number>;
    totalNotApproved: WritableSignal<number>;
  };

  let mockChartDataService: {
    statusChartData: WritableSignal<MockChartData>;
    stageChartData: WritableSignal<MockChartData>;
  };

  let mockReportService: {
    downloadPdfReport: jest.Mock<void, [StatisticsFilters, RawProjectData[], StatisticsReportKpis]>;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Inicialización de Signals y Mocks
    mockStateService = {
      currentFilters: signal<StatisticsFilters>({
        stage: null,
        period: null,
        directorId: null,
        archiveStatus: 'ACTIVE',
        deadlineFilter: 'ALL',
      }),
      filteredData: signal<RawProjectData[]>([]),
      stagesOptions: [],
      periodsOptions: signal<string[]>(['2026-1', '2025-2']),
      directorsOptions: signal<{ id: string; name: string }[]>([{ id: 'd1', name: 'Director 1' }]),
      updateFilters: jest.fn(),
      clearFilters: jest.fn(),
    };

    mockMetricsService = {
      totalLoaded: signal<number>(10),
      totalApproved: signal<number>(5),
      totalApprovedWithObservations: signal<number>(3),
      totalNotApproved: signal<number>(2),
    };

    mockChartDataService = {
      statusChartData: signal<MockChartData>({ labels: [], datasets: [] }),
      stageChartData: signal<MockChartData>({ labels: [], datasets: [] }),
    };

    mockReportService = {
      downloadPdfReport: jest.fn(),
    };

    // 2. Configuración del TestBed
    TestBed.configureTestingModule({
      providers: [
        StatisticsPageFacadeService,
        { provide: StatisticsStateService, useValue: mockStateService },
        { provide: StatisticsMetricsService, useValue: mockMetricsService },
        { provide: StatisticsChartDataService, useValue: mockChartDataService },
        { provide: StatisticsReportService, useValue: mockReportService },
      ],
    });

    facadeService = TestBed.inject(StatisticsPageFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
  });

  describe('Exposición de Estado y Signals (Propiedades de Lectura)', () => {
    it('debería re-exponer correctamente las opciones y filtros del StateService', () => {
      expect(facadeService.currentFilters()).toEqual(mockStateService.currentFilters());
      expect(facadeService.stagesOptions).toEqual(mockStateService.stagesOptions);
      expect(facadeService.periodsOptions()).toEqual(['2026-1', '2025-2']);
      expect(facadeService.directorsOptions()).toEqual([{ id: 'd1', name: 'Director 1' }]);
    });

    it('debería re-exponer correctamente los KPIs del MetricsService', () => {
      expect(facadeService.totalLoaded()).toBe(10);
      expect(facadeService.totalApproved()).toBe(5);
      expect(facadeService.totalApprovedWithObservations()).toBe(3);
      expect(facadeService.totalNotApproved()).toBe(2);
    });

    it('debería re-exponer correctamente los datos de gráficos del ChartDataService', () => {
      expect(facadeService.statusChartData()).toEqual({ labels: [], datasets: [] });
      expect(facadeService.stageChartData()).toEqual({ labels: [], datasets: [] });
    });
  });

  describe('Delegación de Acciones de Filtrado', () => {
    it('debería delegar updateFilters al StatisticsStateService', () => {
      const newFilter: Partial<StatisticsFilters> = { period: '2026-1' };
      facadeService.updateFilters(newFilter);

      expect(mockStateService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockStateService.updateFilters).toHaveBeenCalledWith(newFilter);
    });

    it('debería delegar clearFilters al StatisticsStateService', () => {
      facadeService.clearFilters();

      expect(mockStateService.clearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Orquestación de Reportes PDF (downloadPdfReport)', () => {
    it('debería recolectar filtros, datos y KPIs para generar el reporte', () => {
      // 1. Preparamos datos específicos en los mocks
      const currentFilters: StatisticsFilters = {
        stage: ProjectStage.ANTEPROYECTO,
        period: '2026-1',
        directorId: null,
        archiveStatus: 'ACTIVE',
        deadlineFilter: 'ALL'
      };

      const filteredData: RawProjectData[] = [
        createMockRawProjectData({ id: '1', title: 'Test 1' })
      ];

      mockStateService.currentFilters.set(currentFilters);
      mockStateService.filteredData.set(filteredData);

      // Ajustamos los KPIs
      mockMetricsService.totalLoaded.set(20);
      mockMetricsService.totalApproved.set(10);
      mockMetricsService.totalApprovedWithObservations.set(5);
      mockMetricsService.totalNotApproved.set(5);

      // 2. Ejecutamos el método
      facadeService.downloadPdfReport();

      // 3. Verificamos la construcción exacta de los KPIs
      const expectedKpis: StatisticsReportKpis = {
        loaded: 20,
        approved: 10,
        obs: 5,
        rejected: 5,
      };

      // 4. Verificamos que el ReportService fue llamado con la firma exacta
      expect(mockReportService.downloadPdfReport).toHaveBeenCalledTimes(1);
      expect(mockReportService.downloadPdfReport).toHaveBeenCalledWith(
        currentFilters,
        filteredData,
        expectedKpis
      );
    });
  });
});
