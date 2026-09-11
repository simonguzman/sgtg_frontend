// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// 2. Componente a probar
import { EvaluateSustentationFormComponent, SustentationEvaluationPayload } from './evaluate-sustentation-form.component';
import { EvaluateSustentationFormService } from './services/evaluate-sustentation-form.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../interfaces/sustentation-registry.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { JurorVerdict } from '../../interfaces/juror-verdict.interface';

// 4. Componentes Reales para Override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// ── Mocks de Componentes Hijos (Standalone) ──────────────────────────────────

@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
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

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockEvaluateSustentationFormService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getAssignedJurors: jest.Mock<string, [SustentationRegistry | null]>;
  getExistingDocument: jest.Mock<FileDocument | null, [ThesisWork, string]>;
  notifyFileAttached: jest.Mock<void, [string]>;
  notifyMissingVerdict: jest.Mock<void, []>;
  notifyMissingFile: jest.Mock<void, []>;
}

// ── Funciones Fábrica fuertemente tipadas (Con estructura actualizada) ───────

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

const createMockSustentationRegistry = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sust-1',
  sustentationDate: new Date(),
  location: 'Auditorio',
  assignedJurors: [
    createMockUser({ id: 'j-1', firstName: 'Jurado', lastName: 'Uno' }),
    createMockUser({ id: 'j-2', firstName: 'Jurado', lastName: 'Dos' })
  ],
  verdicts: [],
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
        title: 'Test Title',
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

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'archivo.pdf',
  url: 'http://test/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateSustentationFormComponent', () => {
  let component: EvaluateSustentationFormComponent;
  let fixture: ComponentFixture<EvaluateSustentationFormComponent>;

  // Tipado estructural estricto
  let formServiceMock: MockEvaluateSustentationFormService;

  // Fábrica para el componente inicial
  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    formServiceMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn(),
      getExistingDocument: jest.fn(),
      notifyFileAttached: jest.fn(),
      notifyMissingVerdict: jest.fn(),
      notifyMissingFile: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateSustentationFormComponent, DatePipe, ReactiveFormsModule]
    })
    .overrideComponent(EvaluateSustentationFormComponent, {
      remove: {
        imports: [ButtonComponent, FileUploadModalComponent, InfoBannerComponent],
        providers: [EvaluateSustentationFormService]
      },
      add: {
        imports: [MockButtonComponent, MockFileUploadModalComponent, MockInfoBannerComponent],
        providers: [{ provide: EvaluateSustentationFormService, useValue: formServiceMock }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateSustentationFormComponent);
    component = fixture.componentInstance;

    // Asignación segura del Input
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpieza del estado de los espías entre pruebas
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Getters de Entidad', () => {
    it('debería retornar la sustentación actual si existe en el arreglo', () => {
      const mockSustentation = createMockSustentationRegistry({ location: 'Aula 101' });
      const thesisWithSustentation = createMockThesisWork({ sustentations: [mockSustentation] });

      fixture.componentRef.setInput('thesisWork', thesisWithSustentation);
      fixture.detectChanges();

      expect(component.currentSustentation).toEqual(mockSustentation);
    });

    it('debería retornar null si no hay sustentaciones registradas', () => {
      const thesisWithoutSustentation = createMockThesisWork({ sustentations: [] });

      fixture.componentRef.setInput('thesisWork', thesisWithoutSustentation);
      fixture.detectChanges();

      expect(component.currentSustentation).toBeNull();
    });
  });

  describe('Delegación al Servicio Formulario (Getters)', () => {
    it('debería delegar las consultas de participantes al servicio', () => {
      formServiceMock.getStudentNames.mockReturnValue('Juan Perez');

      expect(component.getStudentNames()).toBe('Juan Perez');
      expect(formServiceMock.getStudentNames).toHaveBeenCalledWith(component.thesisWork);

      component.getDirectorName();
      expect(formServiceMock.getDirectorName).toHaveBeenCalledWith(component.thesisWork);

      component.getCodirectorName();
      expect(formServiceMock.getCodirectorName).toHaveBeenCalledWith(component.thesisWork);

      component.getAdvisorName();
      expect(formServiceMock.getAdvisorName).toHaveBeenCalledWith(component.thesisWork);
    });

    it('debería delegar la consulta de jurados y documentos', () => {
      component.getAssignedJurors();
      expect(formServiceMock.getAssignedJurors).toHaveBeenCalledWith(component.currentSustentation);

      component.getExistingDocument('MONOGRAFIA');
      expect(formServiceMock.getExistingDocument).toHaveBeenCalledWith(component.thesisWork, 'MONOGRAFIA');
    });
  });

  describe('Interacción de Usuario y Manejo de Archivos', () => {
    it('debería emitir el evento onDownloadFile con el documento válido', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');
      const mockDoc = createMockFileDocument({ id: 'doc-1', name: 'doc.pdf' });

      component.downloadDocument(mockDoc);
      expect(emitSpy).toHaveBeenCalledWith(mockDoc);
    });

    it('no debería emitir descarga si el documento es nulo o indefinido', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');

      component.downloadDocument(null);
      component.downloadDocument(undefined);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería actualizar el estado y notificar al subir un archivo', () => {
      const fileData = { fileName: 'acta_final.pdf', file: new File([''], 'acta_final.pdf') };
      component.isModalOpen.set(true);

      component.handleFileUploaded(fileData);

      expect(component.uploadedFormat()).toEqual(fileData);
      expect(component.isModalOpen()).toBe(false);
      expect(formServiceMock.notifyFileAttached).toHaveBeenCalledWith('acta_final.pdf');
    });

    it('debería limpiar el archivo subido al ejecutar removeFile', () => {
      component.uploadedFormat.set({ fileName: 'test.pdf', file: new File([''], 'test.pdf') });
      component.removeFile();
      expect(component.uploadedFormat()).toBeNull();
    });

    it('debería actualizar el signal de observaciones al detectar un input sin usar casteos inseguros', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Se aprueba con cambios menores';
      const mockEvent = new Event('input');

      // Definimos la propiedad sin mutar la clase Event ni usar 'as any'
      Object.defineProperty(mockEvent, 'target', { writable: false, value: textarea });

      component.onObservationsChange(mockEvent);

      expect(component.observations()).toBe('Se aprueba con cambios menores');
    });
  });

  describe('Validación y Envío del Formulario (Submit)', () => {
    it('debería detenerse y notificar si falta seleccionar un veredicto', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      component.verdictSelected.set(null);
      component.uploadedFormat.set({ fileName: 'acta.pdf', file: new File([''], '') });

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingVerdict).toHaveBeenCalled();
      expect(formServiceMock.notifyMissingFile).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería detenerse y notificar si falta el archivo adjunto (acta)', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      component.verdictSelected.set(stateList.APROBADO as any);
      component.uploadedFormat.set(null);

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingFile).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería emitir onSave con el payload correcto si supera validaciones', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      const mockFile = new File([''], 'acta_firmada.pdf');

      component.verdictSelected.set(stateList.APROBADO_CON_OBSERVACIONES as any);
      component.observations.set('Corregir bibliografía');
      component.uploadedFormat.set({ fileName: 'acta_firmada.pdf', file: mockFile });

      component.submit();

      expect(emitSpy).toHaveBeenCalledWith({
        payload: {
          veredict: stateList.APROBADO_CON_OBSERVACIONES,
          observations: 'Corregir bibliografía',
          evaluationDate: expect.any(Date)
        },
        file: mockFile
      });
    });
  });
});
