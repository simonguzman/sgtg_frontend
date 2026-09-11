// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// 2. Componente a probar
import { RegisterCorrectedDocumentsPageComponent } from './register-corrected-documents-page.component';

// 3. Servicios y Facades
import { RegisterCorrectedDocumentsFacadeService } from './services/register-corrected-documents-facade.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importamos los componentes reales para removerlos en el override
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterCorrectedDocumentFormComponent } from '../../components/register-corrected-document-form/register-corrected-document-form.component';

// ── Mocks de Componentes Hijos (Standalone) ──────────────────────────────────

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-register-corrected-document-form', template: '', standalone: true })
class MockRegisterCorrectedDocumentFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveDocuments = new EventEmitter<{ monograph: File; annexes: File }>();
  @Output() onGoBack = new EventEmitter<void>();
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode }]>;
}

interface MockRegisterCorrectedDocumentsFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processCorrectedDocuments: jest.Mock<void, [string, { monograph: File; annexes: File }, () => void, () => void]>;
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

describe('RegisterCorrectedDocumentsPageComponent', () => {
  let component: RegisterCorrectedDocumentsPageComponent;
  let fixture: ComponentFixture<RegisterCorrectedDocumentsPageComponent>;

  // Interfaces estrictas
  let facadeMock: MockRegisterCorrectedDocumentsFacadeService;
  let routerMock: MockRouter;
  let activatedRouteMock: MockRouteNode;

  const mockWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks definidos estructuralmente sin as unknown
    facadeMock = {
      loadThesisWork: jest.fn(),
      processCorrectedDocuments: jest.fn(),
      showNavigationError: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    activatedRouteMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterCorrectedDocumentsPageComponent],
      providers: [
        { provide: RegisterCorrectedDocumentsFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    })
    .overrideComponent(RegisterCorrectedDocumentsPageComponent, {
      remove: {
        imports: [
          RegisterCorrectedDocumentFormComponent,
          ConfirmationActionModalComponent
        ]
      },
      add: {
        imports: [MockRegisterCorrectedDocumentFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrectedDocumentsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('ngOnInit y Navegación', () => {
    it('debería buscar el ID recursivamente y cargar la información de la tesis', () => {
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

    it('debería mostrar error de navegación y retroceder si no encuentra ID', () => {
      // Arrange
      activatedRouteMock.parent = null;
      const goBackSpy = jest.spyOn(component, 'goBack');

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(goBackSpy).toHaveBeenCalled();
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería navegar hacia atrás correctamente en goBack', () => {
      // Act
      component.goBack();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['../'], { relativeTo: activatedRouteMock });
    });
  });

  describe('Flujo de envío de documentos', () => {
    const mockFiles = { monograph: new File([''], 'mono.pdf'), annexes: new File([''], 'anexos.zip') };

    beforeEach(() => {
      // Configuramos el estado inicial válido para estas pruebas
      component.thesisWorkState.set(mockWork);
    });

    it('debería guardar los archivos temporalmente y abrir el modal', () => {
      // Act
      component.handleRequestConfirmation(mockFiles);

      // Assert
      expect(component.pendingFilesData()).toEqual(mockFiles);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('debería no hacer nada si faltan archivos o ID del proyecto', () => {
      // Arrange
      component.pendingFilesData.set(null);

      // Act
      component.processCorrectedDocuments();

      // Assert
      expect(facadeMock.processCorrectedDocuments).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    });

    it('debería procesar documentos exitosamente, cerrar modal y retroceder', () => {
      // Arrange
      component.pendingFilesData.set(mockFiles);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processCorrectedDocuments.mockImplementation((id, files, onSuccess) => onSuccess());

      // Act
      component.processCorrectedDocuments();

      // Assert
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(component.isSubmitting()).toBe(false);
      expect(facadeMock.processCorrectedDocuments).toHaveBeenCalledWith(
        '123',
        mockFiles,
        expect.any(Function),
        expect.any(Function)
      );
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('debería manejar el error de guardado bajando la bandera de envío sin retroceder', () => {
      // Arrange
      component.pendingFilesData.set(mockFiles);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processCorrectedDocuments.mockImplementation((id, files, onSuccess, onError) => onError());

      // Act
      component.processCorrectedDocuments();

      // Assert
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).not.toHaveBeenCalled();
    });
  });
});
