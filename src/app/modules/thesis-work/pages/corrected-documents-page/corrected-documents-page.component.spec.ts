import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { CorrectedDocumentsPageComponent } from './corrected-documents-page.component';
import { CorrectedDocumentsFacadeService } from './services/corrected-documents-facade.service';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';

import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { CorrectedDeliveryTableRow } from './models/corrected-documents-page.model';
import { CorrectedDelivery } from '../../interfaces/corrected-delivery.interface';

// --- Tipos Utilitarios e Interfaces Estrictas ---
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

interface MockParamMap {
  get: jest.Mock<string | null, [string]>;
}
interface MockRouteSnapshot {
  paramMap: MockParamMap;
  data: Record<string, unknown>;
}
interface MockActivatedRoute {
  snapshot: MockRouteSnapshot;
  parent: { snapshot: MockRouteSnapshot; parent: null } | null;
}

describe('CorrectedDocumentsPageComponent', () => {
  let component: CorrectedDocumentsPageComponent;
  let fixture: ComponentFixture<CorrectedDocumentsPageComponent>;

  let facadeSpy: jest.Mocked<CorrectedDocumentsFacadeService>;
  let routerSpy: { url: string; navigate: jest.Mock };
  let breadcrumbSpy: jest.Mocked<BreadcrumbService>;

  let allThesisWorksSignal: WritableSignal<ThesisWork[]>;

  let routeSnapshotMock: MockRouteSnapshot;
  let parentSnapshotMock: MockRouteSnapshot;
  let routeSpy: MockActivatedRoute;

  beforeEach(async () => {
    // 1. Mocks de servicios (Tipado estricto con DeepPartial en lugar de unknown)
    facadeSpy = {
      findThesisWork: jest.fn(),
      isDirector: jest.fn().mockReturnValue(false),
      isJuror: jest.fn().mockReturnValue(false),
      canDirectorUpload: jest.fn().mockReturnValue(false),
      canJurorEvaluate: jest.fn().mockReturnValue(false),
      buildTableData: jest.fn().mockReturnValue([]),
      getDeliveryDocumentNames: jest.fn().mockReturnValue([]),
      getStudentName: jest.fn().mockReturnValue(''),
      getDirectorName: jest.fn().mockReturnValue(''),
      getCodirectorName: jest.fn().mockReturnValue(undefined),
      getAdvisorName: jest.fn().mockReturnValue(undefined),
      downloadDocumentByName: jest.fn(),
      showNavigationError: jest.fn()
    } as DeepPartial<CorrectedDocumentsFacadeService> as jest.Mocked<CorrectedDocumentsFacadeService>;

    routerSpy = {
      url: '/thesis-work/details/tw-123/corrected_documents',
      navigate: jest.fn()
    };

    breadcrumbSpy = {
      clearDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn()
    } as DeepPartial<BreadcrumbService> as jest.Mocked<BreadcrumbService>;

    // CORRECCIÓN: Inicializamos el Signal que realmente usa el componente
    allThesisWorksSignal = signal<ThesisWork[]>([]);

    // 2. Configuración del árbol de rutas simulado (Estricto sin casteo a any)
    parentSnapshotMock = {
      paramMap: { get: jest.fn().mockReturnValue('tw-123') },
      data: {}
    };

    routeSnapshotMock = {
      paramMap: { get: jest.fn().mockReturnValue(null) }, // Delega al padre
      data: { isArchived: false }
    };

    routeSpy = {
      snapshot: routeSnapshotMock,
      parent: { snapshot: parentSnapshotMock, parent: null }
    };

    await TestBed.configureTestingModule({
      imports: [CorrectedDocumentsPageComponent],
      providers: [
        { provide: CorrectedDocumentsFacadeService, useValue: facadeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeSpy as DeepPartial<ActivatedRoute> as ActivatedRoute },
        { provide: BreadcrumbService, useValue: breadcrumbSpy },
        // CORRECCIÓN VITAL: Inyectamos allThesisWorks, no thesisWorks
        { provide: ThesisWorkService, useValue: { allThesisWorks: allThesisWorksSignal } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CorrectedDocumentsPageComponent);
    component = fixture.componentInstance;
  });

  // LIMPIEZA: Fundamental para evitar contaminación cruzada de Mocks
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe crearse correctamente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit e inicialización', () => {
    it('debe extraer el ID de la ruta padre y configurar el signal', () => {
      fixture.detectChanges();
      expect(component.thesisWorkId()).toBe('tw-123');
    });

    it('debe detectar si está archivado por el parámetro de ruta data', () => {
      routeSnapshotMock.data = { isArchived: true };
      fixture.detectChanges();
      expect(component.isArchived()).toBe(true);
    });

    it('debe detectar si está archivado por la URL', () => {
      // Modificamos directamente la URL mutable de nuestro routerSpy
      routerSpy.url = '/thesis-work/history/details';
      fixture.detectChanges();
      expect(component.isArchived()).toBe(true);
    });

    it('debe mostrar error y regresar si no encuentra el ID', () => {
      parentSnapshotMock.paramMap.get.mockReturnValue(null);
      fixture.detectChanges();

      expect(facadeSpy.showNavigationError).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/thesis-work']);
    });
  });

  describe('ngOnDestroy', () => {
    it('debe limpiar los breadcrumbs al destruirse', () => {
      fixture.detectChanges();
      component.ngOnDestroy();
      expect(breadcrumbSpy.clearDynamicBreadcrumb).toHaveBeenCalled();
      expect(breadcrumbSpy.setDynamicTitle).toHaveBeenCalledWith(null);
    });
  });

  describe('Interacciones (Eventos de la tabla y descargas)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('handleTableAction debe abrir el modal y setear selectedDelivery', () => {
      // Usamos DeepPartial para evitar 'unknown'
      const mockRawDelivery = { id: 'd-1' } as DeepPartial<CorrectedDelivery> as CorrectedDelivery;
      const event = {
        action: 'view-details',
        row: { rawDelivery: mockRawDelivery } as DeepPartial<CorrectedDeliveryTableRow> as CorrectedDeliveryTableRow
      };

      component.handleTableAction(event);

      expect(component.selectedDelivery()).toEqual(mockRawDelivery);
      expect(component.isDetailsModalOpen()).toBe(true);
    });

    it('downloadDocumentByName debe invocar al facade', () => {
      const mockRawDelivery = { id: 'd-1' } as DeepPartial<CorrectedDelivery> as CorrectedDelivery;
      component.selectedDelivery.set(mockRawDelivery);

      component.downloadDocumentByName('doc.pdf');

      expect(facadeSpy.downloadDocumentByName).toHaveBeenCalledWith(mockRawDelivery, 'doc.pdf');
    });
  });

  describe('Navegación', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('navigateToUploadCorrections debe navegar relativo a la ruta actual', () => {
      component.navigateToUploadCorrections();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['upload_corrections'], { relativeTo: routeSpy });
    });

    it('navigateToEvaluateCorrections debe navegar relativo a la ruta actual', () => {
      component.navigateToEvaluateCorrections();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['evaluate_corrections'], { relativeTo: routeSpy });
    });

    it('goBack debe volver a view_sustentation_details si el proyecto tiene sustentaciones', () => {
      const thesisWithSustentation = { sustentations: [{ id: 'sus-999' }] } as DeepPartial<ThesisWork> as ThesisWork;
      facadeSpy.findThesisWork.mockReturnValue(thesisWithSustentation);

      // CORRECCIÓN: Emitimos el nuevo valor en la señal correcta
      allThesisWorksSignal.set([thesisWithSustentation]);

      component.goBack();

      expect(routerSpy.navigate).toHaveBeenCalledWith([
        '/thesis-work',
        'details',
        'tw-123',
        'view_sustentation_details',
        'sus-999'
      ]);
    });

    it('goBack debe volver a loaded_documents si el proyecto no tiene sustentaciones', () => {
      facadeSpy.findThesisWork.mockReturnValue({} as ThesisWork);

      component.goBack();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/thesis-work', 'details', 'tw-123', 'loaded_documents']);
    });
  });
});
