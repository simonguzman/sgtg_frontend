// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// 2. Componente a probar
import { EvaluateSpecialRequestPageComponent } from './evaluate-special-request-page.component';
import { EvaluateSpecialRequestFacadeService } from './services/evaluate-special-request-facade.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importaciones Basekit para override
import { EvaluateSpecialRequestFormComponent } from '../../components/evaluate-special-request-form/evaluate-special-request-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

type SpecialRequestVerdict = stateList.APROBADO | stateList.NO_APROBADO;

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<Promise<boolean>, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockFacadeService {
  loadThesisWorkAndRequest: jest.Mock<void, [string, string, (w: ThesisWork, r: SpecialRequest) => void, () => void]>;
  processEvaluation: jest.Mock<void, [string, string, { status: SpecialRequestVerdict; resolutionDetails: string; grantedDeadline?: Date }, () => void, () => void]>;
}

// ── Mocks de Componentes Standalone (Strict-Init) ─────────────────────────────

@Component({ selector: 'app-evaluate-special-request-form', standalone: true, template: '' })
class MockEvaluateSpecialRequestFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input({ required: true }) specialRequest!: SpecialRequest;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ status: SpecialRequestVerdict; resolutionDetails: string; grantedDeadline?: Date }>();
  @Output() onBack = new EventEmitter<void>();
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

const createMockSpecialRequest = (overrides: Partial<SpecialRequest> = {}): SpecialRequest => ({
  id: 'req-456',
  directorId: 'director-123',
  requestType: SpecialRequestType.CANCELACION,
  description: 'Razón de cancelación',
  requestDate: new Date(),
  status: stateList.EN_REVISION,
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const req = createMockSpecialRequest();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [req],
    state: stateList.EN_REVISION,
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
        title: 'Título de prueba',
        description: 'Descripción de prueba',
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

describe('EvaluateSpecialRequestPageComponent', () => {
  let component: EvaluateSpecialRequestPageComponent;
  let fixture: ComponentFixture<EvaluateSpecialRequestPageComponent>;

  // Interfaces Mocks estrictas
  let facadeMock: MockFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  // Data fabricada (100% real y alineada)
  const mockThesisWork = createMockThesisWork();
  const mockSpecialRequest = mockThesisWork.specialRequests![0];

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks definidos estructuralmente (Sin casteos destructivos)
    facadeMock = {
      loadThesisWorkAndRequest: jest.fn(),
      processEvaluation: jest.fn()
    };

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    // Estructura recursiva segura para la ruta. Simulamos que:
    // La ruta hija tiene 'requestId' y el padre tiene 'id'
    routeMock = {
      snapshot: {
        paramMap: {
          get: jest.fn((param: string) => param === 'requestId' ? 'req-456' : null)
        }
      },
      parent: {
        snapshot: {
          paramMap: {
            get: jest.fn((param: string) => param === 'id' ? 'thesis-123' : null)
          }
        },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateSpecialRequestPageComponent],
      providers: [
        { provide: EvaluateSpecialRequestFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(EvaluateSpecialRequestPageComponent, {
      remove: { imports: [EvaluateSpecialRequestFormComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockEvaluateSpecialRequestFormComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateSpecialRequestPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks(); // Evita cruces
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('ngOnInit - Inicialización de parámetros y carga', () => {
    it('debería cargar la data si se encuentran ambos parámetros en las rutas', () => {
      // Arrange
      facadeMock.loadThesisWorkAndRequest.mockImplementation((tId, rId, onSuccess) => onSuccess(mockThesisWork, mockSpecialRequest));

      // Act
      fixture.detectChanges(); // Ejecuta ngOnInit

      // Assert
      expect(facadeMock.loadThesisWorkAndRequest).toHaveBeenCalledWith(
        'thesis-123',
        'req-456',
        expect.any(Function),
        expect.any(Function)
      );
      expect(component.thesisWorkState()).toEqual(mockThesisWork);
      expect(component.specialRequestState()).toEqual(mockSpecialRequest);
    });

    it('debería regresar y mostrar advertencia si falta algún parámetro', () => {
      // Arrange
      // Modificamos directamente el mock para que retorne null en ambas rutas
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      // Act
      fixture.detectChanges();

      // Assert
      expect(console.warn).toHaveBeenCalledWith('Faltan parámetros en la URL:', { thesisId: null, requestId: null }); // Validamos el mensaje exacto
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeMock.loadThesisWorkAndRequest).not.toHaveBeenCalled();
    });

    it('debería regresar si falla la carga desde el facade', () => {
      // Arrange
      facadeMock.loadThesisWorkAndRequest.mockImplementation((tId, rId, onSuccess, onError) => onError());

      // Act
      fixture.detectChanges();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });

  describe('Flujo de evaluación', () => {
    const payload = { status: stateList.APROBADO as SpecialRequestVerdict, resolutionDetails: 'Aprobado' };

    beforeEach(() => {
      // Inicializamos el componente en un estado válido (Data cargada)
      facadeMock.loadThesisWorkAndRequest.mockImplementation((tId, rId, onSuccess) => onSuccess(mockThesisWork, mockSpecialRequest));
      fixture.detectChanges();
    });

    it('handleSaveTriggered debería establecer la data pendiente y abrir el modal', () => {
      // Act
      component.handleSaveTriggered(payload);

      // Assert
      expect(component.pendingData()).toEqual(payload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('processSpecialRequestEvaluation debería cancelar si falta data', () => {
      // Arrange
      component.pendingData.set(null);

      // Act
      component.processSpecialRequestEvaluation();

      // Assert
      expect(facadeMock.processEvaluation).not.toHaveBeenCalled();
    });

    it('processSpecialRequestEvaluation debería procesar la petición con éxito y navegar atrás', () => {
      // Arrange
      component.pendingData.set(payload);
      facadeMock.processEvaluation.mockImplementation((tId, rId, data, onSuccess) => onSuccess());

      // Act
      component.processSpecialRequestEvaluation();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processEvaluation).toHaveBeenCalledWith(
        'thesis-123',
        'req-456',
        payload,
        expect.any(Function),
        expect.any(Function)
      );
      // Validamos el enrutamiento EXACTO, eliminando expect.anything()
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('processSpecialRequestEvaluation debería quitar el isSubmitting pero no navegar si falla la API', () => {
      // Arrange
      component.pendingData.set(payload);
      facadeMock.processEvaluation.mockImplementation((tId, rId, data, onSuccess, onError) => onError());

      // Act
      component.processSpecialRequestEvaluation();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
