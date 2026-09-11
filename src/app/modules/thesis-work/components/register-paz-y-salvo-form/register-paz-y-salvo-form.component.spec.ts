// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';

// 2. Componente a probar
import { RegisterPazYSalvoFormComponent } from './register-paz-y-salvo-form.component';
import { RegisterPazYSalvoFormService } from './services/register-paz-y-salvo-form.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { PazYSalvoPayload } from '../../interfaces/paz-y-salvo-playload.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';

// 4. Componentes Reales para hacer Override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// ── Mocks de Componentes Hijos (Standalone y Strict-Init) ────────────────────

@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() type = 'button';
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-file-upload-modal', template: '', standalone: true })
class MockFileUploadModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onFileUploaded = new EventEmitter<{ fileName: string; file: File }>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', template: '', standalone: true })
class MockInfoBannerComponent {
  @Input() title = '';
}

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown') ─────────────────────

interface MockRegisterPazYSalvoFormService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getExistingDocument: jest.Mock<FileDocument | null, [ThesisWork, string]>;
  notifyFileAttached: jest.Mock<void, [string]>;
  notifyMissingEvaluations: jest.Mock<void, []>;
  notifyMissingDocument: jest.Mock<void, []>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => {
  const base: Partial<User> = {
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
  };
  return base as User;
};

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
    thesisWorkId: '123',
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
      evaluators: [],
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Test Title',
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

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => {
  const base: Partial<FileDocument> = {
    id: 'doc1',
    name: 'documento.pdf',
    url: 'http://test/doc.pdf',
    type: DocumentType.MONOGRAFIA,
    uploadDate: new Date(),
    status: stateList.EN_REVISION,
    ...overrides
  };
  return base as FileDocument;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterPazYSalvoFormComponent', () => {
  let component: RegisterPazYSalvoFormComponent;
  let fixture: ComponentFixture<RegisterPazYSalvoFormComponent>;
  let mockFormService: MockRegisterPazYSalvoFormService;

  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Arrange: Inicialización limpia de mocks
    mockFormService = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante'),
      getDirectorName: jest.fn().mockReturnValue('Director'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor'),
      getExistingDocument: jest.fn().mockReturnValue(null),
      notifyFileAttached: jest.fn(),
      notifyMissingEvaluations: jest.fn(),
      notifyMissingDocument: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterPazYSalvoFormComponent]
    })
    .overrideComponent(RegisterPazYSalvoFormComponent, {
      remove: {
        imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent],
        providers: [RegisterPazYSalvoFormService]
      },
      add: {
        imports: [MockFileUploadModalComponent, MockButtonComponent, MockInfoBannerComponent],
        providers: [{ provide: RegisterPazYSalvoFormService, useValue: mockFormService }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterPazYSalvoFormComponent);
    component = fixture.componentInstance;

    // Asignación estricta del Input requerido (Modern Angular)
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Delegación al FormService (Proxies de Vista)', () => {
    it('debería solicitar al servicio los nombres formateados', () => {
      expect(component.getStudentNames()).toBe('Estudiante');
      expect(mockFormService.getStudentNames).toHaveBeenCalledWith(mockThesisWork);

      expect(component.getDirectorName()).toBe('Director');
      expect(mockFormService.getDirectorName).toHaveBeenCalledWith(mockThesisWork);

      expect(component.getCodirectorName()).toBe('Codirector');
      expect(mockFormService.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);

      expect(component.getAdvisorName()).toBe('Asesor');
      expect(mockFormService.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar al servicio la búsqueda del documento existente', () => {
      const mockDoc = createMockFileDocument();
      mockFormService.getExistingDocument.mockReturnValue(mockDoc);

      const result = component.getExistingDocument('MONOGRAFIA');

      expect(result).toBe(mockDoc);
      expect(mockFormService.getExistingDocument).toHaveBeenCalledWith(mockThesisWork, 'MONOGRAFIA');
    });
  });

  describe('Actualización de signals (Comentarios)', () => {
    it('debería actualizar academicComments mediante el evento input sin usar castings inseguros', () => {
      // Arrange: Simular evento real del DOM conservando tipado estricto
      const textArea = document.createElement('textarea');
      textArea.value = 'Comentario académico';
      const mockEvent = new Event('input');
      Object.defineProperty(mockEvent, 'target', { writable: false, value: textArea });

      // Act
      component.onAcademicCommentsChange(mockEvent);

      // Assert
      expect(component.academicComments()).toBe('Comentario académico');
    });

    it('debería actualizar financialComments mediante el evento input sin usar castings inseguros', () => {
      const textArea = document.createElement('textarea');
      textArea.value = 'Comentario financiero';
      const mockEvent = new Event('input');
      Object.defineProperty(mockEvent, 'target', { writable: false, value: textArea });

      // Act
      component.onFinancialCommentsChange(mockEvent);

      // Assert
      expect(component.financialComments()).toBe('Comentario financiero');
    });
  });

  describe('Gestión de Archivos', () => {
    it('handleFileUploaded() debería setear el signal, cerrar el modal y notificar al servicio', () => {
      const mockFileEvent = { fileName: 'test.pdf', file: new File([''], 'test.pdf') };

      // Act
      component.handleFileUploaded(mockFileEvent);

      // Assert
      expect(component.uploadedFormat()).toEqual(mockFileEvent);
      expect(component.isModalOpen()).toBe(false);
      expect(mockFormService.notifyFileAttached).toHaveBeenCalledWith('test.pdf');
    });

    it('removeFile() debería limpiar el signal uploadedFormat', () => {
      component.uploadedFormat.set({ fileName: 'test.pdf', file: new File([''], 'test.pdf') });

      // Act
      component.removeFile();

      // Assert
      expect(component.uploadedFormat()).toBeNull();
    });

    it('downloadDocument() debería emitir onDownloadFile si el documento no es nulo', () => {
      jest.spyOn(component.onDownloadFile, 'emit');
      const mockDoc = createMockFileDocument();

      // Act
      component.downloadDocument(mockDoc);

      // Assert
      expect(component.onDownloadFile.emit).toHaveBeenCalledWith(mockDoc);
    });

    it('downloadDocument() NO debería emitir si el documento es nulo', () => {
      jest.spyOn(component.onDownloadFile, 'emit');

      // Act
      component.downloadDocument(null);

      // Assert
      expect(component.onDownloadFile.emit).not.toHaveBeenCalled();
    });
  });

  describe('Submit', () => {
    it('debería detener la ejecución y notificar error si falta evaluación académica o financiera', () => {
      component.academicApproved.set(null);
      component.financialApproved.set(true);

      // Act
      component.submit();

      // Assert
      expect(component.isSubmitAttempted()).toBe(true);
      expect(mockFormService.notifyMissingEvaluations).toHaveBeenCalled();
      expect(mockFormService.notifyMissingDocument).not.toHaveBeenCalled();
    });

    it('debería detener la ejecución y notificar error si falta el documento y las evaluaciones están completas', () => {
      component.academicApproved.set(true);
      component.financialApproved.set(false);
      component.uploadedFormat.set(null);

      // Act
      component.submit();

      // Assert
      expect(mockFormService.notifyMissingEvaluations).not.toHaveBeenCalled();
      expect(mockFormService.notifyMissingDocument).toHaveBeenCalled();
    });

    it('debería emitir onSave con el payload correcto cuando todo es válido', () => {
      jest.spyOn(component.onSave, 'emit');
      const mockFile = new File([''], 'test.pdf');

      component.academicApproved.set(true);
      component.academicComments.set('Todo bien');
      component.financialApproved.set(false);
      component.financialComments.set('Falta pago');
      component.uploadedFormat.set({ fileName: 'test.pdf', file: mockFile });

      // Act
      component.submit();

      // Assert
      expect(component.onSave.emit).toHaveBeenCalledWith({
        payload: {
          academicApproved: true,
          academicComments: 'Todo bien',
          financialApproved: false,
          financialComments: 'Falta pago'
        },
        file: mockFile
      });
    });
  });
});
