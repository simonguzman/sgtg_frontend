// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { signal, WritableSignal, Component, Input, Output, EventEmitter } from '@angular/core';

// 2. Componentes a probar
import { UploadAdvancePageComponent } from './upload-advance-page.component';

// 3. Servicios y Facades
import { UploadAdvancePageFacadeService } from './services/upload-advance-page-facade.service';
import { AuthService } from '../../../../core/services/auth/auth.service';

// 4. Interfaces y Modelos
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { UploadAdvancePayload } from '../../interfaces/advance-playload.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importamos los componentes reales para removerlos en el override
import { UploadAdvanceFormComponent } from '../../components/upload-advance-form/upload-advance-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// ── Mocks de Componentes Hijos (Standalone) ──────────────────────────────────

@Component({ selector: 'app-upload-advance-form', template: '', standalone: true })
class MockUploadAdvanceFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveAdvance = new EventEmitter<UploadAdvancePayload>();
  @Output() onGoBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockUploadAdvancePageFacadeService {
  loadThesisWork: jest.Mock<void, [string, (t: ThesisWork) => void, () => void]>;
  processAdvance: jest.Mock<Promise<void>, [string, string, UploadAdvancePayload, () => void, () => void]>;
  showNavigationError: jest.Mock<void, []>;
}

interface MockAuthService {
  currentUser: WritableSignal<User | null>;
}

// Interfaz adaptada para simular el árbol de rutas sin usar 'any'
interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Pérez',
  secondLastName: 'Gómez',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis = {
    id: '123',
    thesisWorkId: 'thesis-123',
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
        title: 'Mock Title',
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
  return { ...baseThesis, ...overrides } as ThesisWork;
};

const createMockPayload = (): UploadAdvancePayload => ({
  formValues: { title: 'Avance T', comments: 'Avance C' },
  files: []
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('UploadAdvancePageComponent', () => {
  let component: UploadAdvancePageComponent;
  let fixture: ComponentFixture<UploadAdvancePageComponent>;

  // Espías
  let routerSpy: Pick<Router, 'navigate'>;
  let facadeSpy: MockUploadAdvancePageFacadeService;
  let authSpy: MockAuthService;

  // Mocks de utilidades
  let parentParamMapGetSpy: jest.Mock;
  let mockActivatedRoute: MockRouteNode;

  const mockUser = createMockUser();
  const mockThesis = createMockThesisWork();
  const mockPayload = createMockPayload();

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicializamos el espía de la ruta para simular la búsqueda del ID
    parentParamMapGetSpy = jest.fn().mockReturnValue('thesis-123');

    mockActivatedRoute = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: parentParamMapGetSpy } },
        parent: null
      }
    };

    routerSpy = {
      navigate: jest.fn()
    };

    facadeSpy = {
      loadThesisWork: jest.fn(),
      processAdvance: jest.fn(),
      showNavigationError: jest.fn()
    };

    authSpy = {
      currentUser: signal<User | null>(mockUser)
    };

    await TestBed.configureTestingModule({
      imports: [UploadAdvancePageComponent],
      providers: [
        // El proveedor acepta el mock estructurado compatible con el uso real del componente
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: routerSpy },
        { provide: UploadAdvancePageFacadeService, useValue: facadeSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    })
    .overrideComponent(UploadAdvancePageComponent, {
      remove: { imports: [UploadAdvanceFormComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockUploadAdvanceFormComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadAdvancePageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización (ngOnInit)', () => {
    it('debe buscar el id en la jerarquía de rutas y llamar al facade para cargar el trabajo', () => {
      // Act
      fixture.detectChanges(); // Dispara ngOnInit

      // Assert
      expect(facadeSpy.loadThesisWork).toHaveBeenCalledWith(
        'thesis-123',
        expect.any(Function), // Success callback
        expect.any(Function)  // Error callback
      );
    });

    it('debe mostrar error y regresar si no se encuentra ningún ID en la jerarquía', () => {
      // Arrange: Simulamos que no se encontró ningún parámetro 'id'
      parentParamMapGetSpy.mockReturnValue(null);

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeSpy.showNavigationError).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['loaded_documents'],
        { relativeTo: mockActivatedRoute.parent }
      );
    });

    it('debe setear thesisWorkState al ejecutarse el callback de éxito', () => {
      // Arrange
      facadeSpy.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesis));

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.thesisWorkState()).toEqual(mockThesis);
    });
  });

  describe('Interacciones con la Interfaz', () => {
    it('handleSaveRequest debe guardar el payload pendiente y abrir el modal de confirmación', () => {
      // Act
      component.handleSaveRequest(mockPayload);

      // Assert
      expect(component.pendingAdvanceData()).toEqual(mockPayload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('navigateBack debe usar el router para volver a loaded_documents', () => {
      // Act
      component.navigateBack();

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['loaded_documents'],
        { relativeTo: mockActivatedRoute.parent }
      );
    });
  });

  describe('Procesamiento Final (processAdvance)', () => {
    beforeEach(() => {
      // Pre-configuramos un estado inicial válido para ejecutar processAdvance
      component.thesisWorkState.set(mockThesis);
      component.pendingAdvanceData.set(mockPayload);
      component.isConfirmModalOpen.set(true);
    });

    it('debe abortar la ejecución si falta el payload, el trabajo de grado o el usuario', () => {
      // Arrange
      component.pendingAdvanceData.set(null);

      // Act
      component.processAdvance();

      // Assert
      expect(facadeSpy.processAdvance).not.toHaveBeenCalled();
    });

    it('debe activar el estado isSaving y llamar al facade con los parámetros correctos', () => {
      // Act
      component.processAdvance();

      // Assert
      expect(component.isSaving()).toBe(true);
      expect(facadeSpy.processAdvance).toHaveBeenCalledWith(
        mockThesis.thesisWorkId,
        mockUser.id,
        mockPayload,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debe limpiar estados y redirigir cuando el guardado es exitoso', () => {
      // Arrange: Simulamos que processAdvance devuelve una promesa resuelta
      // y ejecuta inmediatamente el callback onSuccess
      facadeSpy.processAdvance.mockImplementation((_tId, _uId, _data, onSuccess): Promise<void> => {
        onSuccess();
        return Promise.resolve();
      });

      // Act
      component.processAdvance();

      // Assert
      expect(component.isSaving()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalled();
    });

    it('debe limpiar estados pero NO redirigir cuando ocurre un error en el guardado', () => {
      // Arrange: Ejecuta el callback onError
      facadeSpy.processAdvance.mockImplementation((_tId, _uId, _data, _onSuccess, onError): Promise<void> => {
        onError();
        return Promise.resolve();
      });

      // Act
      component.processAdvance();

      // Assert
      expect(component.isSaving()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });
});
