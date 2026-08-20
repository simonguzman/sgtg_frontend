import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterCorrespondencePageComponent } from './register-correspondence-page.component';
import { RegisterCorrespondenceFacadeService } from './services/register-correspondence-facade.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ThesisWork } from '../../interfaces/thesis-work.interface';

// --- IMPORTANTE: Importamos los componentes reales para poder removerlos ---
import { RegisterCorrespondenceFormComponent } from '../../components/register-correspondence-form/register-correspondence-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// --- Interfaces para Tipado Estricto (Cero ANY) ---
interface MockParamMap {
  get: jest.Mock;
}
interface MockRouteSnapshot {
  paramMap: MockParamMap;
}
interface MockActivatedRoute {
  snapshot: MockRouteSnapshot;
  parent?: { snapshot: MockRouteSnapshot };
}

// --- Mocks de Componentes Hijos ---
@Component({ selector: 'app-register-correspondence-form', standalone: true, template: '' })
class MockFormComponent {
  @Input() thesisWork!: ThesisWork;
  @Input() isSubmitting!: boolean;
  @Output() onSave = new EventEmitter<File>();
  @Output() onGoBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockModalComponent {
  @Input() isOpen!: boolean;
  @Input() description!: string;
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

describe('RegisterCorrespondencePageComponent', () => {
  let component: RegisterCorrespondencePageComponent;
  let fixture: ComponentFixture<RegisterCorrespondencePageComponent>;

  let facadeMock: {
    loadThesisWork: jest.Mock;
    processCorrespondence: jest.Mock;
    showNavigationError: jest.Mock;
  };
  let routerMock: { navigate: jest.Mock };
  let routeMock: MockActivatedRoute;

  const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });
  // Casteo limpio exclusivo para respuestas de API de objetos pesados
  const mockThesisWork = { thesisWorkId: '123' } as unknown as ThesisWork;

  beforeEach(async () => {
    // Inicialización fresca de Mocks por cada prueba
    facadeMock = {
      loadThesisWork: jest.fn(),
      processCorrespondence: jest.fn(),
      showNavigationError: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    routeMock = {
      snapshot: { paramMap: { get: jest.fn() } },
      parent: { snapshot: { paramMap: { get: jest.fn() } } }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterCorrespondencePageComponent]
    })
    .overrideComponent(RegisterCorrespondencePageComponent, {
      remove: {
        imports: [
          // Removemos los componentes reales para evitar el conflicto NG0300
          RegisterCorrespondenceFormComponent,
          ConfirmationActionModalComponent
        ]
      },
      add: {
        imports: [
          // Inyectamos nuestros mocks aislados
          MockFormComponent,
          MockModalComponent
        ]
      }
    })
    .overrideProvider(RegisterCorrespondenceFacadeService, { useValue: facadeMock })
    .overrideProvider(Router, { useValue: routerMock })
    .overrideProvider(ActivatedRoute, { useValue: routeMock })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrespondencePageComponent);
    component = fixture.componentInstance;

    // NOTA: NO llamamos fixture.detectChanges() aquí,
    // lo hacemos en cada test después de configurar el RouteMock.
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Enrutamiento', () => {
    it('debería mostrar error y retroceder si no hay ID en la ruta', () => {
      // Configuramos el mock de ruta para devolver null
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges(); // Ejecuta ngOnInit

      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('debería cargar el thesisWork si el ID está en el padre', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue('id-del-padre');

      fixture.detectChanges(); // Ejecuta ngOnInit

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'id-del-padre',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería mutar el estado correctamente cuando la carga es exitosa', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue('tw-123');

      // Simulamos la respuesta exitosa ejecutando el callback
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));

      fixture.detectChanges(); // Ejecuta ngOnInit

      expect(component.thesisWorkDetails()).toEqual(mockThesisWork);
    });

    it('debería navegar hacia atrás si la carga falla', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue('tw-123');

      // Simulamos la respuesta de error ejecutando el callback
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess, onError) => onError());

      fixture.detectChanges(); // Ejecuta ngOnInit

      expect(routerMock.navigate).toHaveBeenCalled();
    });
  });

  describe('Interacción de Usuario y Formularios', () => {
    beforeEach(() => {
      // Configuramos estado inicial válido para las pruebas de acciones
      routeMock.snapshot.paramMap.get.mockReturnValue('tw-123');
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));
      fixture.detectChanges(); // Inicializa el componente con datos válidos
    });

    it('debería abrir el modal de confirmación y setear el archivo al solicitar guardar', () => {
      component.handleRequestConfirmation(mockFile);

      expect(component.pendingFile()).toEqual(mockFile);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('no debería procesar si no hay archivo (estado inválido)', () => {
      component.pendingFile.set(null);

      component.processCorrespondence();

      expect(facadeMock.processCorrespondence).not.toHaveBeenCalled();
    });

    it('debería delegar el procesamiento al facade correctamente (Éxito)', () => {
      component.handleRequestConfirmation(mockFile); // Set archivo y abrir modal

      // Simulamos callback de éxito
      facadeMock.processCorrespondence.mockImplementation((id, file, onSuccess) => onSuccess());

      component.processCorrespondence();

      // Verifica estados inmediatos
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processCorrespondence).toHaveBeenCalledWith(
        '123',
        mockFile,
        expect.any(Function),
        expect.any(Function)
      );

      // Verifica estado posterior al callback onSuccess
      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalled();
    });

    it('debería resetear estado de carga al fallar el procesamiento (Error)', () => {
      component.handleRequestConfirmation(mockFile); // Set archivo y abrir modal

      // Simulamos callback de error
      facadeMock.processCorrespondence.mockImplementation((id, file, onSuccess, onError) => onError());

      component.processCorrespondence();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled(); // No navega si falla
    });
  });
});
