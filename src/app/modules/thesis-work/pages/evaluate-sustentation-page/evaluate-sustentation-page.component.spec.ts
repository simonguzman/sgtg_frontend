// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// 2. Componente a probar
import { EvaluateSustentationPageComponent } from './evaluate-sustentation-page.component';

// 3. Servicios y Facades
import { EvaluateSustentationFacadeService } from './services/evaluate-sustentation-facade.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationEvaluationPayload } from '../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importamos los componentes reales para removerlos en el override
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { EvaluateSustentationFormComponent } from '../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';

// ── Mocks de Componentes Hijos (Standalone) ──────────────────────────────────

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-evaluate-sustentation-form', template: '', standalone: true })
class MockEvaluateSustentationFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ payload: SustentationEvaluationPayload; file: File }>();
  @Output() onBack = new EventEmitter<void>();
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockEvaluateSustentationFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processEvaluation: jest.Mock<void, [string, SustentationEvaluationPayload, File, () => void, () => void]>;
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
    thesisWorkId: 'mock-thesis-123', // Estructura actualizada
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

const createMockEvaluationPayload = (overrides: Partial<SustentationEvaluationPayload> = {}): SustentationEvaluationPayload => {
  return {
    veredict: stateList.APROBADO,
    observations: 'Sin observaciones',
    evaluationDate: new Date('2026-08-24T10:00:00'),
    ...overrides
  } as SustentationEvaluationPayload;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateSustentationPageComponent', () => {
  let component: EvaluateSustentationPageComponent;
  let fixture: ComponentFixture<EvaluateSustentationPageComponent>;

  // Interfaces estrictas
  let facadeMock: MockEvaluateSustentationFacadeService;
  let routerMock: MockRouter;
  let activatedRouteMock: MockRouteNode;

  const mockWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks inicializados cumpliendo 100% sus interfaces
    facadeMock = {
      loadThesisWork: jest.fn(),
      processEvaluation: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    // Estructura recursiva para simular el ActivatedRoute sin 'any'
    activatedRouteMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateSustentationPageComponent],
      providers: [
        { provide: EvaluateSustentationFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    })
    .overrideComponent(EvaluateSustentationPageComponent, {
      remove: {
        imports: [ConfirmationActionModalComponent, EvaluateSustentationFormComponent]
      },
      add: {
        imports: [MockConfirmationActionModalComponent, MockEvaluateSustentationFormComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateSustentationPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('ngOnInit y Navegación', () => {
    it('debería buscar el ID en la ruta anidada y cargar la tesis', () => {
      // Arrange
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockWork));

      // Act
      fixture.detectChanges(); // Dispara ngOnInit

      // Assert
      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function)
      );
      expect(component.thesisWorkState()).toEqual(mockWork);
    });

    it('debería regresar si no encuentra el ID en la ruta o sus padres', () => {
      // Arrange
      activatedRouteMock.parent!.snapshot.paramMap.get.mockReturnValue(null);
      const goBackSpy = jest.spyOn(component, 'goBack');

      // Act
      fixture.detectChanges();

      // Assert
      expect(goBackSpy).toHaveBeenCalled();
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería navegar a loaded_documents al llamar a goBack', () => {
      // Act
      component.goBack();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: activatedRouteMock.parent });
    });
  });

  describe('Flujo de Guardado', () => {
    const mockData = {
      payload: createMockEvaluationPayload(),
      file: new File([''], 'test.pdf')
    };

    beforeEach(() => {
      // Configuramos un estado legal previo al envío
      component.thesisWorkState.set(mockWork);
    });

    it('debería almacenar datos temporales y abrir el modal en handleSaveTriggered', () => {
      // Act
      component.handleSaveTriggered(mockData);

      // Assert
      expect(component.pendingData()).toEqual(mockData);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('debería detenerse temprano si no hay datos pendientes o thesisId', () => {
      // Arrange
      component.pendingData.set(null);

      // Act
      component.processSustentationEvaluation();

      // Assert
      expect(facadeMock.processEvaluation).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false); // Nunca inició
    });

    it('debería procesar la sustentación, resetear indicadores y ejecutar onSuccess', () => {
      // Arrange
      component.pendingData.set(mockData);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      // Simulamos éxito
      facadeMock.processEvaluation.mockImplementation((id, payload, file, onSuccess) => onSuccess());

      // Act
      component.processSustentationEvaluation();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processEvaluation).toHaveBeenCalledWith(
        '123',
        mockData.payload,
        mockData.file,
        expect.any(Function),
        expect.any(Function)
      );
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('debería procesar la sustentación y mantener al usuario en pantalla si falla', () => {
      // Arrange
      component.pendingData.set(mockData);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      // Simulamos error
      facadeMock.processEvaluation.mockImplementation((id, payload, file, onSuccess, onError) => onError());

      // Act
      component.processSustentationEvaluation();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false); // Modal sí se cierra, porque cerró antes del request asíncrono real
      expect(goBackSpy).not.toHaveBeenCalled(); // No debe regresar si falló
    });
  });
});
