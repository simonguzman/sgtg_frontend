import 'fake-indexeddb/auto';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { StatisticsPageComponent } from '../pages/statistics-page/statistics-page.component';
import { StatisticsPageFacadeService } from '../pages/statistics-page/services/statistics-page-facade.service';
import { ProjectStage } from '../enum/projectStage.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { STAGE_OPTIONS } from '../models/statistics-options.model';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

describe('StatisticsPageComponent - Integración UI', () => {
  let component: StatisticsPageComponent;
  let fixture: ComponentFixture<StatisticsPageComponent>;
  let mockFacade: Partial<StatisticsPageFacadeService> & {
    updateFilters: jest.Mock;
    clearFilters: jest.Mock;
    downloadPdfReport: jest.Mock;
  };
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    mockFacade = {
      currentFilters: signal({ stage: null, period: null, directorId: null, archiveStatus: 'ACTIVE', deadlineFilter: 'ALL' }),
      stagesOptions: STAGE_OPTIONS,
      periodsOptions: signal(['2026-1', '2026-2']),
      directorsOptions: signal([{ id: 'dir-1', name: 'Director Test' }]),
      totalLoaded: signal(150),
      totalApproved: signal(100),
      totalApprovedWithObservations: signal(30),
      totalNotApproved: signal(20),
      statusChartData: signal({ labels: [], datasets: [] }),
      stageChartData: signal({ labels: [], datasets: [] }),
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
    fixture.detectChanges();
  });
  it('debe renderizar los KPIs consumidos desde las señales de la fachada', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.text-3xl.font-bold');
    expect(cards).toHaveLength(4);
    expect(cards[0].textContent?.trim()).toBe('150');
    expect(cards[1].textContent?.trim()).toBe('100');
    expect(cards[2].textContent?.trim()).toBe('30');
    expect(cards[3].textContent?.trim()).toBe('20');
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
    const clearButtonDebug = fixture.debugElement.query(
      By.css('app-button-component[icon="filter_alt_off"]')
    );
    expect(clearButtonDebug).toBeTruthy();
    clearButtonDebug.triggerEventHandler('onClick', null);
    expect(mockFacade.clearFilters).toHaveBeenCalled();
  });
  it('debe invocar la generación del reporte PDF', () => {
    component.handleDownloadReport();
    expect(mockFacade.downloadPdfReport).toHaveBeenCalled();
  });
});
