import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterPazYSalvoFormComponent } from './register-paz-y-salvo-form.component';
import { RegisterPazYSalvoFormService } from './services/register-paz-y-salvo-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { NO_ERRORS_SCHEMA } from '@angular/core';

// Utilidad para tipar profundamente mocks sin usar 'any' ni 'unknown'
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe('RegisterPazYSalvoFormComponent', () => {
  let component: RegisterPazYSalvoFormComponent;
  let fixture: ComponentFixture<RegisterPazYSalvoFormComponent>;

  // Tipado estricto sin unknown
  let mockFormService: {
    getStudentNames: jest.Mock;
    getDirectorName: jest.Mock;
    getCodirectorName: jest.Mock;
    getAdvisorName: jest.Mock;
    getExistingDocument: jest.Mock;
    notifyFileAttached: jest.Mock;
    notifyMissingEvaluations: jest.Mock;
    notifyMissingDocument: jest.Mock;
  };

  const mockThesisWork: DeepPartial<ThesisWork> = {
    thesisWorkId: '123',
    preliminaryDraftData: { proposalData: { title: 'Test Title' } }
  };

  beforeEach(async () => {
    // Arrange: Inicialización limpia de mocks
    mockFormService = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante'),
      getDirectorName: jest.fn().mockReturnValue('Director'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor'),
      getExistingDocument: jest.fn(),
      notifyFileAttached: jest.fn(),
      notifyMissingEvaluations: jest.fn(),
      notifyMissingDocument: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterPazYSalvoFormComponent],
      schemas: [NO_ERRORS_SCHEMA] // Ignora componentes de UI hijos
    })
    .overrideComponent(RegisterPazYSalvoFormComponent, {
      set: { providers: [{ provide: RegisterPazYSalvoFormService, useValue: mockFormService }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterPazYSalvoFormComponent);
    component = fixture.componentInstance;

    // Asignación estricta del Input requerido
    fixture.componentRef.setInput('thesisWork', mockThesisWork as ThesisWork);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Actualización de signals (Comentarios)', () => {
    it('debería actualizar academicComments mediante el evento input sin usar castings inseguros', () => {
      // Arrange: Simular evento real del DOM
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
      // Arrange: Simular evento real del DOM
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
      // Arrange
      const mockFileEvent = { fileName: 'test.pdf', file: new File([''], 'test.pdf') };

      // Act
      component.handleFileUploaded(mockFileEvent);

      // Assert
      expect(component.uploadedFormat()).toEqual(mockFileEvent);
      expect(component.isModalOpen()).toBe(false);
      expect(mockFormService.notifyFileAttached).toHaveBeenCalledWith('test.pdf');
    });

    it('removeFile() debería limpiar el signal uploadedFormat', () => {
      // Arrange
      component.uploadedFormat.set({ fileName: 'test.pdf', file: new File([''], 'test.pdf') });

      // Act
      component.removeFile();

      // Assert
      expect(component.uploadedFormat()).toBeNull();
    });

    it('downloadDocument() debería emitir onDownloadFile si el documento no es nulo', () => {
      // Arrange
      jest.spyOn(component.onDownloadFile, 'emit');
      const mockDoc: DeepPartial<FileDocument> = { id: 'doc1' };

      // Act
      component.downloadDocument(mockDoc as FileDocument);

      // Assert
      expect(component.onDownloadFile.emit).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe('Submit', () => {
    it('debería detener la ejecución y notificar error si falta evaluación académica o financiera', () => {
      // Arrange
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
      // Arrange
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
      // Arrange
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
