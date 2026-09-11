import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { StatisticsChartDataService } from './statistics-chart-data.service';
import { StatisticsStateService } from './statistics-state.service';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';

// Importamos las constantes para hacer aserciones dinámicas y robustas
import {
  STATUS_CHART_LABELS,
  STATUS_CHART_ORDER,
  STATUS_CHART_COLORS,
  STAGE_CHART_LABELS,
  STAGE_CHART_ORDER,
  STAGE_CHART_COLORS
} from '../models/statistics-chart.model';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('StatisticsChartDataService', () => {
  let service: StatisticsChartDataService;

  // Usamos un signal estricto en el mock para probar la reactividad del computed
  let mockFilteredDataSignal: WritableSignal<RawProjectData[]>;

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Limpiamos e inicializamos el signal antes de cada prueba
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
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
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
      // Tomamos los dos primeros estados definidos en la constante (para no hardcodear)
      const status1 = STATUS_CHART_ORDER[0];
      const status2 = STATUS_CHART_ORDER[1];

      // Insertamos 3 proyectos del status1 y 1 del status2 usando el factory puro
      const mockData: RawProjectData[] = [
        createMockRawProjectData({ status: status1 }),
        createMockRawProjectData({ status: status1 }),
        createMockRawProjectData({ status: status1 }),
        createMockRawProjectData({ status: status2 })
      ];

      mockFilteredDataSignal.set(mockData);

      const result = service.statusChartData();
      const dataArray = result.datasets[0].data;

      // El índice 0 debe tener 3 (status1), el índice 1 debe tener 1 (status2)
      expect(dataArray[0]).toBe(3);
      expect(dataArray[1]).toBe(1);

      // Los demás estados en el orden deben tener 0
      if (STATUS_CHART_ORDER.length > 2) {
        expect(dataArray[2]).toBe(0);
      }
    });
  });

  describe('stageChartData (Gráfico de Fases)', () => {
    it('debería estructurar correctamente los metadatos del gráfico (labels, label, colors)', () => {
      const result = service.stageChartData();

      expect(result.labels).toEqual(STAGE_CHART_LABELS);
      expect(result.datasets[0].label).toBe('Proyectos Activos');
      expect(result.datasets[0].backgroundColor).toEqual(STAGE_CHART_COLORS);
      expect(result.datasets[0].borderWidth).toBe(0);
    });

    it('debería calcular las cantidades correctas basado en el STAGE_CHART_ORDER', () => {
      // Tomamos las dos primeras fases de la constante
      const stage1 = STAGE_CHART_ORDER[0];
      const stage2 = STAGE_CHART_ORDER[1];

      // Insertamos 2 proyectos de la fase 1 y 1 de la fase 2 usando el factory
      const mockData: RawProjectData[] = [
        createMockRawProjectData({ stage: stage1 }),
        createMockRawProjectData({ stage: stage1 }),
        createMockRawProjectData({ stage: stage2 })
      ];

      mockFilteredDataSignal.set(mockData);

      const result = service.stageChartData();
      const dataArray = result.datasets[0].data;

      expect(dataArray[0]).toBe(2); // Dos de la fase 1
      expect(dataArray[1]).toBe(1); // Uno de la fase 2
    });
  });

  describe('Reactividad de los Signals (computed)', () => {
    it('debería recalcular automáticamente los datos cuando filteredData cambia', () => {
      const stage1 = STAGE_CHART_ORDER[0];

      // Inicialmente vacío
      expect(service.stageChartData().datasets[0].data[0]).toBe(0);

      // Mutamos el estado (simulando una acción del usuario en el componente)
      mockFilteredDataSignal.set([
        createMockRawProjectData({ stage: stage1 })
      ]);

      // El computed se actualiza instantáneamente
      expect(service.stageChartData().datasets[0].data[0]).toBe(1);
    });
  });
});
