// 1. Angular y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';

// 2. Componente y Servicios
import { SustentationDetailsPageComponent } from './sustentation-details-page.component';
import { SustentationDetailsFacadeService } from './services/sustentation-details-facade.service';
import { SustentationDetailsView } from './models/sustentation-details.model';

// ── Interfaces Estrictas para Spies ──────────────────────────────────────────

interface MockParamMap {
  get: jest.Mock;
  has: jest.Mock;
}

interface MockRouteSnapshot {
  paramMap: MockParamMap;
  parent: MockRouteSnapshot | null;
}

interface MockActivatedRoute {
  snapshot: MockRouteSnapshot;
  parent: MockActivatedRoute | null;
}

interface MockRouter {
  navigate: jest.Mock;
}

interface MockSustentationDetailsFacadeService {
  isLoading: WritableSignal<boolean>;
  viewData: WritableSignal<SustentationDetailsView | null>;
  loadDetails: jest.Mock;
  showError: jest.Mock;
  downloadDocument: jest.Mock;
}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('SustentationDetailsPageComponent', () => {
  let component: SustentationDetailsPageComponent;
  let fixture: ComponentFixture<SustentationDetailsPageComponent>;

  let facadeSpy: MockSustentationDetailsFacadeService;
  let routerSpy: MockRouter;

  // Variables de control de ruta para manipular los tests fácilmente sin mutaciones peligrosas
  let parentSnapshotParamMapMock: MockParamMap;
  let childSnapshotParamMapMock: MockParamMap;
  let routeMock: MockActivatedRoute;

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola para los flujos de error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicializamos el espía del router
    routerSpy = { navigate: jest.fn() };

    // Inicializamos el espía de la fachada con señales reactivas reales
    facadeSpy = {
      isLoading: signal(false),
      viewData: signal(null),
      loadDetails: jest.fn(),
      showError: jest.fn(),
      downloadDocument: jest.fn()
    };

    // Configuramos los mocks anidados de ParamMap
    parentSnapshotParamMapMock = {
      get: jest.fn().mockReturnValue('thesis-123'),
      has: jest.fn().mockReturnValue(true) // Simula que el padre tiene el parámetro 'id'
    };

    childSnapshotParamMapMock = {
      get: jest.fn((param: string) => param === 'sustentationId' ? 'sus-456' : null),
      has: jest.fn().mockReturnValue(false) // Simula que el hijo NO tiene el parámetro 'id'
    };

    // Construimos el árbol de la ruta
    const parentSnapshot: MockRouteSnapshot = {
      paramMap: parentSnapshotParamMapMock,
      parent: null
    };

    const childSnapshot: MockRouteSnapshot = {
      paramMap: childSnapshotParamMapMock,
      parent: parentSnapshot
    };

    const parentRoute: MockActivatedRoute = {
      snapshot: parentSnapshot,
      parent: null
    };

    routeMock = {
      snapshot: childSnapshot,
      parent: parentRoute
    };

    await TestBed.configureTestingModule({
      imports: [SustentationDetailsPageComponent],
      providers: [
        { provide: SustentationDetailsFacadeService, useValue: facadeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeMock } // Tipado estructural limpio, sin 'as unknown'
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SustentationDetailsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit e inicialización (Manejo de Rutas)', () => {
    it('debe extraer ambos IDs correctamente (atravesando el árbol) y cargar los detalles', () => {
      // Act
      fixture.detectChanges(); // Dispara ngOnInit

      // Assert
      expect(facadeSpy.loadDetails).toHaveBeenCalledWith('thesis-123', 'sus-456');
      expect(facadeSpy.showError).not.toHaveBeenCalled();
    });

    it('debe mostrar error y regresar a la vista de documentos si falta el ID de la tesis en todo el árbol', () => {
      // Simula que al buscar el 'id' hacia arriba en el árbol, ningún padre lo tiene
      parentSnapshotParamMapMock.has.mockReturnValue(false);

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeSpy.showError).toHaveBeenCalledWith('Error', 'Identificadores inválidos.');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeSpy.loadDetails).not.toHaveBeenCalled();
    });

    it('debe mostrar error y regresar a la vista de documentos si falta el ID de la sustentación', () => {
      // Simula que la ruta no tiene el parámetro 'sustentationId'
      childSnapshotParamMapMock.get.mockReturnValue(null);

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeSpy.showError).toHaveBeenCalledWith('Error', 'Identificadores inválidos.');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeSpy.loadDetails).not.toHaveBeenCalled();
    });
  });

  describe('Navegación general', () => {
    it('navigateToCorrectedDocuments debe navegar con relativeTo a la ruta actual', () => {
      // Act
      component.navigateToCorrectedDocuments();

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['../../corrected_documents'], { relativeTo: routeMock });
    });

    it('goBack debe navegar con relativeTo a la ruta padre', () => {
      // Act
      component.goBack();

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });
});
