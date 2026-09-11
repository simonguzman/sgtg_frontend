import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { StatisticsMetricsService } from './statistics-metrics.service';
import { StatisticsStateService } from './statistics-state.service';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { ProjectStage } from '../enum/projectStage.enum';

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

describe('StatisticsMetricsService', () => {
  let service: StatisticsMetricsService;

  // Signal estricto para simular el estado reactivo centralizado
  let mockFilteredDataSignal: WritableSignal<RawProjectData[]>;

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia ante posibles advertencias
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Resetear el signal a un estado limpio antes de cada prueba
    mockFilteredDataSignal = signal<RawProjectData[]>([]);

    const mockStateService = {
      filteredData: mockFilteredDataSignal
    };

    TestBed.configureTestingModule({
      providers: [
        StatisticsMetricsService,
        { provide: StatisticsStateService, useValue: mockStateService }
      ]
    });

    service = TestBed.inject(StatisticsMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
  });

  it('debería inyectarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Cálculo de Métricas (KPIs)', () => {
    it('debería inicializar todas las métricas en 0 cuando no hay datos', () => {
      expect(service.totalLoaded()).toBe(0);
      expect(service.totalApproved()).toBe(0);
      expect(service.totalApprovedWithObservations()).toBe(0);
      expect(service.totalNotApproved()).toBe(0);
    });

    it('debería calcular correctamente las métricas basadas en los estados', () => {
      // Preparamos un mix de datos usando la fábrica (sin casteos inseguros)
      const mockData: RawProjectData[] = [
        createMockRawProjectData({ status: ProjectStatus.APROBADO }),
        createMockRawProjectData({ status: ProjectStatus.APROBADO }), // 2 Aprobados
        createMockRawProjectData({ status: ProjectStatus.APROBADO_OBSERVACIONES }), // 1 Aprobado con Observaciones
        createMockRawProjectData({ status: ProjectStatus.NO_APROBADO }),
        createMockRawProjectData({ status: ProjectStatus.CANCELADO }), // 2 No Aprobados (suma de ambos estados)
        createMockRawProjectData({ status: ProjectStatus.EN_DESARROLLO }) // 1 Estado diferente genuino para probar exclusión
      ];

      mockFilteredDataSignal.set(mockData);

      expect(service.totalLoaded()).toBe(6); // Total del array
      expect(service.totalApproved()).toBe(2);
      expect(service.totalApprovedWithObservations()).toBe(1);

      // La lógica dictamina que NO_APROBADO y CANCELADO se suman aquí
      expect(service.totalNotApproved()).toBe(2);
    });
  });

  describe('Reactividad de Signals', () => {
    it('debería recalcular las métricas instantáneamente cuando el estado cambia', () => {
      // Estado Inicial
      expect(service.totalApproved()).toBe(0);

      // Mutación 1: Añadimos un proyecto aprobado
      mockFilteredDataSignal.set([
        createMockRawProjectData({ status: ProjectStatus.APROBADO })
      ]);
      expect(service.totalApproved()).toBe(1);
      expect(service.totalLoaded()).toBe(1);

      // Mutación 2: Añadimos un proyecto no aprobado y quitamos el aprobado
      mockFilteredDataSignal.set([
        createMockRawProjectData({ status: ProjectStatus.NO_APROBADO })
      ]);

      expect(service.totalApproved()).toBe(0); // Volvió a cero
      expect(service.totalNotApproved()).toBe(1); // Incrementó
      expect(service.totalLoaded()).toBe(1); // Se mantiene el total general
    });
  });
});
