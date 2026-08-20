import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { StatisticsPageComponent } from './statistics-page.component';
import { StatisticsPageFacadeService } from './services/statistics-page-facade.service';
import { ProjectStage } from '../../enum/projectStage.enum';
import { DeadlineFilterValue, StatisticsFilters } from '../../interfaces/statisticsFilters.interface';
import { EvaluationDeadlineStatus } from '../../../../core/enums/evaluation-deadline-status.enum';

describe('StatisticsPageComponent', () => {
  let component: StatisticsPageComponent;
  let fixture: ComponentFixture<StatisticsPageComponent>;
  let mockFacadeService: Partial<StatisticsPageFacadeService>;

  const initialFilters: StatisticsFilters = {
    stage: null,
    period: null,
    directorId: null,
    archiveStatus: 'ACTIVE',
    deadlineFilter: 'ALL',
  };

  beforeEach(async () => {
    mockFacadeService = {
      updateFilters: jest.fn(),
      downloadPdfReport: jest.fn(),
      clearFilters: jest.fn(),

      // Signals simulados para prevenir errores en el renderizado del template
      currentFilters: signal<StatisticsFilters>(initialFilters),
      stagesOptions: [],
      periodsOptions: signal<string[]>([]),
      directorsOptions: signal<{ id: string; name: string }[]>([]),
      totalLoaded: signal<number>(0),
      totalApproved: signal<number>(0),
      totalApprovedWithObservations: signal<number>(0),
      totalNotApproved: signal<number>(0),
      statusChartData: signal({ labels: [], datasets: [] }),
      stageChartData: signal({ labels: [], datasets: [] }),
    };

    await TestBed.configureTestingModule({
      imports: [StatisticsPageComponent],
      providers: [
        { provide: StatisticsPageFacadeService, useValue: mockFacadeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización', () => {
    it('debería crear el componente correctamente', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Interacciones del Usuario (Actualización de Filtros)', () => {
    it('debería delegar el cambio de Etapa (Stage) al Facade', () => {
      component.onStageChange(ProjectStage.PROPUESTA);

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        stage: ProjectStage.PROPUESTA,
      });
    });

    it('debería permitir limpiar la Etapa enviando null', () => {
      component.onStageChange(null);

      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        stage: null,
      });
    });

    it('debería delegar el cambio de Periodo al Facade', () => {
      component.onPeriodChange('2026-1');

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        period: '2026-1',
      });
    });

    it('debería delegar el cambio de Director al Facade', () => {
      component.onDirectorChange('dir-123');

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        directorId: 'dir-123',
      });
    });

    it('debería delegar el cambio de Estado de Archivo al Facade', () => {
      component.onArchiveStatusChange('ARCHIVED');

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        archiveStatus: 'ARCHIVED',
      });
    });

    it('debería delegar el cambio de Plazo de Evaluación al Facade', () => {
      const deadlineValue: DeadlineFilterValue = EvaluationDeadlineStatus.DELAYED;

      component.onDeadlineFilterChange(deadlineValue);

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        deadlineFilter: deadlineValue,
      });
    });
  });

  describe('Acciones', () => {
    it('debería delegar la descarga del reporte PDF al Facade', () => {
      component.handleDownloadReport();

      expect(mockFacadeService.downloadPdfReport).toHaveBeenCalledTimes(1);
    });
  });
});
