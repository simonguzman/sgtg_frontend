import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreliminaryDraftFormComponent } from './preliminary-draft-form.component';
import { PreliminaryDraftFormService } from './services/preliminary-draft-form.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { signal } from '@angular/core';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { FormBuilder } from '@angular/forms';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

describe('PreliminaryDraftFormComponent', () => {
  let component: PreliminaryDraftFormComponent;
  let fixture: ComponentFixture<PreliminaryDraftFormComponent>;
  let mockFormService: jest.Mocked<Partial<PreliminaryDraftFormService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;

  beforeEach(async () => {
    const fb = new FormBuilder();
    const form = fb.group({
      proposalId: [''],
      title: [''],
      description: [''],
      document: fb.control<File | FileDocument | null>(null) // <-- Tipado explícito aquí
    });

    mockFormService = {
      form: form,
      proposalOptions: signal([]),
      selectedProposal: signal(null),
      proposalEvaluationDocument: signal(null),
      initForCreate: jest.fn(),
      initForEdit: jest.fn(),
      buildPreliminaryDraftPayload: jest.fn(),
      getAuthorsNames: jest.fn(),
      getMemberName: jest.fn()
    };

    mockNotificationService = {
      show: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftFormComponent],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    })
    .overrideComponent(PreliminaryDraftFormComponent, {
      set: {
        providers: [{ provide: PreliminaryDraftFormService, useValue: mockFormService }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería inicializarse en modo creación si no recibe preliminaryDraft', () => {
    fixture.componentRef.setInput('preliminaryDraft', null);
    fixture.detectChanges();

    expect(component.isEditMode).toBeFalsy();
    expect(mockFormService.initForCreate).toHaveBeenCalled();
    expect(component.attachedFile.hasFile).toBeFalsy();
  });

  it('debería inicializarse en modo edición si recibe un preliminaryDraft', () => {
    const mockDraft = {
      documents: [{ type: 'Anteproyecto', name: 'doc1.pdf' }]
    } as unknown as PreliminaryDraft;

    fixture.componentRef.setInput('preliminaryDraft', mockDraft);
    fixture.detectChanges();

    expect(component.isEditMode).toBeTruthy();
    expect(mockFormService.initForEdit).toHaveBeenCalledWith(mockDraft);
    expect(component.attachedFile.hasFile).toBeTruthy();
    expect(component.attachedFile.name).toBe('doc1.pdf');
  });

  describe('Interacciones con Archivos', () => {
    it('debería adjuntar un archivo correctamente y mostrar notificación', () => {
      const mockFile = new File([''], 'test.pdf');

      component.handleFileUploaded({ fileName: 'test.pdf', file: mockFile });

      expect(component.attachedFile.hasFile).toBeTruthy();
      expect(component.attachedFile.name).toBe('test.pdf');
      expect(component.form.get('document')?.value).toBe(mockFile);
      expect(component.uploadModalOpen).toBeFalsy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
    });

    it('debería remover el archivo correctamente y mostrar notificación', () => {
      component.attachedFile = { hasFile: true, name: 'test.pdf', file: new File([''], 'test.pdf') };
      component.form.get('document')?.setValue(new File([''], 'dummy.pdf'));

      component.removeFile();

      expect(component.attachedFile.hasFile).toBeFalsy();
      expect(component.form.get('document')?.value).toBeNull();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO })
      );
    });
  });

  describe('Submit', () => {
    it('debería mostrar notificación de error si el formulario es inválido', () => {
      component.form.setErrors({ invalid: true });

      component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });

    it('debería emitir onSave si el formulario es válido y el payload se construye', () => {
      const mockPayload = { id: 'payload' } as unknown as PreliminaryDraft;

      // Corrección: Aserción a jest.Mock para evitar el error 'possibly undefined'
      (mockFormService.buildPreliminaryDraftPayload as jest.Mock).mockReturnValue(mockPayload);

      component.form.clearValidators();
      component.form.updateValueAndValidity();

      jest.spyOn(component.onSave, 'emit');

      component.submit();

      expect(component.onSave.emit).toHaveBeenCalledWith(mockPayload);
    });
  });
});
