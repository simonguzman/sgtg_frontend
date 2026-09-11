// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// 2. Componente a probar
import { UploadFinalDeliveryPageComponent } from './upload-final-delivery-page.component';

// 3. Servicios y Facades
import { UploadFinalDeliveryFacadeService } from './services/upload-final-delivery-facade.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importamos los componentes reales para removerlos en el override
import { UploadFinalDeliveryFormComponent } from '../../components/upload-final-delivery-form/upload-final-delivery-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// ── Mocks de Componentes Hijos (Standalone) ──────────────────────────────────

@Component({ selector: 'app-upload-final-delivery-form', template: '', standalone: true })
class MockUploadFinalDeliveryFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveDelivery = new EventEmitter<{ monograph: File; formatE: File; annexes?: File }>();
  @Output() onGoBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'DeepPartial') ────────

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockUploadFinalDeliveryFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processFinalDelivery: jest.Mock<void, [string, { monograph: File; formatE: File; annexes?: File }, () => void, () => void]>;
  showNavigationError: jest.Mock<void, []>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'p-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Título Mock',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    }
  };
  return { ...baseThesis, ...overrides };
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('UploadFinalDeliveryPageComponent', () => {
  let component: UploadFinalDeliveryPageComponent;
  let fixture: ComponentFixture<UploadFinalDeliveryPageComponent>;

  // Tipados estrictos sin usar 'unknown'
  let facadeMock: MockUploadFinalDeliveryFacadeService;
  let routerMock: MockRouter;
  let activatedRouteMock: MockRouteNode;

  const mockThesisWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    // 🔕 Silenciar consola preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Arrange: Inicialización limpia
    facadeMock = {
      loadThesisWork: jest.fn(),
      processFinalDelivery: jest.fn(),
      showNavigationError: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    // Estructura exacta tipada que requiere el bucle while() del componente
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
      ]
    })
    .overrideComponent(UploadFinalDeliveryPageComponent, {
      remove: { imports: [UploadFinalDeliveryFormComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockUploadFinalDeliveryFormComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadFinalDeliveryPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Inicialización y Rutas (ngOnInit)', () => {
    it('debería cargar el trabajo de grado si el ID está presente', () => {
      // Arrange
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));

      // Act
      fixture.detectChanges(); // Ejecuta ngOnInit

      // Assert
      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith('123', expect.any(Function), expect.any(Function));
      expect(component.thesisWorkState()).toEqual(mockThesisWork);
    });

    it('debería mostrar error de navegación y volver atrás si no hay ID en ninguna ruta', () => {
      // Arrange: Forzamos null en todos los niveles
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

  describe('Interacciones (handleRequestConfirmation / goBack)', () => {
    it('handleRequestConfirmation debería guardar los archivos en pendiente y abrir el modal', () => {
      // Arrange
      const mockFiles = { monograph: new File([''], 'm.pdf'), formatE: new File([''], 'e.pdf') };

      // Act
      component.handleRequestConfirmation(mockFiles);

      // Assert
      expect(component.pendingFilesData()).toEqual(mockFiles);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('goBack debería navegar hacia loaded_documents con la ruta relativa correcta', () => {
      // Act
      component.goBack();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], {
        relativeTo: activatedRouteMock.parent
      });
    });
  });

  describe('Envío y Procesamiento (processFinalDelivery)', () => {
    const mockFiles = { monograph: new File([''], 'm.pdf'), formatE: new File([''], 'e.pdf') };

    beforeEach(() => {
      // Arrange: Establecemos el estado necesario para poder procesar la entrega
      component.thesisWorkState.set(mockThesisWork);
      component.pendingFilesData.set(mockFiles);
    });

    it('debería abortar silenciosamente si no hay archivos pendientes', () => {
      // Arrange
      component.pendingFilesData.set(null);

      // Act
      component.processFinalDelivery();

      // Assert
      expect(facadeMock.processFinalDelivery).not.toHaveBeenCalled();
    });

    it('debería abortar silenciosamente si no existe una tesis cargada (id null)', () => {
      // Arrange
      component.thesisWorkState.set(null);

      // Act
      component.processFinalDelivery();

      // Assert
      expect(facadeMock.processFinalDelivery).not.toHaveBeenCalled();
    });

    it('debería procesar la entrega, cerrar modales y navegar atrás al tener éxito', () => {
      // Arrange
      facadeMock.processFinalDelivery.mockImplementation((id, files, onSuccess) => onSuccess());

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
      facadeMock.processFinalDelivery.mockImplementation((id, files, onSuccess, onError) => onError());

      // Act
      component.processFinalDelivery();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      // El modal ya se cerró antes del llamado asíncrono
      expect(component.isConfirmModalOpen()).toBe(false);
      // Nunca navega atrás
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
