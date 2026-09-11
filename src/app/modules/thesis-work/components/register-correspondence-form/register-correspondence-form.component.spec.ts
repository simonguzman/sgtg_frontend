// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';

// 2. Componente a probar
import { RegisterCorrespondenceFormComponent } from './register-correspondence-form.component';

// 3. Servicios
import { RegisterCorrespondenceFormService } from './services/register-correspondence-form.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { SustentationRegistry } from '../../interfaces/sustentation-registry.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importaciones para Override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';

// ── Mocks Presentacionales (Strict-Init) ─────────────────────────────────────

@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() disabled: boolean | null = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', template: '<ng-content></ng-content>', standalone: true })
class MockInfoBannerComponent {
  @Input() title = '';
}

@Component({ selector: 'app-file-upload-modal', template: '', standalone: true })
class MockFileUploadModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onFileUploaded = new EventEmitter<{ fileName: string; file: File }>();
  @Output() onClose = new EventEmitter<void>();
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'DeepPartial') ─────────

interface MockRegisterCorrespondenceFormService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getMemberName: jest.Mock<string, [string | undefined]>;
  findFormatoE: jest.Mock<FileDocument | undefined, [FileDocument[]]>;
  findFormatoF: jest.Mock<FileDocument | undefined, [FileDocument[]]>;
  findFormatoG: jest.Mock<FileDocument | undefined, [FileDocument[]]>;
  downloadDocument: jest.Mock<Promise<void>, [FileDocument | undefined | null]>;
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

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'archivo',
  url: 'http://test.com/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

const createMockSustentationRegistry = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sust-1',
  sustentationDate: new Date(),
  location: 'Auditorio',
  assignedJurors: [createMockUser({ id: 'j-1', firstName: 'Jurado', lastName: 'Uno' })],
  verdicts: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [createMockFileDocument({ id: 'doc-1' })],
    evaluations: [],
    specialRequests: [],
    sustentations: [createMockSustentationRegistry()],
    state: stateList.APROBADO,
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
        title: 'Tesis Mock',
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

describe('RegisterCorrespondenceFormComponent', () => {
  let component: RegisterCorrespondenceFormComponent;
  let fixture: ComponentFixture<RegisterCorrespondenceFormComponent>;

  // Interface Mock estricta
  let formServiceMock: MockRegisterCorrespondenceFormService;

  // Fábrica de datos
  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    // 🔕 Silenciar consola preventivamente
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks definidos estructuralmente
    formServiceMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getMemberName: jest.fn(),
      findFormatoE: jest.fn(),
      findFormatoF: jest.fn(),
      findFormatoG: jest.fn(),
      downloadDocument: jest.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterCorrespondenceFormComponent]
    })
    .overrideComponent(RegisterCorrespondenceFormComponent, {
      remove: {
        imports: [ButtonComponent, InfoBannerComponent, FileUploadModalComponent],
        providers: [RegisterCorrespondenceFormService]
      },
      add: {
        imports: [MockButtonComponent, MockInfoBannerComponent, MockFileUploadModalComponent],
        providers: [{ provide: RegisterCorrespondenceFormService, useValue: formServiceMock }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrespondenceFormComponent);
    component = fixture.componentInstance;

    // Configurar Inputs requeridos mediante la API de Signals
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.componentRef.setInput('isSubmitting', false);

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Prevenir cruces
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Computed Signals', () => {
    it('debería delegar llamadas a los métodos del servicio para derivar documentos', () => {
      // Accedemos a los signals computados para dispararlos
      component.formatoEDoc();
      component.formatoFDoc();
      component.formatoGDoc();

      // Assert
      expect(formServiceMock.findFormatoE).toHaveBeenCalledWith(mockThesisWork.documents);
      expect(formServiceMock.findFormatoF).toHaveBeenCalledWith(mockThesisWork.documents);
      expect(formServiceMock.findFormatoG).toHaveBeenCalledWith(mockThesisWork.documents);
    });

    it('debería llamar al método de descarga del servicio', () => {
      const mockDoc = createMockFileDocument();

      component.downloadDocument(mockDoc);

      expect(formServiceMock.downloadDocument).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe('Interacción con el Modal de Archivos', () => {
    it('debería guardar el archivo emitido por el modal y cerrar el modal', () => {
      const mockFile = new File([''], 'formato_h.pdf', { type: 'application/pdf' });
      const eventPayload = { fileName: 'formato_h.pdf', file: mockFile };

      // Simulamos que el modal estaba abierto
      component.isModalOpen.set(true);

      // Act: Simulamos la recepción del evento desde el modal
      component.handleFileUploaded(eventPayload);

      // Assert
      expect(component.selectedFile()).toEqual(eventPayload);
      expect(component.isModalOpen()).toBeFalsy();
    });

    it('debería limpiar el archivo seleccionado (removeSelectedFile)', () => {
      const mockFile = new File([''], 'doc.pdf', { type: 'application/pdf' });
      component.selectedFile.set({ fileName: 'doc.pdf', file: mockFile });

      component.removeSelectedFile();

      expect(component.selectedFile()).toBeNull();
    });
  });

  describe('Flujo de Envío (Submit)', () => {
    it('no debería emitir si no hay archivo seleccionado', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      component.selectedFile.set(null);

      component.submitForm();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería emitir el archivo seleccionado al enviar el formulario', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      const mockFile = new File([''], 'documento.pdf');

      component.selectedFile.set({ fileName: 'documento.pdf', file: mockFile });

      component.submitForm();

      expect(emitSpy).toHaveBeenCalledWith(mockFile);
    });
  });
});
