import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { RegisterCorrespondenceFormComponent } from './register-correspondence-form.component';
import { RegisterCorrespondenceFormService } from './services/register-correspondence-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// --- Tipo Utilitario Estricto ---
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

// --- Mocks Presentacionales ---
@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label: unknown;
  @Input() variant: unknown;
  @Input() disabled: unknown;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', template: '<ng-content></ng-content>', standalone: true })
class MockInfoBannerComponent {
  @Input() title: unknown;
}

describe('RegisterCorrespondenceFormComponent', () => {
  let component: RegisterCorrespondenceFormComponent;
  let fixture: ComponentFixture<RegisterCorrespondenceFormComponent>;
  let formServiceMock: jest.Mocked<RegisterCorrespondenceFormService>;

  beforeEach(async () => {
    formServiceMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getMemberName: jest.fn(),
      findFormatoE: jest.fn(),
      findFormatoF: jest.fn(),
      findFormatoG: jest.fn(),
      downloadDocument: jest.fn(),
      notifyInvalidFileType: jest.fn(),
    } as DeepPartial<RegisterCorrespondenceFormService> as jest.Mocked<RegisterCorrespondenceFormService>;

    await TestBed.configureTestingModule({
      imports: [RegisterCorrespondenceFormComponent]
    })
    .overrideComponent(RegisterCorrespondenceFormComponent, {
      remove: {
        imports: [ButtonComponent, InfoBannerComponent]
      },
      add: {
        imports: [MockButtonComponent, MockInfoBannerComponent]
      }
    })
    .overrideProvider(RegisterCorrespondenceFormService, { useValue: formServiceMock })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrespondenceFormComponent);
    component = fixture.componentInstance;

    const mockThesisWork = {
      preliminaryDraftData: { proposalData: { title: 'Tesis' } },
      documents: [{ id: 'doc-1' }]
    } as DeepPartial<ThesisWork> as ThesisWork;

    // Configurar Inputs del Signal
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.componentRef.setInput('isSubmitting', false);

    // NOTA: Eliminamos la creación manual del DOM global (document.createElement)
    // Angular / JSDOM se encargará de renderizar el input del template

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Computed Signals', () => {
    it('debería delegar llamadas a los métodos del servicio para derivar documentos', () => {
      expect(formServiceMock.findFormatoE).toHaveBeenCalledWith([{ id: 'doc-1' }]);
      expect(formServiceMock.findFormatoF).toHaveBeenCalledWith([{ id: 'doc-1' }]);
      expect(formServiceMock.findFormatoG).toHaveBeenCalledWith([{ id: 'doc-1' }]);
    });

    it('debería llamar al método de descarga del servicio', () => {
      const mockDoc = { id: 'doc1' } as DeepPartial<FileDocument> as FileDocument;
      component.downloadDocument(mockDoc);
      expect(formServiceMock.downloadDocument).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe('Interacción de Archivos (DOM & Eventos)', () => {
    it('debería ignorar la selección si no hay archivos en el evento', () => {
      // Mockeamos el evento sin archivos
      const event = { target: { files: undefined } } as DeepPartial<Event> as Event;
      component.onFileSelected(event);
      expect(component.selectedFile()).toBeNull();
    });

    it('debería notificar error si el archivo no es PDF', () => {
      const mockFile = new File([''], 'imagen.png', { type: 'image/png' });
      // El casting en este caso específico es válido porque simulamos el HTMLInputElement
      const event = { target: { files: [mockFile] } } as unknown as Event;

      component.onFileSelected(event);

      expect(formServiceMock.notifyInvalidFileType).toHaveBeenCalled();
      expect(component.selectedFile()).toBeNull();
    });

    it('debería establecer el archivo si es un PDF válido', () => {
      const mockFile = new File([''], 'documento.pdf', { type: 'application/pdf' });
      const event = { target: { files: [mockFile] } } as unknown as Event;

      component.onFileSelected(event);

      expect(component.selectedFile()).toEqual({ fileName: 'documento.pdf', file: mockFile });
    });

    it('debería disparar click programático en el input file usando ViewChild', () => {
      // Obtenemos el elemento renderizado nativamente por el fixture
      const inputDebugElement = fixture.debugElement.query(By.css('input[type="file"]'));
      const clickSpy = jest.spyOn(inputDebugElement.nativeElement, 'click');

      component.triggerFileInput();

      expect(clickSpy).toHaveBeenCalled();
    });

    it('debería limpiar el archivo seleccionado y resetear el input DOM a través de ViewChild', () => {
      const mockFile = new File([''], 'doc.pdf', { type: 'application/pdf' });
      component.selectedFile.set({ fileName: 'doc.pdf', file: mockFile });

      const inputNativeElement = fixture.debugElement.query(By.css('input[type="file"]')).nativeElement;

      // Simulamos que el input tiene un archivo cargado
      Object.defineProperty(inputNativeElement, 'files', {
        value: [mockFile],
        writable: true
      });

      component.removeSelectedFile();

      expect(component.selectedFile()).toBeNull();
      expect(inputNativeElement.value).toBe('');
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
