import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { SustentationDetailsPageComponent } from './sustentation-details-page.component';
import { SustentationDetailsFacadeService } from './services/sustentation-details-facade.service';
import { signal } from '@angular/core';

// Interfaz fuertemente tipada para simular el ActivatedRouteSnapshot y evitar el uso de 'any'
interface MockRouteSnapshot {
  paramMap: {
    get: jest.Mock;
    has: jest.Mock;
  };
  parent: MockRouteSnapshot | null;
}

describe('SustentationDetailsPageComponent', () => {
  let component: SustentationDetailsPageComponent;
  let fixture: ComponentFixture<SustentationDetailsPageComponent>;
  let facadeSpy: jest.Mocked<SustentationDetailsFacadeService>;
  let routerSpy: jest.Mocked<Router>;

  // Tipamos la ruta inyectada y el snapshot simulado
  let routeSnapshotMock: MockRouteSnapshot;
  let routeSpy: { snapshot: MockRouteSnapshot; parent: { snapshot: MockRouteSnapshot } };

  beforeEach(async () => {
    facadeSpy = {
      isLoading: signal(false),
      viewData: signal(null),
      loadDetails: jest.fn(),
      showError: jest.fn(),
      downloadDocument: jest.fn()
    } as unknown as jest.Mocked<SustentationDetailsFacadeService>;

    routerSpy = { navigate: jest.fn() } as unknown as jest.Mocked<Router>;

    // Configuramos el árbol de snapshots sin 'any'
    const parentSnapshot: MockRouteSnapshot = {
      paramMap: { get: jest.fn().mockReturnValue('thesis-123'), has: jest.fn().mockReturnValue(true) },
      parent: null
    };

    routeSnapshotMock = {
      paramMap: { get: jest.fn().mockReturnValue('sus-456'), has: jest.fn().mockReturnValue(false) },
      parent: parentSnapshot
    };

    routeSpy = {
      snapshot: routeSnapshotMock,
      parent: { snapshot: parentSnapshot }
    };

    await TestBed.configureTestingModule({
      imports: [SustentationDetailsPageComponent],
      providers: [
        { provide: SustentationDetailsFacadeService, useValue: facadeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeSpy as unknown as ActivatedRoute }
      ]
    })
    .overrideComponent(SustentationDetailsPageComponent, {
      remove: { imports: [] },
      add: { imports: [] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(SustentationDetailsPageComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit e inicialización', () => {
    it('debe extraer ambos IDs correctamente y cargar los detalles', () => {
      // El setup por defecto tiene sustentationId='sus-456' en la ruta actual
      // e id='thesis-123' en la ruta padre.
      routeSnapshotMock.paramMap.get.mockImplementation(param => param === 'sustentationId' ? 'sus-456' : null);

      fixture.detectChanges();

      expect(facadeSpy.loadDetails).toHaveBeenCalledWith('thesis-123', 'sus-456');
    });

    it('debe mostrar error y regresar si falta el ID de la tesis (recorriendo el snapshot)', () => {
      // Simulamos que el padre tampoco tiene el ID
      routeSnapshotMock.parent!.paramMap.has.mockReturnValue(false);
      routeSnapshotMock.paramMap.get.mockReturnValue('sus-456'); // Solo hay sustentationId

      fixture.detectChanges();

      expect(facadeSpy.showError).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.any(Object));
      expect(facadeSpy.loadDetails).not.toHaveBeenCalled();
    });

    it('debe mostrar error y regresar si falta el ID de la sustentación', () => {
      routeSnapshotMock.paramMap.get.mockReturnValue(null); // No hay sustentationId

      fixture.detectChanges();

      expect(facadeSpy.showError).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.any(Object));
      expect(facadeSpy.loadDetails).not.toHaveBeenCalled();
    });
  });

  describe('navegación', () => {
    it('navigateToCorrectedDocuments debe navegar con relativeTo a la ruta actual', () => {
      component.navigateToCorrectedDocuments();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['../../corrected_documents'], { relativeTo: routeSpy });
    });

    it('goBack debe navegar con relativeTo a la ruta padre', () => {
      component.goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeSpy.parent });
    });
  });
});
