import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { StatisticsMetricsService } from './statistics-metrics.service';
import { StatisticsStateService } from './statistics-state.service';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { RawProjectData } from '../interfaces/rawProjectData.interface';

describe('StatisticsMetricsService', () => {
  let service: StatisticsMetricsService;

  // Signal para simular el estado reactivo centralizado
  let mockFilteredDataSignal = signal<RawProjectData[]>([]);

  beforeEach(() => {
    // Resetear el signal a un estado limpio antes de cada prueba
    mockFilteredDataSignal.set([]);

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
      // Preparamos un mix de datos para verificar que los filtros son exactos
      const mockData = [
        { status: ProjectStatus.APROBADO },
        { status: ProjectStatus.APROBADO }, // 2 Aprobados
        { status: ProjectStatus.APROBADO_OBSERVACIONES }, // 1 Aprobado con Observaciones
        { status: ProjectStatus.NO_APROBADO },
        { status: ProjectStatus.CANCELADO }, // 2 No Aprobados (suma de ambos estados)
        { status: 'EN_PROGRESO' as ProjectStatus } // 1 Estado diferente (ruido para probar exclusión)
      ] as unknown as RawProjectData[];

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
        { status: ProjectStatus.APROBADO } as unknown as RawProjectData
      ]);
      expect(service.totalApproved()).toBe(1);
      expect(service.totalLoaded()).toBe(1);

      // Mutación 2: Añadimos un proyecto no aprobado y quitamos el aprobado
      mockFilteredDataSignal.set([
        { status: ProjectStatus.NO_APROBADO } as unknown as RawProjectData
      ]);

      expect(service.totalApproved()).toBe(0); // Volvió a cero
      expect(service.totalNotApproved()).toBe(1); // Incrementó
      expect(service.totalLoaded()).toBe(1); // Se mantiene el total general
    });
  });
});
