import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadFinalDeliveryPageComponent } from './upload-final-delivery-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { UploadFinalDeliveryFacadeService } from './services/upload-final-delivery-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { NO_ERRORS_SCHEMA } from '@angular/core';

// Utilidad para tipar profundamente mocks sin usar 'any' ni 'unknown'
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe('UploadFinalDeliveryPageComponent', () => {
  let component: UploadFinalDeliveryPageComponent;
  let fixture: ComponentFixture<UploadFinalDeliveryPageComponent>;

  // Tipados estrictos sin usar 'unknown'
  let facadeMock: {
    loadThesisWork: jest.Mock;
    processFinalDelivery: jest.Mock;
    showNavigationError: jest.Mock;
  };

  let routerMock: {
    navigate: jest.Mock;
  };

  let activatedRouteMock: {
    snapshot: { paramMap: { get: jest.Mock } };
    parent: { snapshot: { paramMap: { get: jest.Mock } }; parent: null } | null;
  };

  const mockThesisWork: DeepPartial<ThesisWork> = {
    thesisWorkId: '123',
    preliminaryDraftData: {
      proposalData: {}
    }
  };

  beforeEach(async () => {
    // Inicialización limpia
    facadeMock = {
      loadThesisWork: jest.fn(),
      processFinalDelivery: jest.fn(),
      showNavigationError: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    // Estructura exacta que requiere el while() del componente
    activatedRouteMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
        parent: null,
      },
    };

    await TestBed.configureTestingModule({
      imports: [UploadFinalDeliveryPageComponent],
      providers: [
        { provide: UploadFinalDeliveryFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      // NO_ERRORS_SCHEMA permite probar el "Smart Component" ignorando los selectores hijos (Dumb Components)
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(UploadFinalDeliveryPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit()', () => {
    it('debería cargar el trabajo de grado si el ID está presente', () => {
      // Arrange
      facadeMock.loadThesisWork.mockImplementation((id: string, onSuccess: (data: DeepPartial<ThesisWork>) => void) => {
        onSuccess(mockThesisWork);
      });

      // Act
      fixture.detectChanges(); // Ejecuta ngOnInit

      // Assert
      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith('123', expect.any(Function), expect.any(Function));
      expect(component.thesisWorkState()).toEqual(mockThesisWork);
    });

    it('debería mostrar error de navegación y volver atrás si no hay ID en ninguna ruta', () => {
      // Arrange
      activatedRouteMock.snapshot.paramMap.get.mockReturnValue(null);
      if (activatedRouteMock.parent) {
        activatedRouteMock.parent.snapshot.paramMap.get.mockReturnValue(null);
      }

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], {
        relativeTo: activatedRouteMock.parent
      });
    });
  });

  describe('handleRequestConfirmation()', () => {
    it('debería guardar los archivos en pendiente y abrir el modal', () => {
      // Arrange
      const mockFiles = { monograph: new File([''], 'm.pdf'), formatE: new File([''], 'e.pdf') };

      // Act
      component.handleRequestConfirmation(mockFiles);

      // Assert
      expect(component.pendingFilesData()).toEqual(mockFiles);
      expect(component.isConfirmModalOpen()).toBe(true);
    });
  });

  describe('processFinalDelivery()', () => {
    const mockFiles = { monograph: new File([''], 'm.pdf'), formatE: new File([''], 'e.pdf') };

    beforeEach(() => {
      // Establecemos el estado necesario para poder procesar la entrega
      component.thesisWorkState.set(mockThesisWork as ThesisWork);
      component.pendingFilesData.set(mockFiles);
    });

    it('debería procesar la entrega, cerrar modales y navegar atrás al tener éxito', () => {
      // Arrange
      facadeMock.processFinalDelivery.mockImplementation(
        (id: string, files: typeof mockFiles, onSuccess: () => void) => onSuccess()
      );

      // Act
      component.processFinalDelivery();

      // Assert
      // Aunque isSubmitting se pone a true temporalmente, el callback síncrono lo pasa a false
      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], {
        relativeTo: activatedRouteMock.parent
      });
    });

    it('debería procesar la entrega y mantener al usuario en pantalla si hay un error', () => {
      // Arrange
      facadeMock.processFinalDelivery.mockImplementation(
        (id: string, files: typeof mockFiles, onSuccess: () => void, onError: () => void) => onError()
      );

      // Act
      component.processFinalDelivery();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('no debería ejecutar la lógica de guardado si no hay archivos pendientes', () => {
      // Arrange
      component.pendingFilesData.set(null);

      // Act
      component.processFinalDelivery();

      // Assert
      expect(facadeMock.processFinalDelivery).not.toHaveBeenCalled();
    });

    it('no debería ejecutar la lógica de guardado si no existe una tesis cargada (id null)', () => {
      // Arrange
      component.thesisWorkState.set(null);

      // Act
      component.processFinalDelivery();

      // Assert
      expect(facadeMock.processFinalDelivery).not.toHaveBeenCalled();
    });
  });
});
