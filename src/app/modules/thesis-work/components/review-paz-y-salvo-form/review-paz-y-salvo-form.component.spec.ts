import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReviewPazYSalvoFormComponent } from './review-paz-y-salvo-form.component';
import { ReviewPazYSalvoFormService } from './services/review-paz-y-salvo-form.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { thesisWorkDePrueba } from '../../../../testing/vista-de-prueba';
import { crearTrabajoEnSustentacion } from '../../../../testing/trabajo-grado-de-prueba';

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

@Component({ selector: 'app-readonly-field', template: '', standalone: true })
class MockReadonlyFieldComponent {
  @Input() label = '';
  @Input() value: string | null | undefined = '';
  @Input() emptyText = '';
  @Input() emphasize = false;
}

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('ReviewPazYSalvoFormComponent', () => {
  let fixture: ComponentFixture<ReviewPazYSalvoFormComponent>;
  let component: ReviewPazYSalvoFormComponent;
  let formService: {
    getStudentNames: jest.Mock; getDirectorName: jest.Mock; getCodirectorName: jest.Mock; getAdvisorName: jest.Mock;
    getExistingDocument: jest.Mock; notifyFileAttached: jest.Mock; notifyMissingDecision: jest.Mock;
    notifyMissingObservations: jest.Mock; notifyMissingDocument: jest.Mock;
  };
  const trabajo = thesisWorkDePrueba(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [],
    rutaPazYSalvo: null, revisionesPazYSalvo: [] }));

  beforeEach(async () => {
    formService = {
      getStudentNames: jest.fn(() => 'Ana Estudiante'),
      getDirectorName: jest.fn(() => 'Diana Directora'),
      getCodirectorName: jest.fn(() => ''),
      getAdvisorName: jest.fn(() => ''),
      getExistingDocument: jest.fn(() => null),
      notifyFileAttached: jest.fn(),
      notifyMissingDecision: jest.fn(),
      notifyMissingObservations: jest.fn(),
      notifyMissingDocument: jest.fn()
    };

    await TestBed.configureTestingModule({ imports: [ReviewPazYSalvoFormComponent] })
      .overrideComponent(ReviewPazYSalvoFormComponent, {
        remove: {
          imports: [ButtonComponent, FileUploadModalComponent, InfoBannerComponent, ReadonlyFieldComponent],
          providers: [ReviewPazYSalvoFormService]
        },
        add: {
          imports: [MockButtonComponent, MockFileUploadModalComponent, MockInfoBannerComponent, MockReadonlyFieldComponent],
          providers: [{ provide: ReviewPazYSalvoFormService, useValue: formService }]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReviewPazYSalvoFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('thesisWork', trabajo);
    fixture.detectChanges();
  });

  describe('Delegación al servicio del formulario', () => {
    it('obtiene los participantes y los documentos de la solicitud', () => {
      expect(component.getStudentNames()).toBe('Ana Estudiante');
      expect(component.getDirectorName()).toBe('Diana Directora');
      component.getExistingDocument('FORMATO_E');
      expect(formService.getExistingDocument).toHaveBeenCalledWith(trabajo, 'FORMATO_E');
    });
  });

  describe('Interacción del usuario', () => {
    it('emite la descarga solo con un documento', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');
      const documento: FileDocument = { id: 'm', name: 'Monografía', url: '/m', uploadDate: '2026-07-01',
        type: DocumentType.MONOGRAFIA };

      component.downloadDocument(null);
      component.downloadDocument(documento);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(documento);
    });

    it('adjunta y quita el formato F', () => {
      const archivo = { fileName: 'formato-f.pdf', file: pdf('formato-f.pdf') };
      component.isModalOpen.set(true);

      component.handleFileUploaded(archivo);
      expect(component.uploadedFormat()).toEqual(archivo);
      expect(component.isModalOpen()).toBe(false);
      expect(formService.notifyFileAttached).toHaveBeenCalledWith('formato-f.pdf');

      component.removeFile();
      expect(component.uploadedFormat()).toBeNull();
    });

    it('actualiza las observaciones al escribir', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Deuda en biblioteca';
      const evento = new Event('input');
      Object.defineProperty(evento, 'target', { value: textarea });

      component.onObservationsChange(evento);
      expect(component.observations()).toBe('Deuda en biblioteca');
    });
  });

  describe('Validación y envío', () => {
    it('exige la decisión', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      component.uploadedFormat.set({ fileName: 'f.pdf', file: pdf('f.pdf') });

      component.submit();
      fixture.detectChanges();

      expect(formService.notifyMissingDecision).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Debe seleccionar una decisión para proceder');
    });

    it('si no lo aprueba, exige las observaciones', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      component.approved.set(false);
      component.observations.set('   ');
      component.uploadedFormat.set({ fileName: 'f.pdf', file: pdf('f.pdf') });

      component.submit();
      fixture.detectChanges();

      expect(component.isMissingObservations).toBe(true);
      expect(formService.notifyMissingObservations).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Si no lo aprueba, las observaciones son obligatorias');
    });

    it('exige el formato F aunque lo apruebe', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      component.approved.set(true);

      component.submit();

      expect(formService.notifyMissingDocument).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it.each([
      [true, ''],
      [false, 'Deuda en biblioteca']
    ])('emite la revisión completa (aprobado: %s)', (approved, observations) => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      const archivo = pdf('formato-f.pdf');
      component.approved.set(approved);
      component.observations.set(observations);
      component.uploadedFormat.set({ fileName: 'formato-f.pdf', file: archivo });

      component.submit();

      expect(emitSpy).toHaveBeenCalledWith({ payload: { approved, observations }, file: archivo });
    });
  });
});
