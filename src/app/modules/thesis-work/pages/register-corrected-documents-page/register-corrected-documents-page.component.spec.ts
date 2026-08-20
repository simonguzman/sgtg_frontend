import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterCorrectedDocumentsPageComponent } from './register-corrected-documents-page.component';
import { RegisterCorrectedDocumentsFacadeService } from './services/register-corrected-documents-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterCorrectedDocumentFormComponent } from '../../components/register-corrected-document-form/register-corrected-document-form.component';

// --- Interfaz estricta para el Mock de ActivatedRoute (Evita el uso de 'any' y 'unknown') ---
interface MockActivatedRoute {
  snapshot: { paramMap: { get: jest.Mock } };
  parent: MockActivatedRoute | null;
}

// --- Stubs de Componentes Hijos ---
@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen!: boolean;
  @Input() description!: string;
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-register-corrected-document-form', template: '', standalone: true })
class MockRegisterCorrectedDocumentFormComponent {
  @Input() thesisWork!: ThesisWork;
  @Input() isSubmitting!: boolean;
  @Output() onSaveDocuments = new EventEmitter<{ monograph: File; annexes: File }>();
  @Output() onGoBack = new EventEmitter<void>();
}

describe('RegisterCorrectedDocumentsPageComponent', () => {
  let component: RegisterCorrectedDocumentsPageComponent;
  let fixture: ComponentFixture<RegisterCorrectedDocumentsPageComponent>;
  let facadeMock: jest.Mocked<RegisterCorrectedDocumentsFacadeService>;
  let routerMock: jest.Mocked<Router>;
  let activatedRouteMock: MockActivatedRoute; // Tipado estricto aplicado

  beforeEach(async () => {
    facadeMock = {
      loadThesisWork: jest.fn(),
      processCorrectedDocuments: jest.fn(),
      showNavigationError: jest.fn()
    } as unknown as jest.Mocked<RegisterCorrectedDocumentsFacadeService>;

    routerMock = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    // Inicialización del mock respetando la interfaz estricta
    activatedRouteMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterCorrectedDocumentsPageComponent]
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
    .overrideProvider(RegisterCorrectedDocumentsFacadeService, { useValue: facadeMock })
    .overrideProvider(Router, { useValue: routerMock })
    .overrideProvider(ActivatedRoute, { useValue: activatedRouteMock }) // Se inyecta sin casteo inseguro
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrectedDocumentsPageComponent);
    component = fixture.componentInstance;
  });

  // LIMPIEZA VITAL: Asegura la integridad entre pruebas
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ngOnInit y Navegación', () => {
    it('debería buscar el ID recursivamente y cargar la información de la tesis', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => {
        onSuccess({ thesisWorkId: '123' } as ThesisWork);
      });

      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith('123', expect.any(Function), expect.any(Function));
      expect(component.thesisWorkState()?.thesisWorkId).toBe('123');
    });

    it('debería mostrar error de navegación y retroceder si no encuentra ID', () => {
      // CORRECCIÓN: Al estar tipado, modificamos la propiedad directamente y de forma segura sin usar "any"
      activatedRouteMock.parent = null;

      const goBackSpy = jest.spyOn(component, 'goBack');

      fixture.detectChanges();

      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('debería navegar hacia atrás correctamente en goBack', () => {
      component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['../'], { relativeTo: activatedRouteMock as unknown as ActivatedRoute });
    });
  });

  describe('Flujo de envío de documentos', () => {
    const mockFiles = { monograph: new File([''], 'mono.pdf'), annexes: new File([''], 'anexos.zip') };

    beforeEach(() => {
      // Configuramos el estado inicial válido para estas pruebas
      component.thesisWorkState.set({ thesisWorkId: '123' } as ThesisWork);
    });

    it('debería guardar los archivos temporalmente y abrir el modal', () => {
      component.handleRequestConfirmation(mockFiles);

      expect(component.pendingFilesData()).toEqual(mockFiles);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('debería no hacer nada si faltan archivos o ID del proyecto', () => {
      component.pendingFilesData.set(null);

      component.processCorrectedDocuments();

      expect(facadeMock.processCorrectedDocuments).not.toHaveBeenCalled();
    });

    it('debería procesar documentos exitosamente, cerrar modal y retroceder', () => {
      component.pendingFilesData.set(mockFiles);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processCorrectedDocuments.mockImplementation((id, files, onSuccess) => {
        onSuccess();
      });

      component.processCorrectedDocuments();

      expect(component.isConfirmModalOpen()).toBe(false);
      expect(component.isSubmitting()).toBe(false);
      expect(facadeMock.processCorrectedDocuments).toHaveBeenCalledWith('123', mockFiles, expect.any(Function), expect.any(Function));
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('debería manejar el error de guardado bajando la bandera de envío sin retroceder', () => {
      component.pendingFilesData.set(mockFiles);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processCorrectedDocuments.mockImplementation((id, files, onSuccess, onError) => {
        onError();
      });

      component.processCorrectedDocuments();

      expect(component.isConfirmModalOpen()).toBe(false);
      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).not.toHaveBeenCalled();
    });
  });
});
