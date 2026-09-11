// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// 2. Componente a probar
import { RegisterSustentationPageComponent } from './register-sustentation-page.component';

// 3. Servicios y Facades
import { RegisterSustentationFacadeService } from './services/register-sustentation-facade.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationFormPayload } from '../../components/register-sustentation-form/register-sustentation-form.component';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importamos los componentes reales para removerlos en el override
import { RegisterSustentationFormComponent } from '../../components/register-sustentation-form/register-sustentation-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// ── Mocks de Componentes Hijos (Standalone) ──────────────────────────────────

@Component({ selector: 'app-register-sustentation-form', template: '', standalone: true })
class MockRegisterSustentationFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ payload: SustentationFormPayload; file: File }>();
  @Output() onBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'Partial') ──────────

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockRegisterSustentationFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processSustentation: jest.Mock<void, [string, SustentationFormPayload, File, () => void, () => void]>;
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

const createMockPayload = (overrides: Partial<SustentationFormPayload> = {}): SustentationFormPayload => ({
  sustentationDate: '2026-10-10T10:00:00',
  location: 'Auditorio',
  juror1: 'docente-1',
  juror2: 'docente-2',
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterSustentationPageComponent', () => {
  let component: RegisterSustentationPageComponent;
  let fixture: ComponentFixture<RegisterSustentationPageComponent>;

  // Interfaces estrictas
  let facadeMock: MockRegisterSustentationFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  const mockWork = createMockThesisWork({ thesisWorkId: 'thesis-123' });

  beforeEach(async () => {
    // 🔕 Silenciar consola preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks inicializados cumpliendo 100% sus interfaces
    facadeMock = {
      loadThesisWork: jest.fn(),
      processSustentation: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('thesis-123') } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterSustentationPageComponent],
      providers: [
        { provide: RegisterSustentationFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(RegisterSustentationPageComponent, {
      remove: {
        imports: [RegisterSustentationFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockRegisterSustentationFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSustentationPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Previene contaminación de mocks entre los bloques 'it'
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('ngOnInit y Enrutamiento', () => {
    it('debería buscar el ID en la ruta actual o padres e invocar loadThesisWork', () => {
      // Act
      fixture.detectChanges(); // Dispara ngOnInit

      // Assert
      expect(routeMock.parent!.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'thesis-123',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería retornar atrás (goBack) si no encuentra ningún ID', () => {
      // Arrange
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);
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
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });

  describe('Acciones de Usuario', () => {
    it('handleRequestConfirmation debería actualizar pendientes y abrir modal', () => {
      // Arrange
      const mockData = { payload: createMockPayload(), file: new File([''], 'test.pdf') };

      // Act
      component.handleRequestConfirmation(mockData);

      // Assert
      expect(component.pendingData()).toEqual(mockData);
      expect(component.isConfirmModalOpen()).toBe(true);
    });
  });

  describe('Proceso de Sustentación (processSustentacion)', () => {
    it('debería detenerse temprano si no hay datos pendientes o thesisId', () => {
      // Arrange
      component.pendingData.set(null);

      // Act
      component.processSustentacion();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(facadeMock.processSustentation).not.toHaveBeenCalled();
    });

    it('debería invocar al facade para procesar, activar isSubmitting y ocultar modal', () => {
      // Arrange
      const mockPayload = createMockPayload();
      const mockFile = new File([''], 'f.pdf');

      component.thesisWorkState.set(mockWork);
      component.pendingData.set({ payload: mockPayload, file: mockFile });
      component.isConfirmModalOpen.set(true);

      // Act
      component.processSustentacion();

      // Assert
      expect(component.isSubmitting()).toBe(true);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processSustentation).toHaveBeenCalledWith(
        'thesis-123',
        mockPayload,
        mockFile,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('callbacks del facade deberían reiniciar isSubmitting y navegar atrás en caso de éxito', () => {
      // Arrange
      component.thesisWorkState.set(mockWork);
      component.pendingData.set({ payload: createMockPayload(), file: new File([''], '') });
      const goBackSpy = jest.spyOn(component, 'goBack');

      // Simulamos la ejecución del callback onSuccess
      facadeMock.processSustentation.mockImplementation((id, p, f, onSuccess, onError) => {
        onSuccess();
      });

      // Act
      component.processSustentacion();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('callbacks del facade deberían reiniciar isSubmitting y no navegar atrás en caso de error', () => {
      // Arrange
      component.thesisWorkState.set(mockWork);
      component.pendingData.set({ payload: createMockPayload(), file: new File([''], '') });
      const goBackSpy = jest.spyOn(component, 'goBack');

      // Simulamos la ejecución del callback onError
      facadeMock.processSustentation.mockImplementation((id, p, f, onSuccess, onError) => {
        onError();
      });

      // Act
      component.processSustentacion();

      // Assert
      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).not.toHaveBeenCalled();
    });
  });
});
