import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { SustentationDetailsPageComponent } from './sustentation-details-page.component';
import { SustentationDetailsFacadeService } from './services/sustentation-details-facade.service';
import { SustentationDetailsView } from './models/sustentation-details.model';

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

describe('SustentationDetailsPageComponent', () => {
  let component: SustentationDetailsPageComponent;
  let fixture: ComponentFixture<SustentationDetailsPageComponent>;

  let facadeSpy: MockSustentationDetailsFacadeService;
  let routerSpy: MockRouter;

  let parentSnapshotParamMapMock: MockParamMap;
  let childSnapshotParamMapMock: MockParamMap;
  let routeMock: MockActivatedRoute;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    routerSpy = { navigate: jest.fn() };

    facadeSpy = {
      isLoading: signal(false),
      viewData: signal(null),
      loadDetails: jest.fn(),
      showError: jest.fn(),
      downloadDocument: jest.fn()
    };

    parentSnapshotParamMapMock = {
      get: jest.fn().mockReturnValue('thesis-123'),
      has: jest.fn().mockReturnValue(true)
    };

    childSnapshotParamMapMock = {
      get: jest.fn((param: string) => param === 'sustentationId' ? 'sus-456' : null),
      has: jest.fn().mockReturnValue(false)
    };

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
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SustentationDetailsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit e inicialización (Manejo de Rutas)', () => {
    it('debe extraer ambos IDs correctamente (atravesando el árbol) y cargar los detalles', () => {
      fixture.detectChanges();

      expect(facadeSpy.loadDetails).toHaveBeenCalledWith('thesis-123', 'sus-456');
      expect(facadeSpy.showError).not.toHaveBeenCalled();
    });

    it('debe mostrar error y regresar a la vista de documentos si falta el ID de la tesis en todo el árbol', () => {
      parentSnapshotParamMapMock.has.mockReturnValue(false);

      fixture.detectChanges();

      expect(facadeSpy.showError).toHaveBeenCalledWith('Error', 'Identificadores inválidos.');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeSpy.loadDetails).not.toHaveBeenCalled();
    });

    it('debe mostrar error y regresar a la vista de documentos si falta el ID de la sustentación', () => {
      childSnapshotParamMapMock.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(facadeSpy.showError).toHaveBeenCalledWith('Error', 'Identificadores inválidos.');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeSpy.loadDetails).not.toHaveBeenCalled();
    });
  });

  describe('Navegación general', () => {
    it('navigateToCorrectedDocuments debe navegar con relativeTo a la ruta actual', () => {
      component.navigateToCorrectedDocuments();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['../../corrected_documents'], { relativeTo: routeMock });
    });

    it('goBack debe navegar con relativeTo a la ruta padre', () => {
      component.goBack();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });
});
