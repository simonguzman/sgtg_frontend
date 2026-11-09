import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { signal, WritableSignal, Component, Input, Output, EventEmitter } from '@angular/core';
import { StatisticsPageComponent } from './statistics-page.component';
import { StatisticsPageFacadeService } from './services/statistics-page-facade.service';
import { ProjectStage } from '../../enum/projectStage.enum';
import { DEFAULT_STATISTICS_FILTERS, DeadlineFilterValue, StatisticsFilters } from '../../interfaces/statisticsFilters.interface';
import { EvaluationDeadlineStatus } from '../../../../core/enums/evaluation-deadline-status.enum';
import { ChartModule } from 'primeng/chart';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { RawProjectData } from '../../interfaces/rawProjectData.interface';
import { ProjectStatus } from '../../enum/projectStatus.enum';
import { provideRouter } from '@angular/router';

interface MockChartData {
  labels: string[];
  datasets: Record<string, unknown>[];
}

interface MockOption {
  label: string;
  value: string | null;
}


@Component({ selector: 'p-chart', standalone: true, template: '' })
class MockPChartComponent {
  @Input() type!: string;
  @Input() data!: MockChartData;
  @Input() options!: Record<string, unknown>;
}

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label!: string;
  @Input() variant!: string;
  @Input() icon!: string;
  @Output() onClick = new EventEmitter<void>();
}

