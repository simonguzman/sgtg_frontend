import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterSpecialRequestPageComponent, SpecialRequestData } from './register-special-request-page.component';
import { RegisterSpecialRequestFacadeService } from './services/register-special-request-facade.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';

// IMPORTACIONES REALES
import { RegisterSpecialRequestFormComponent } from '../../components/register-special-request-form/register-special-request-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// --- Interfaces de Mocks Estrictos (Cero ANY / Cero UNKNOWN) ---
interface MockFacadeService {
  loadThesisWork: jest.Mock;
  processSaveRequest: jest.Mock;
}

interface MockRouter {
  navigate: jest.Mock;
}

// --- Mocks de Componentes Hijos ---
@Component({ selector: 'app-register-special-request-form', standalone: true, template: '' })
class MockRegisterSpecialRequestFormComponent {
  @Input() thesisWork!: ThesisWork;
  @Input() isSubmitting: boolean = false;
  @Output() onSaveRequest = new EventEmitter<SpecialRequestData>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen: boolean = false;
  @Input() description: string = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

describe('RegisterSpecialRequestPageComponent', () => {
  let component: RegisterSpecialRequestPageComponent;
  let fixture: ComponentFixture<RegisterSpecialRequestPageComponent>;

  let facadeMock: MockFacadeService;
  let routerMock: MockRouter;

  // Objeto mock para simular el parent route de forma estricta
  const mockParentRoute = {
    snapshot: { paramMap: { get: jest.fn() } }
  };

  const activatedRouteMock = {
    snapshot: { paramMap: { get: jest.fn().mockReturnValue('thesis-123') } },
    parent: mockParentRoute
  };

  // Cast validado sin unknown
  const mockThesisWork = { thesisWorkId: 'thesis-123' } as ThesisWork;

  beforeEach(async () => {
    facadeMock = {
      loadThesisWork: jest.fn(),
      processSaveRequest: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [RegisterSpecialRequestPageComponent],
      providers: [
        { provide: RegisterSpecialRequestFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    })
    .overrideComponent(RegisterSpecialRequestPageComponent, {
      remove: { imports: [RegisterSpecialRequestFormComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockRegisterSpecialRequestFormComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSpecialRequestPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ngOnInit - Inicialización', () => {
    it('debería cargar el trabajo de grado si hay ID', () => {
      // Simula ejecución síncrona del callback de éxito
      facadeMock.loadThesisWork.mockImplementation(
        (id: string, onSuccess: (w: ThesisWork) => void) => onSuccess(mockThesisWork)
      );

      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'thesis-123',
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
      expect(component.thesisWorkData()).toEqual(mockThesisWork);
      expect(component.isLoading()).toBe(false);
    });

    it('debería regresar si el trabajo no es encontrado', () => {
      // Simula ejecución síncrona del callback de no encontrado
      facadeMock.loadThesisWork.mockImplementation(
        (id: string, onSuccess: unknown, onNotFound: () => void) => onNotFound()
      );

      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      // Validación estricta del objeto de navegación
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: mockParentRoute });
    });

    it('debería quitar el estado de carga si ocurre un error en la petición', () => {
      // Simula ejecución síncrona del callback de error
      facadeMock.loadThesisWork.mockImplementation(
        (id: string, onSuccess: unknown, onNotFound: unknown, onError: () => void) => onError()
      );

      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(component.thesisWorkData()).toBeUndefined();
    });
  });

  describe('Flujo de Confirmación y Guardado', () => {
    let payload: SpecialRequestData;

    beforeEach(() => {
      payload = { requestType: Object.values(SpecialRequestType)[0], comments: 'Prueba' };

      facadeMock.loadThesisWork.mockImplementation(
        (id: string, onSuccess: (w: ThesisWork) => void) => onSuccess(mockThesisWork)
      );
      fixture.detectChanges();
    });

    it('handleRequestConfirmation debería abrir el modal y guardar los datos pendientes', () => {
      component.handleRequestConfirmation(payload);

      expect(component.pendingData()).toEqual(payload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('processSaveRequest no debería hacer nada si no hay data pendiente', () => {
      component.pendingData.set(null);

      component.processSaveRequest();

      expect(facadeMock.processSaveRequest).not.toHaveBeenCalled();
    });

    it('processSaveRequest debería cerrar el modal y llamar al facade para guardar con éxito', () => {
      component.pendingData.set(payload);

      facadeMock.processSaveRequest.mockImplementation(
        (id: string, data: SpecialRequestData, onSuccess: () => void) => onSuccess()
      );

      component.processSaveRequest();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processSaveRequest).toHaveBeenCalledWith(
        'thesis-123',
        payload,
        expect.any(Function),
        expect.any(Function)
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: mockParentRoute });
    });

    it('processSaveRequest debería quitar estado isSubmitting pero no navegar si falla el guardado', () => {
      component.pendingData.set(payload);

      facadeMock.processSaveRequest.mockImplementation(
        (id: string, data: SpecialRequestData, onSuccess: unknown, onError: () => void) => onError()
      );

      component.processSaveRequest();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
