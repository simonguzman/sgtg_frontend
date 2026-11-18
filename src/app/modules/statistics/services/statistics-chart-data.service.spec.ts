import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { StatisticsChartDataService } from './statistics-chart-data.service';
import { StatisticsStateService } from './statistics-state.service';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';

import {
  STATUS_CHART_LABELS,
  STATUS_CHART_ORDER,
  STATUS_CHART_COLORS,
  STAGE_CHART_LABELS,
  STAGE_CHART_ORDER,
  STAGE_CHART_COLORS
} from '../models/statistics-chart.model';

const createMockRawProjectData = (overrides: Partial<RawProjectData> = {}): RawProjectData => ({
  id: 'proj-123',
  title: 'Proyecto Mock',
  stage: ProjectStage.PROPUESTA,
  status: ProjectStatus.EN_DESARROLLO,
  originalState: 'EN_REVISION',
  period: '2026-1',
  directorId: 'usr-1',
  directorName: 'Director Mock',
  registrationDate: new Date(),
  isArchived: false,
  deadlineStatus: null,
  ...overrides
} as RawProjectData);

describe('StatisticsChartDataService', () => {
  let service: StatisticsChartDataService;

  let mockFilteredDataSignal: WritableSignal<RawProjectData[]>;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFilteredDataSignal = signal<RawProjectData[]>([]);

    const mockStateService = {
      filteredData: mockFilteredDataSignal
    };

    TestBed.configureTestingModule({
      providers: [
        StatisticsChartDataService,
        { provide: StatisticsStateService, useValue: mockStateService }
      ]
    });

    service = TestBed.inject(StatisticsChartDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería inyectarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('statusChartData (Gráfico de Estados)', () => {
    it('debería estructurar correctamente los metadatos del gráfico (labels, colors)', () => {
      const result = service.statusChartData();

      expect(result.labels).toEqual(STATUS_CHART_LABELS);
      expect(result.datasets[0].backgroundColor).toEqual(STATUS_CHART_COLORS.background);
      expect(result.datasets[0].borderColor).toEqual(STATUS_CHART_COLORS.border);
      expect(result.datasets[0].borderWidth).toBe(1);
    });

    it('debería calcular las cantidades correctas basado en el STATUS_CHART_ORDER', () => {
      const status1 = STATUS_CHART_ORDER[0];
      const status2 = STATUS_CHART_ORDER[1];

      const mockData: RawProjectData[] = [
        createMockRawProjectData({ status: status1 }),
        createMockRawProjectData({ status: status1 }),
        createMockRawProjectData({ status: status1 }),
        createMockRawProjectData({ status: status2 })
      ];

      mockFilteredDataSignal.set(mockData);

      const result = service.statusChartData();
      const dataArray = result.datasets[0].data;

      expect(dataArray[0]).toBe(3);
      expect(dataArray[1]).toBe(1);

      if (STATUS_CHART_ORDER.length > 2) {
        expect(dataArray[2]).toBe(0);
      }
    });
  });

  describe('stageChartData (Gráfico de Fases)', () => {
    it('debería estructurar correctamente los metadatos del gráfico (labels, label, colors)', () => {
      const result = service.stageChartData();

      expect(result.labels).toEqual(STAGE_CHART_LABELS);
      expect(result.datasets[0].label).toBe('Trabajos');
      expect(result.datasets[0].backgroundColor).toEqual(STAGE_CHART_COLORS);
      expect(result.datasets[0].borderWidth).toBe(0);
    });

    it('debería calcular las cantidades correctas basado en el STAGE_CHART_ORDER', () => {
      const stage1 = STAGE_CHART_ORDER[0];
      const stage2 = STAGE_CHART_ORDER[1];

      const mockData: RawProjectData[] = [
        createMockRawProjectData({ stage: stage1 }),
        createMockRawProjectData({ stage: stage1 }),
        createMockRawProjectData({ stage: stage2 })
      ];

      mockFilteredDataSignal.set(mockData);

      const result = service.stageChartData();
      const dataArray = result.datasets[0].data;

      expect(dataArray[0]).toBe(2);
      expect(dataArray[1]).toBe(1);
    });
  });

  describe('Reactividad de los Signals (computed)', () => {
    it('debería recalcular automáticamente los datos cuando filteredData cambia', () => {
      const stage1 = STAGE_CHART_ORDER[0];

      expect(service.stageChartData().datasets[0].data[0]).toBe(0);

      mockFilteredDataSignal.set([
        createMockRawProjectData({ stage: stage1 })
      ]);

      expect(service.stageChartData().datasets[0].data[0]).toBe(1);
    });
  });
});
