import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { ArchivedProcessComponent } from './archived-process.component';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { ArchivedProcessFacadeService } from './services/archived-process-facade.service';
import { ArchivedRecordView } from './interfaces/archived-record-view.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

describe('ArchivedProcessComponent', () => {
  let component: ArchivedProcessComponent;
  let fixture: ComponentFixture<ArchivedProcessComponent>;

  // Mocks de dependencias
  let mockRouter: { navigate: jest.Mock };
  let mockFacade: { loadRecord: jest.Mock; showInvalidRouteError: jest.Mock; showNotFoundError: jest.Mock; downloadDocument: jest.Mock };
  let mockBreadcrumbService: { setDynamicBreadcrumb: jest.Mock; setDynamicTitle: jest.Mock; clearDynamicBreadcrumb: jest.Mock };
  let mockTitleService: { setTitle: jest.Mock };
  let mockParamMap: { get: jest.Mock };

  // Data falsa tipada
  const mockRecord: ArchivedRecordView = {
    title: 'Proyecto de Prueba',
    status: 'ARCHIVADO',
    modality: 'Investigación',
    studentName: 'Juan Pérez',
    directorName: 'Dra. María Gómez',
    documents: [],
  };

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };
    mockFacade = {
      loadRecord: jest.fn(),
      showInvalidRouteError: jest.fn(),
      showNotFoundError: jest.fn(),
      downloadDocument: jest.fn(),
    };
    mockBreadcrumbService = {
      setDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn(),
      clearDynamicBreadcrumb: jest.fn(),
    };
    mockTitleService = { setTitle: jest.fn() };
    mockParamMap = { get: jest.fn() };

    const mockActivatedRoute = {
      snapshot: { paramMap: mockParamMap },
    };

    await TestBed.configureTestingModule({
      imports: [ArchivedProcessComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ArchivedProcessFacadeService, useValue: mockFacade },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: Title, useValue: mockTitleService },
      ],
    }).compileComponents();
  });

  const initializeComponent = () => {
    fixture = TestBed.createComponent(ArchivedProcessComponent);
    component = fixture.componentInstance;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Validación de Rutas (ngOnInit)', () => {
    it('debería mostrar error de ruta y regresar si no hay tipo (type) en los parámetros', () => {
      mockParamMap.get.mockImplementation((key: string) => (key === 'id' ? '123' : null));
      initializeComponent();
      fixture.detectChanges(); // Dispara ngOnInit

      expect(mockFacade.showInvalidRouteError).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/history']);
      expect(component.processType()).toBe('');
    });

    it('debería mostrar error de ruta y regresar si el tipo es inválido', () => {
      mockParamMap.get.mockImplementation((key: string) => (key === 'type' ? 'tipo-inventado' : '123'));
      initializeComponent();
      fixture.detectChanges();

      expect(mockFacade.showInvalidRouteError).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/history']);
    });

    it('debería mostrar error no encontrado si la ruta es válida pero el registro no existe', () => {
      mockParamMap.get.mockImplementation((key: string) => (key === 'type' ? 'propuestas' : '999'));
      mockFacade.loadRecord.mockReturnValue(null);
      initializeComponent();
      fixture.detectChanges();

      expect(mockFacade.loadRecord).toHaveBeenCalledWith('propuestas', '999');
      expect(mockFacade.showNotFoundError).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/history']);
      expect(component.record()).toBeNull();
    });

    it('debería cargar el registro exitosamente si los parámetros son válidos y el registro existe', () => {
      mockParamMap.get.mockImplementation((key: string) => (key === 'type' ? 'trabajos' : '456'));
      mockFacade.loadRecord.mockReturnValue(mockRecord);

      initializeComponent();
      fixture.detectChanges();

      expect(component.processType()).toBe('trabajos');
      expect(component.record()).toEqual(mockRecord);
      expect(mockFacade.showInvalidRouteError).not.toHaveBeenCalled();
      expect(mockFacade.showNotFoundError).not.toHaveBeenCalled();
    });
  });

  describe('Efectos (effect) y Ciclo de Vida (ngOnDestroy)', () => {
    it('debería actualizar los breadcrumbs y el título correctamente (con retraso asíncrono)', fakeAsync(() => {
      mockParamMap.get.mockImplementation((key: string) => (key === 'type' ? 'anteproyectos' : '123'));
      mockFacade.loadRecord.mockReturnValue(mockRecord);

      initializeComponent();
      fixture.detectChanges(); // Ejecuta ngOnInit y registra el effect

      tick(); // Avanzamos el tiempo simulado para consumir el setTimeout dentro del effect

      expect(mockBreadcrumbService.setDynamicBreadcrumb).toHaveBeenCalledWith('Detalle de ANTEPROYECTOS');
      expect(mockBreadcrumbService.setDynamicTitle).toHaveBeenCalledWith('Historial - ANTEPROYECTOS');
      expect(mockTitleService.setTitle).toHaveBeenCalledWith('Historial - ANTEPROYECTOS');
    }));

    it('debería usar DOCUMENTO como respaldo si processType está vacío en el effect', fakeAsync(() => {
      mockParamMap.get.mockReturnValue(null);
      initializeComponent();
      fixture.detectChanges();

      tick();

      expect(mockTitleService.setTitle).toHaveBeenCalledWith('Historial - DOCUMENTO');
    }));

    it('debería limpiar los breadcrumbs en ngOnDestroy', () => {
      initializeComponent();
      component.ngOnDestroy();

      expect(mockBreadcrumbService.clearDynamicBreadcrumb).toHaveBeenCalled();
      expect(mockBreadcrumbService.setDynamicTitle).toHaveBeenCalledWith(null);
    });
  });

  describe('Acciones de Usuario', () => {
    beforeEach(() => {
      mockParamMap.get.mockImplementation((key: string) => (key === 'type' ? 'propuestas' : '123'));
      mockFacade.loadRecord.mockReturnValue(mockRecord);
      initializeComponent();
      fixture.detectChanges();
    });

    it('debería delegar la descarga de documento al facade', () => {
      // Uso de 'as unknown as FileDocument' para prevenir errores de enums faltantes
      const docMock = {
        id: 'doc-1',
        name: 'archivo.pdf',
        url: 'http://localhost/archivo.pdf',
      } as unknown as FileDocument;

      component.downloadDocument(docMock);

      expect(mockFacade.downloadDocument).toHaveBeenCalledWith(docMock);
    });

    it('debería navegar hacia atrás al llamar goBack()', () => {
      mockRouter.navigate.mockClear();

      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/history']);
    });
  });
});
