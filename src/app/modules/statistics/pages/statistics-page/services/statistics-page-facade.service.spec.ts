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

describe('StatisticsPageFacadeService', () => {
  let facadeService: StatisticsPageFacadeService;

  // Mock de State Service
  let mockStateService: Partial<StatisticsStateService>;
  let mockCurrentFilters: WritableSignal<StatisticsFilters>;
  let mockFilteredData: WritableSignal<RawProjectData[]>;
  let mockPeriodsOptions: WritableSignal<string[]>;
  let mockDirectorsOptions: WritableSignal<{ id: string; name: string }[]>;

  // Mock de Metrics Service
  let mockMetricsService: Partial<StatisticsMetricsService>;
  let mockTotalLoaded: WritableSignal<number>;
  let mockTotalApproved: WritableSignal<number>;
  let mockTotalApprovedWithObservations: WritableSignal<number>;
  let mockTotalNotApproved: WritableSignal<number>;

  // Mock de Chart Data Service
  let mockChartDataService: Partial<StatisticsChartDataService>;
  let mockStatusChartData: WritableSignal<unknown>;
  let mockStageChartData: WritableSignal<unknown>;

  // Mock de Report Service
  let mockReportService: Partial<StatisticsReportService>;

  beforeEach(() => {
    // 1. Inicialización de Signals
    mockCurrentFilters = signal<StatisticsFilters>({
      stage: null,
      period: null,
      directorId: null,
      archiveStatus: 'ACTIVE',
    });
    mockFilteredData = signal<RawProjectData[]>([]);
    mockPeriodsOptions = signal<string[]>(['2026-1', '2025-2']);
    mockDirectorsOptions = signal<{ id: string; name: string }[]>([{ id: 'd1', name: 'Director 1' }]);

    mockTotalLoaded = signal<number>(10);
    mockTotalApproved = signal<number>(5);
    mockTotalApprovedWithObservations = signal<number>(3);
    mockTotalNotApproved = signal<number>(2);

    mockStatusChartData = signal<unknown>({ labels: [], data: [] });
    mockStageChartData = signal<unknown>({ labels: [], data: [] });

    // 2. Definición de Mocks
    mockStateService = {
      currentFilters: mockCurrentFilters,
      filteredData: mockFilteredData,
      // Corrección 1: Usamos el tipo exacto que espera el servicio original extraído dinámicamente
      stagesOptions: [] as unknown as StatisticsStateService['stagesOptions'],
      periodsOptions: mockPeriodsOptions,
      directorsOptions: mockDirectorsOptions,
      updateFilters: jest.fn(),
      clearFilters: jest.fn(),
    };

    mockMetricsService = {
      totalLoaded: mockTotalLoaded,
      totalApproved: mockTotalApproved,
      totalApprovedWithObservations: mockTotalApprovedWithObservations,
      totalNotApproved: mockTotalNotApproved,
    };

    mockChartDataService = {
      // Corrección 2: Casteamos el Signal de unknown al tipo de Signal estricto que exige el servicio
      statusChartData: mockStatusChartData as unknown as StatisticsChartDataService['statusChartData'],
      stageChartData: mockStageChartData as unknown as StatisticsChartDataService['stageChartData'],
    };

    mockReportService = {
      downloadPdfReport: jest.fn(),
    };

    // 3. Configuración del TestBed
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
  });

  describe('Exposición de Estado y Signals (Propiedades de Lectura)', () => {
    it('debería re-exponer correctamente las opciones y filtros del StateService', () => {
      expect(facadeService.currentFilters()).toEqual(mockCurrentFilters());
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
      expect(facadeService.statusChartData()).toEqual({ labels: [], data: [] });
      expect(facadeService.stageChartData()).toEqual({ labels: [], data: [] });
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
      };
      const filteredData: RawProjectData[] = [
        { id: '1', title: 'Test 1' } as unknown as RawProjectData,
      ];

      mockCurrentFilters.set(currentFilters);
      mockFilteredData.set(filteredData);

      // Ajustamos los KPIs
      mockTotalLoaded.set(20);
      mockTotalApproved.set(10);
      mockTotalApprovedWithObservations.set(5);
      mockTotalNotApproved.set(5);

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
