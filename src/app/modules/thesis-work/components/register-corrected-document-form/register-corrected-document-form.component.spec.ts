import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RegisterCorrectedDocumentFormComponent } from './register-corrected-document-form.component';
import { RegisterCorrectedDocumentFormService } from './services/register-corrected-document-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';

// Importaciones reales de los componentes hijos para poder removerlos en el override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// --- Stubs (Mocks) de componentes hijos para aislamiento (Shallow Testing) ---
@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label!: string;
  @Input() variant!: string;
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-file-upload-modal', template: '', standalone: true })
class MockFileUploadModalComponent {
  @Input() isOpen!: boolean;
  @Input() description!: string;
  @Output() onFileUploaded = new EventEmitter<{ fileName: string; file: File }>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', template: '', standalone: true })
class MockInfoBannerComponent {
  @Input() title!: string;
}

describe('RegisterCorrectedDocumentFormComponent', () => {
  let component: RegisterCorrectedDocumentFormComponent;
  let fixture: ComponentFixture<RegisterCorrectedDocumentFormComponent>;
  let formServiceMock: jest.Mocked<RegisterCorrectedDocumentFormService>;

  // Mock estructurado evitando el uso de "any"
  const mockThesisWork = {
    preliminaryDraftData: {
      proposalData: { title: 'Título', description: 'Desc', modality: 'Modalidad' }
    },
    state: 'sustentado'
  } as unknown as ThesisWork;

  beforeEach(async () => {
    // Definición estricta de las funciones mockeadas
    formServiceMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante'),
      getDirectorName: jest.fn().mockReturnValue('Director'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor'),
      notifyFileAttached: jest.fn(),
      notifyMissingDocuments: jest.fn()
    } as unknown as jest.Mocked<RegisterCorrectedDocumentFormService>;

    await TestBed.configureTestingModule({
      imports: [RegisterCorrectedDocumentFormComponent]
    })
    .overrideComponent(RegisterCorrectedDocumentFormComponent, {
      remove: {
        imports: [ButtonComponent, FileUploadModalComponent, InfoBannerComponent],
        providers: [RegisterCorrectedDocumentFormService]
      },
      add: {
        imports: [MockButtonComponent, MockFileUploadModalComponent, MockInfoBannerComponent],
        providers: [{ provide: RegisterCorrectedDocumentFormService, useValue: formServiceMock }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrectedDocumentFormComponent);
    component = fixture.componentInstance;

    // Inserción del input simulando el flujo natural de Angular >14
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  // Limpieza del estado de los espías entre tests
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y getters', () => {
    it('debería inicializarse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería retornar los nombres correctos delegando al servicio', () => {
      expect(component.getStudentNames()).toBe('Estudiante');
      expect(component.getDirectorName()).toBe('Director');
      expect(component.getCodirectorName()).toBe('Codirector');
      expect(component.getAdvisorName()).toBe('Asesor');
    });
  });

  describe('Manejo de Modales y Archivos', () => {
    it('debería abrir y cerrar modales actualizando activeModal', () => {
      component.openModal('MONOGRAPH');
      expect(component.activeModal()).toBe('MONOGRAPH');

      component.closeModal();
      expect(component.activeModal()).toBeNull();
    });

    it('debería manejar la carga de la monografía y notificar al usuario', () => {
      const fileData = { fileName: 'mono.pdf', file: new File([''], 'mono.pdf') };
      component.openModal('MONOGRAPH');

      component.handleFileUploaded(fileData);

      expect(component.uploadedMonograph()).toEqual(fileData);
      expect(component.activeModal()).toBeNull();
      expect(formServiceMock.notifyFileAttached).toHaveBeenCalledWith('mono.pdf');
    });

    it('debería manejar la carga de los anexos y notificar al usuario', () => {
      const fileData = { fileName: 'anexos.zip', file: new File([''], 'anexos.zip') };
      component.openModal('ANNEXES');

      component.handleFileUploaded(fileData);

      expect(component.uploadedAnnexes()).toEqual(fileData);
      expect(component.activeModal()).toBeNull();
      expect(formServiceMock.notifyFileAttached).toHaveBeenCalledWith('anexos.zip');
    });

    it('debería limpiar (eliminar) archivos correctamente al solicitarlo', () => {
      const fileData = { fileName: 'test.pdf', file: new File([''], 'test.pdf') };

      component.uploadedMonograph.set(fileData);
      component.removeFile('MONOGRAPH');
      expect(component.uploadedMonograph()).toBeNull();

      component.uploadedAnnexes.set(fileData);
      component.removeFile('ANNEXES');
      expect(component.uploadedAnnexes()).toBeNull();
    });
  });

  describe('Envío del Formulario (Submit)', () => {
    it('debería rechazar y notificar error si falta la monografía', () => {
      component.uploadedAnnexes.set({ fileName: 'anexos.zip', file: new File([''], 'a.zip') });

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingDocuments).toHaveBeenCalled();
    });

    it('debería rechazar y notificar error si faltan los anexos', () => {
      component.uploadedMonograph.set({ fileName: 'mono.pdf', file: new File([''], 'm.pdf') });

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingDocuments).toHaveBeenCalled();
    });

    it('debería emitir onSaveDocuments si todos los archivos requeridos están presentes', () => {
      const monoFile = new File([''], 'mono.pdf');
      const annexFile = new File([''], 'anexos.zip');

      component.uploadedMonograph.set({ fileName: 'mono.pdf', file: monoFile });
      component.uploadedAnnexes.set({ fileName: 'anexos.zip', file: annexFile });

      const emitSpy = jest.spyOn(component.onSaveDocuments, 'emit');

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingDocuments).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith({ monograph: monoFile, annexes: annexFile });
    });
  });
});
