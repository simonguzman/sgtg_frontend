// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// 2. Componente a probar
import { RegisterCorrespondencePageComponent } from './register-correspondence-page.component';

// 3. Servicios y Facades
import { RegisterCorrespondenceFacadeService } from './services/register-correspondence-facade.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importamos los componentes reales para poder removerlos en el override
import { RegisterCorrespondenceFormComponent } from '../../components/register-correspondence-form/register-correspondence-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// ── Mocks de Componentes Hijos (Standalone y Strict-Init) ────────────────────

@Component({ selector: 'app-register-correspondence-form', standalone: true, template: '' })
class MockFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<File>();
  @Output() onGoBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<Promise<boolean>, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockRegisterCorrespondenceFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processCorrespondence: jest.Mock<void, [string, File, () => void, () => void]>;
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
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
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

describe('RegisterCorrespondencePageComponent', () => {
  let component: RegisterCorrespondencePageComponent;
  let fixture: ComponentFixture<RegisterCorrespondencePageComponent>;

  // Interfaces Mocks estrictas
  let facadeMock: MockRegisterCorrespondenceFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  // Data pre-fabricada
  const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });
  const mockThesisWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    // 🔕 Silenciar consola preventivamente
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización fresca y estructuralmente tipada
    facadeMock = {
      loadThesisWork: jest.fn(),
      processCorrespondence: jest.fn(),
      showNavigationError: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    // Estructura recursiva segura para la ruta
    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterCorrespondencePageComponent],
      providers: [
        { provide: RegisterCorrespondenceFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(RegisterCorrespondencePageComponent, {
      remove: {
        imports: [RegisterCorrespondenceFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockFormComponent, MockModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrespondencePageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks(); // Evita fugas entre tests
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Enrutamiento (ngOnInit)', () => {
    it('debería mostrar error y retroceder si no hay ID en la ruta ni en el padre', () => {
      // Act (El mock de ruta ya devuelve null por defecto en el beforeEach)
      fixture.detectChanges();

      // Assert
      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería cargar el thesisWork si el ID está en el padre', () => {
      // Arrange
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue('id-del-padre');

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'id-del-padre',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería mutar el estado correctamente cuando la carga es exitosa', () => {
      // Arrange
      routeMock.snapshot.paramMap.get.mockReturnValue('tw-123');
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.thesisWorkDetails()).toEqual(mockThesisWork);
    });

    it('debería navegar hacia atrás si la carga falla', () => {
      // Arrange
      routeMock.snapshot.paramMap.get.mockReturnValue('tw-123');
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess, onError) => onError());

      // Act
      fixture.detectChanges();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });

  describe('Interacción de Usuario y Formularios', () => {
    beforeEach(() => {
      // Establecemos el estado base para todas las acciones
      routeMock.snapshot.paramMap.get.mockReturnValue('tw-123');
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));
      fixture.detectChanges();
    });

    it('debería abrir el modal de confirmación y setear el archivo al solicitar guardar', () => {
      // Act
      component.handleRequestConfirmation(mockFile);

      // Assert
      expect(component.pendingFile()).toEqual(mockFile);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('no debería procesar la correspondencia si no hay archivo (estado inválido)', () => {
      // Arrange
      component.pendingFile.set(null);

      // Act
      component.processCorrespondence();

      // Assert
      expect(facadeMock.processCorrespondence).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    });

    it('debería delegar el procesamiento al facade correctamente (Éxito)', () => {
      // Arrange
      component.handleRequestConfirmation(mockFile); // Asigna el archivo y abre el modal

      // Simular éxito del facade
      facadeMock.processCorrespondence.mockImplementation((id, file, onSuccess) => onSuccess());

      // Act
      component.processCorrespondence();

      // Assert inmediatos (antes de callback)
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processCorrespondence).toHaveBeenCalledWith(
        '123',
        mockFile,
        expect.any(Function),
        expect.any(Function)
      );

      // Assert posterior al callback
      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('debería resetear estado de carga al fallar el procesamiento (Error)', () => {
      // Arrange
      component.handleRequestConfirmation(mockFile); // Asigna el archivo y abre el modal

      // Simular error del facade
      facadeMock.processCorrespondence.mockImplementation((id, file, onSuccess, onError) => onError());

      // Act
      component.processCorrespondence();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false); // Modal sí cierra
      expect(routerMock.navigate).not.toHaveBeenCalled(); // No retrocede la pantalla
    });
  });
});
