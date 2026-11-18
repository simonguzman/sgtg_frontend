import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { StatisticsMetricsService } from './statistics-metrics.service';
import { StatisticsStateService } from './statistics-state.service';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { ProjectStage } from '../enum/projectStage.enum';

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

describe('StatisticsMetricsService', () => {
  let service: StatisticsMetricsService;

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
        StatisticsMetricsService,
        { provide: StatisticsStateService, useValue: mockStateService }
      ]
    });

    service = TestBed.inject(StatisticsMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería inyectarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Cálculo de Métricas (KPIs)', () => {
    it('debería inicializar todas las métricas en 0 cuando no hay datos', () => {
      expect(service.totalLoaded()).toBe(0);
      expect(service.totalApproved()).toBe(0);
      expect(service.totalInProgress()).toBe(0);
      expect(service.totalNotApproved()).toBe(0);
    });

    it('debería calcular correctamente las métricas basadas en los estados', () => {
      const mockData: RawProjectData[] = [
        createMockRawProjectData({ status: ProjectStatus.APROBADO }),
        createMockRawProjectData({ status: ProjectStatus.APROBADO }),
        createMockRawProjectData({ status: ProjectStatus.EN_REVISION }),
        createMockRawProjectData({ status: ProjectStatus.SUSPENDIDO }),
        createMockRawProjectData({ status: ProjectStatus.NO_APROBADO }),
        createMockRawProjectData({ status: ProjectStatus.CANCELADO }),
        createMockRawProjectData({ status: ProjectStatus.EN_DESARROLLO })
      ];

      mockFilteredDataSignal.set(mockData);

      expect(service.totalLoaded()).toBe(7);
      expect(service.totalApproved()).toBe(2);
      expect(service.totalInProgress()).toBe(3);

      expect(service.totalNotApproved()).toBe(2);
    });
  });

  describe('Reactividad de Signals', () => {
    it('debería recalcular las métricas instantáneamente cuando el estado cambia', () => {
      expect(service.totalApproved()).toBe(0);

      mockFilteredDataSignal.set([
        createMockRawProjectData({ status: ProjectStatus.APROBADO })
      ]);
      expect(service.totalApproved()).toBe(1);
      expect(service.totalLoaded()).toBe(1);

      mockFilteredDataSignal.set([
        createMockRawProjectData({ status: ProjectStatus.NO_APROBADO })
      ]);

      expect(service.totalApproved()).toBe(0);
      expect(service.totalNotApproved()).toBe(1);
      expect(service.totalLoaded()).toBe(1);
    });
  });

  describe('Próximos a vencer', () => {
    it('cuenta solo los trabajos próximos a vencer en proceso, del más urgente al menos urgente', () => {
      mockFilteredDataSignal.set([
        createMockRawProjectData({ id: 'a', dueSoon: true, daysUntilDelivery: 20 }),
        createMockRawProjectData({ id: 'b', dueSoon: true, daysUntilDelivery: 3 }),
        createMockRawProjectData({ id: 'c', dueSoon: false, daysUntilDelivery: 90 }),
        createMockRawProjectData({ id: 'd', dueSoon: true, daysUntilDelivery: 1, isArchived: true }),
        createMockRawProjectData({ id: 'e' })
      ]);

      expect(service.totalDueSoon()).toBe(2);
      expect(service.dueSoonProjects().map(p => p.id)).toEqual(['b', 'a']);
    });

    it('sin trabajos próximos a vencer el total es 0', () => {
      mockFilteredDataSignal.set([createMockRawProjectData()]);
      expect(service.totalDueSoon()).toBe(0);
    });
  });
});