describe('StatisticsPageComponent', () => {
  let component: StatisticsPageComponent;
  let fixture: ComponentFixture<StatisticsPageComponent>;
  let mockFacadeService: {
    updateFilters: jest.Mock<void, [Partial<StatisticsFilters>]>;
    downloadReport: jest.Mock<Promise<void>, [string]>;
    reportRows: WritableSignal<number>;
    clearFilters: jest.Mock<void, []>;
    currentFilters: WritableSignal<StatisticsFilters>;
    stagesOptions: MockOption[];
    periodsOptions: WritableSignal<string[]>;
    directorsOptions: WritableSignal<{ id: string; name: string }[]>;
    totalLoaded: WritableSignal<number>;
    totalApproved: WritableSignal<number>;
    totalInProgress: WritableSignal<number>;
    totalNotApproved: WritableSignal<number>;
    statusChartData: WritableSignal<MockChartData>;
    stageChartData: WritableSignal<MockChartData>;
    modalityChartData: WritableSignal<MockChartData>;
    programChartData: WritableSignal<MockChartData>;
    modalityOptions: WritableSignal<string[]>;
    programOptions: WritableSignal<string[]>;
    scope: WritableSignal<string>;
    totalDueSoon: WritableSignal<number>;
    dueSoonProjects: WritableSignal<RawProjectData[]>;
    canRemind: WritableSignal<boolean>;
    canOpenDetails: WritableSignal<boolean>;
    sendingReminder: WritableSignal<ReadonlySet<string>>;
    remindedToday: WritableSignal<ReadonlySet<string>>;
    remind: jest.Mock<void, [RawProjectData]>;
    remindAll: jest.Mock<void, []>;
  };
  const initialFilters: StatisticsFilters = { ...DEFAULT_STATISTICS_FILTERS };
  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFacadeService = {
      updateFilters: jest.fn(),
      downloadReport: jest.fn(() => Promise.resolve()),
      reportRows: signal(3),
      clearFilters: jest.fn(),
      currentFilters: signal<StatisticsFilters>(initialFilters),
      stagesOptions: [],
      periodsOptions: signal<string[]>([]),
      directorsOptions: signal<{ id: string; name: string }[]>([]),
      totalLoaded: signal<number>(0),
      totalApproved: signal<number>(0),
      totalInProgress: signal<number>(0),
      totalNotApproved: signal<number>(0),
      statusChartData: signal<MockChartData>({ labels: [], datasets: [] }),
      stageChartData: signal<MockChartData>({ labels: [], datasets: [] }),
      modalityChartData: signal<MockChartData>({ labels: [], datasets: [] }),
      programChartData: signal<MockChartData>({ labels: [], datasets: [] }),
      modalityOptions: signal<string[]>([]),
      programOptions: signal<string[]>([]),
      scope: signal('Todos los trabajos de grado de la facultad.'),
      totalDueSoon: signal(0),
      dueSoonProjects: signal<RawProjectData[]>([]),
      canRemind: signal(false),
      canOpenDetails: signal(false),
      sendingReminder: signal<ReadonlySet<string>>(new Set()),
      remindedToday: signal<ReadonlySet<string>>(new Set()),
      remind: jest.fn(),
      remindAll: jest.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [StatisticsPageComponent],
      // Las gráficas van en @defer (on viewport): cada prueba decide cuándo se dibujan
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        { provide: StatisticsPageFacadeService, useValue: mockFacadeService },
        provideRouter([]),
        provideNoopAnimations(),
      ],
    })
    .overrideComponent(StatisticsPageComponent, {
      remove: { imports: [ChartModule, ButtonComponent] },
      add: { imports: [MockPChartComponent, MockButtonComponent] }
    })
    .compileComponents();
    fixture = TestBed.createComponent(StatisticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  describe('Inicialización', () => {
    it('debería crear el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('muestra qué trabajos cuentan y, sin trabajos, un aviso en lugar de las gráficas', async () => {
      const texto = () => fixture.nativeElement.textContent as string;
      expect(texto()).toContain('Todos los trabajos de grado de la facultad.');
      expect(texto()).toContain('No hay trabajos de grado con los filtros seleccionados.');
      expect(fixture.nativeElement.querySelectorAll('p-chart').length).toBe(0);

      mockFacadeService.totalLoaded.set(5);
      fixture.detectChanges();
      // Hasta llegar a la pantalla, cada gráfica es solo su espacio reservado
      expect(fixture.nativeElement.querySelectorAll('p-chart').length).toBe(0);
      const bloques = await fixture.getDeferBlocks();
      expect(bloques.length).toBe(4);
      for (const bloque of bloques) await bloque.render(DeferBlockState.Complete);
      expect(fixture.nativeElement.querySelectorAll('p-chart').length).toBe(4);
    });

    it('delega los filtros de modalidad y programa al Facade', () => {
      component.onModalityChange('Práctica profesional');
      component.onProgramChange(null);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({ modality: 'Práctica profesional' });
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({ program: null });
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
  describe('Filtros con buscador', () => {
    const escribir = (id: string, texto: string): HTMLElement[] => {
      const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
      input.click();
      input.value = texto;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      return Array.from(input.closest('app-searchable-select')!.querySelectorAll('li')) as HTMLElement[];
    };

    it('el director se busca escribiendo parte del nombre y al elegirlo filtra', () => {
      mockFacadeService.directorsOptions.set([
        { id: 'd1', name: 'Javier Burbano Morales' }, { id: 'd2', name: 'Cristian Rodríguez Ramírez' },
        { id: 'd3', name: 'Luis Narváez Díaz' }
      ]);
      fixture.detectChanges();

      const opciones = escribir('directorFilter', 'rodr');
      expect(opciones.map(o => o.textContent?.trim())).toEqual(['Cristian Rodríguez Ramírez']);
      opciones[0].click();
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({ directorId: 'd2' });
    });

    it('todos los filtros se pueden escribir: programa, periodo, modalidad, etapa, estado y plazo', () => {
      mockFacadeService.programOptions.set(['Ingeniería de Sistemas', 'Ingeniería en Automática Industrial']);
      mockFacadeService.periodsOptions.set(['2027-1', '2026-2']);
      mockFacadeService.modalityOptions.set(['Práctica profesional', 'Trabajo de investigación']);
      mockFacadeService.stagesOptions = [];
      fixture.detectChanges();

      expect(escribir('programFilter', 'autom').map(o => o.textContent?.trim())).toEqual(['Ingeniería en Automática Industrial']);
      expect(escribir('periodFilter', '2026').map(o => o.textContent?.trim())).toEqual(['2026-2']);
      expect(escribir('modalityFilter', 'práct').map(o => o.textContent?.trim())).toEqual(['Práctica profesional']);
      expect(escribir('archiveFilter', 'histor').map(o => o.textContent?.trim())).toEqual(['Cerrados (historial)']);
      expect(escribir('deadlineFilter', 'retraso').map(o => o.textContent?.trim())).toEqual(['Evaluado con retraso']);
    });

    it('limpiar un filtro lo quita (null); el estado y el plazo no se pueden dejar vacíos', () => {
      component.onDirectorChange('');
      component.onStageChange('');
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({ directorId: null });
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({ stage: null });

      mockFacadeService.updateFilters.mockClear();
      component.onArchiveStatusChange('');
      component.onDeadlineFilterChange('');
      expect(mockFacadeService.updateFilters).not.toHaveBeenCalled();
    });
  });
  describe('Próximos a vencer', () => {
    const trabajo = (id: string, dias: number): RawProjectData => ({
      id, title: `Trabajo ${id}`, stage: ProjectStage.TRABAJO_GRADO, status: ProjectStatus.EN_DESARROLLO,
      period: '2027-1', directorId: 'd1', directorName: 'Javier Burbano', registrationDate: new Date(),
      isArchived: false, deadlineStatus: null, modality: 'Trabajo de investigación', program: 'Automática',
      dueSoon: true, daysUntilDelivery: dias, deliveryDate: new Date(2027, 7, 20), studentNames: 'Ana Mora'
    } as RawProjectData);
    const texto = () => fixture.nativeElement.textContent as string;
    const ojo = () => fixture.nativeElement.querySelector('.due-soon-eye') as HTMLButtonElement | null;

    it('sin trabajos próximos a vencer la tarjeta lo dice, sin alerta ni ojo', () => {
      expect(texto()).toContain('Ninguna entrega en los próximos 30 días');
      expect(ojo()).toBeNull();
    });

    it('con trabajos próximos a vencer la tarjeta roja muestra el número y el ojo abre y cierra la tabla', () => {
      mockFacadeService.dueSoonProjects.set([trabajo('7', 4), trabajo('8', 21)]);
      mockFacadeService.totalDueSoon.set(2);
      fixture.detectChanges();

      const tarjeta = fixture.nativeElement.querySelector('.due-soon-card') as HTMLElement;
      expect(tarjeta.textContent).toContain('Próximos a vencer');
      expect(tarjeta.textContent).toContain('2');
      expect(fixture.nativeElement.querySelector('#dueSoonSection')).toBeNull();

      ojo()!.click();
      fixture.detectChanges();
      const filas = Array.from(fixture.nativeElement.querySelectorAll('.due-soon-table tbody tr')) as HTMLElement[];
      expect(filas).toHaveLength(2);
      expect(filas[0].textContent).toContain('Trabajo 7');
      expect(filas[0].textContent).toContain('20/08/2027');
      expect(filas[0].querySelector('.due-soon-badge--critical')?.textContent?.trim()).toBe('4 días');
      expect(filas[1].querySelector('.due-soon-badge--critical')).toBeNull();
      // Sin permisos: ni recordar ni ver el detalle
      expect(fixture.nativeElement.querySelector('.due-soon-action')).toBeNull();
      expect(texto()).not.toContain('Recordar a todos');

      ojo()!.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#dueSoonSection')).toBeNull();
    });

    it('quien puede recordar envía uno o todos; un trabajo recordado hoy lo indica', () => {
      mockFacadeService.dueSoonProjects.set([trabajo('7', 0), trabajo('8', 10)]);
      mockFacadeService.totalDueSoon.set(2);
      mockFacadeService.canRemind.set(true);
      mockFacadeService.canOpenDetails.set(true);
      mockFacadeService.remindedToday.set(new Set(['8']));
      fixture.detectChanges();
      ojo()!.click();
      fixture.detectChanges();

      const filas = Array.from(fixture.nativeElement.querySelectorAll('.due-soon-table tbody tr')) as HTMLElement[];
      expect(filas[0].textContent).toContain('Vence hoy');
      expect(filas[0].querySelector('a.due-soon-action')?.getAttribute('href')).toBe('/thesis-work/details/7');
      (filas[0].querySelector('.due-soon-action--remind') as HTMLButtonElement).click();
      expect(mockFacadeService.remind).toHaveBeenCalledWith(mockFacadeService.dueSoonProjects()[0]);
      expect(filas[1].textContent).toContain('Recordado hoy');
      expect(filas[1].querySelector('.due-soon-action--remind')).toBeNull();

      const todos = fixture.debugElement.queryAll(By.css('app-button-component'))
        .find(boton => boton.componentInstance.label === 'Recordar a todos');
      todos!.componentInstance.onClick.emit();
      expect(mockFacadeService.remindAll).toHaveBeenCalled();
    });
  });
  describe('Acciones', () => {
    it('al generar el reporte abre el modal para elegir el formato, sin descargar todavía', () => {
      component.handleDownloadReport();
      fixture.detectChanges();
      expect(component['isReportModalOpen']()).toBe(true);
      expect(mockFacadeService.downloadReport).not.toHaveBeenCalled();
    });

    it('descarga el reporte en el formato elegido en el modal', async () => {
      await component.onReportFormatSelected('excel');
      expect(mockFacadeService.downloadReport).toHaveBeenCalledWith('excel');
    });

    it('si no se puede generar el archivo, lo avisa', async () => {
      const error = jest.spyOn(TestBed.inject(NotificationService), 'error').mockImplementation(() => {});
      mockFacadeService.downloadReport.mockRejectedValue(new Error('sin librería'));
      await component.onReportFormatSelected('excel');
      expect(error).toHaveBeenCalledWith('No se generó el reporte', expect.any(String));
    });
  });
});
