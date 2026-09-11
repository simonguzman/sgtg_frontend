// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// 2. Componente a probar e Interfaces
import { RegisterSpecialRequestPageComponent, SpecialRequestData } from './register-special-request-page.component';
import { RegisterSpecialRequestFacadeService } from './services/register-special-request-facade.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importaciones Reales para el Override
import { RegisterSpecialRequestFormComponent } from '../../components/register-special-request-form/register-special-request-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown') ──────────────────────

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<Promise<boolean>, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void, () => void]>;
  processSaveRequest: jest.Mock<void, [string, SpecialRequestData, () => void, () => void]>;
}

// ── Mocks de Componentes Hijos (Strict-Init) ──────────────────────────────────

@Component({ selector: 'app-register-special-request-form', standalone: true, template: '' })
class MockRegisterSpecialRequestFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveRequest = new EventEmitter<SpecialRequestData>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
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
  const baseThesis: Partial<ThesisWork> = {
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
      evaluators: [],
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
      } as NonNullable<ThesisWork['preliminaryDraftData']>['proposalData']
    } as NonNullable<ThesisWork['preliminaryDraftData']>
  };
  return { ...baseThesis, ...overrides } as ThesisWork;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterSpecialRequestPageComponent', () => {
  let component: RegisterSpecialRequestPageComponent;
  let fixture: ComponentFixture<RegisterSpecialRequestPageComponent>;

  // Interfaces Mocks estrictas
  let facadeMock: MockFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  // Fábrica de datos
  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Inicialización limpia respetando las firmas estrictas
    facadeMock = {
      loadThesisWork: jest.fn(),
      processSaveRequest: jest.fn()
    };

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    // Estructura recursiva y segura para ActivatedRoute
    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('thesis-123') } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterSpecialRequestPageComponent],
      providers: [
        { provide: RegisterSpecialRequestFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(RegisterSpecialRequestPageComponent, {
      remove: {
        imports: [RegisterSpecialRequestFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockRegisterSpecialRequestFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSpecialRequestPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks(); // Evita fugas de estado
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('ngOnInit - Inicialización y Enrutamiento', () => {
    it('debería regresar (goBack) inmediatamente si no encuentra el ID de la tesis en la ruta', () => {
      // Arrange: Simulamos que la ruta no trae el parámetro en ningún nivel
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      // Act
      fixture.detectChanges();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería cargar el trabajo de grado si hay ID en la ruta', () => {
      // Arrange (Simula ejecución síncrona del callback de éxito inferido por TypeScript)
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'thesis-123',
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
      expect(component.thesisWorkData()).toEqual(mockThesisWork);
      expect(component.isLoading()).toBe(false);
    });

    it('debería regresar si el trabajo no es encontrado (callback onNotFound)', () => {
      // Arrange (Callback onNotFound)
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess, onNotFound) => onNotFound());

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.isLoading()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('debería quitar el estado de carga si ocurre un error en la petición (callback onError)', () => {
      // Arrange (Callback onError)
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess, onNotFound, onError) => onError());

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.isLoading()).toBe(false);
      expect(component.thesisWorkData()).toBeUndefined();
    });
  });

  describe('Flujo de Confirmación y Guardado', () => {
    let payload: SpecialRequestData;

    beforeEach(() => {
      // Inicializamos un payload válido dinámico
      payload = { requestType: Object.values(SpecialRequestType)[0], comments: 'Prueba' };

      // Arrancamos el componente en un estado válido (Data cargada)
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));
      fixture.detectChanges();
    });

    it('handleRequestConfirmation debería abrir el modal y guardar los datos pendientes', () => {
      // Act
      component.handleRequestConfirmation(payload);

      // Assert
      expect(component.pendingData()).toEqual(payload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('processSaveRequest no debería hacer nada si no hay data pendiente', () => {
      // Arrange
      component.pendingData.set(null);

      // Act
      component.processSaveRequest();

      // Assert
      expect(facadeMock.processSaveRequest).not.toHaveBeenCalled();
    });

    it('processSaveRequest debería cerrar el modal y llamar al facade para guardar con éxito', () => {
      // Arrange
      component.pendingData.set(payload);
      facadeMock.processSaveRequest.mockImplementation((id, data, onSuccess) => onSuccess());

      // Act
      component.processSaveRequest();

      // Assert (Estados inmediatos tras éxito)
      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processSaveRequest).toHaveBeenCalledWith(
        'thesis-123',
        payload,
        expect.any(Function),
        expect.any(Function)
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('processSaveRequest debería quitar estado isSubmitting pero no navegar si falla el guardado', () => {
      // Arrange
      component.pendingData.set(payload);
      facadeMock.processSaveRequest.mockImplementation((id, data, onSuccess, onError) => onError());

      // Act
      component.processSaveRequest();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
