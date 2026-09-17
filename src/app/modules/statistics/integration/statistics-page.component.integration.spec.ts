import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser'; // <-- Importación necesaria para buscar en el DOM
import { StatisticsPageComponent } from '../pages/statistics-page/statistics-page.component';
import { StatisticsPageFacadeService } from '../pages/statistics-page/services/statistics-page-facade.service';
import { ProjectStage } from '../enum/projectStage.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { STAGE_OPTIONS } from '../models/statistics-options.model';

describe('StatisticsPageComponent - Integración UI', () => {
  let component: StatisticsPageComponent;
  let fixture: ComponentFixture<StatisticsPageComponent>;
  let mockFacade: jest.Mocked<Partial<StatisticsPageFacadeService>>;

  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  beforeEach(async () => {
    mockFacade = {
      currentFilters: signal({ stage: null, period: null, directorId: null, archiveStatus: 'ACTIVE', deadlineFilter: 'ALL' }),
      stagesOptions: STAGE_OPTIONS,
      periodsOptions: signal(['2026-1', '2026-2']),
      directorsOptions: signal([{ id: 'dir-1', name: 'Director Test' }]),

      // KPIs
      totalLoaded: signal(150),
      totalApproved: signal(100),
      totalApprovedWithObservations: signal(30),
      totalNotApproved: signal(20),

      // Charts
      statusChartData: signal({ labels: [], datasets: [] }),
      stageChartData: signal({ labels: [], datasets: [] }),

      // Acciones
      updateFilters: jest.fn(),
      clearFilters: jest.fn(),
      downloadPdfReport: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [StatisticsPageComponent],
      providers: [
        { provide: StatisticsPageFacadeService, useValue: mockFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Render inicial
  });

  it('debe renderizar los KPIs consumidos desde las señales de la fachada', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.text-3xl.font-bold');

    expect(cards).toHaveLength(4);
    expect(cards[0].textContent?.trim()).toBe('150'); // totalLoaded
    expect(cards[1].textContent?.trim()).toBe('100'); // totalApproved
    expect(cards[2].textContent?.trim()).toBe('30');  // totalApprovedWithObservations
    expect(cards[3].textContent?.trim()).toBe('20');  // totalNotApproved
  });

  it('debe delegar los cambios de los selectores (dropdowns) al método updateFilters de la fachada', () => {
    component.onStageChange(ProjectStage.TRABAJO_GRADO);
    expect(mockFacade.updateFilters).toHaveBeenCalledWith({ stage: ProjectStage.TRABAJO_GRADO });

    component.onPeriodChange('2026-2');
    expect(mockFacade.updateFilters).toHaveBeenCalledWith({ period: '2026-2' });

    component.onArchiveStatusChange('ALL');
    expect(mockFacade.updateFilters).toHaveBeenCalledWith({ archiveStatus: 'ALL' });

    component.onDeadlineFilterChange(EvaluationDeadlineStatus.DELAYED);
    expect(mockFacade.updateFilters).toHaveBeenCalledWith({ deadlineFilter: EvaluationDeadlineStatus.DELAYED });
  });

  it('debe llamar al método de limpiar filtros de la fachada desde el evento del botón', () => {
    // Buscamos el componente Angular en el DOM mediante By.css
    const clearButtonDebug = fixture.debugElement.query(
      By.css('app-button-component[icon="filter_alt_off"]')
    );

    // Aseguramos de que el botón realmente esté renderizado
    expect(clearButtonDebug).toBeTruthy();

    // Disparamos el @Output() 'onClick' directamente. Esto evita buscar el <button> nativo
    // interno y respeta el encapsulamiento de tu componente base.
    clearButtonDebug.triggerEventHandler('onClick', null);

    expect(mockFacade.clearFilters).toHaveBeenCalled();
  });

  it('debe invocar la generación del reporte PDF', () => {
    component.handleDownloadReport();
    expect(mockFacade.downloadPdfReport).toHaveBeenCalled();
  });
});
