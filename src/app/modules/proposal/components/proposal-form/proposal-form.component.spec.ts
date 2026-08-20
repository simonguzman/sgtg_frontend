import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';

import { ProposalFormComponent } from './proposal-form.component';
import { ProposalFormService } from './services/proposal-form.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

import { Proposal } from '../../interfaces/proposal.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

// 1. Mock de la utilidad de lectura de archivos
jest.mock('../../../../core/utils/file-reader.utils');
import { readFileAsDataUrl } from '../../../../core/utils/file-reader.utils';

// 2. Definición estricta de interfaces para evitar el uso de 'any'
interface MockFormService {
  form: FormGroup;
  initForCreate: jest.Mock;
  initForEdit: jest.Mock;
  buildProposalPayload: jest.Mock;
  modalityOptions: SelectOption[];
  student1Options: WritableSignal<SelectOption[]>;
  student2Options: WritableSignal<SelectOption[]>;
  codirectorOptions: WritableSignal<SelectOption[]>;
  advisorOptions: WritableSignal<SelectOption[]>;
}

describe('ProposalFormComponent', () => {
  let component: ProposalFormComponent;
  let fixture: ComponentFixture<ProposalFormComponent>;

  let mockFormService: MockFormService;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockFormGroup: FormGroup;

  const mockReadFileAsDataUrl = readFileAsDataUrl as jest.MockedFunction<typeof readFileAsDataUrl>;
  const fb = new FormBuilder();

  // Mock global de crypto para JSDOM
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-1234' }
    });
  });

  beforeEach(async () => {
    mockFormGroup = fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      modality: ['', Validators.required],
      student1: ['', Validators.required],
      student2: [''],
      codirector: [''],
      advisor: [''],
      document: ['']
    });

    // Implementación tipada del servicio mockeado
    mockFormService = {
      form: mockFormGroup,
      initForCreate: jest.fn(),
      initForEdit: jest.fn(),
      buildProposalPayload: jest.fn(),
      modalityOptions: [{ id: '1', label: 'Practica profesional' }],
      student1Options: signal([{ id: 'stu1', label: 'Estudiante 1' }]),
      student2Options: signal([]),
      codirectorOptions: signal([]),
      advisorOptions: signal([])
    };

    mockNotificationService = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    await TestBed.configureTestingModule({
      imports: [ProposalFormComponent, ReactiveFormsModule],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    })
    .overrideComponent(ProposalFormComponent, {
      set: {
        providers: [{ provide: ProposalFormService, useValue: mockFormService }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposalFormComponent);
    component = fixture.componentInstance;

    jest.spyOn(component.onSubmit, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Reactividad (effect)', () => {
    it('debería iniciar en modo creación si el input proposal es nulo', () => {
      fixture.detectChanges();

      expect(component.isEditMode).toBeFalsy();
      expect(mockFormService.initForCreate).toHaveBeenCalled();
      expect(component.attachedFile.hasFile).toBeFalsy();
    });

    it('debería iniciar en modo edición si se proporciona una propuesta', () => {
      const mockProposal = {
        id: 'prop-1',
        documents: [{ name: 'DocumentoOriginal.pdf' }]
      } as Proposal;

      fixture.componentRef.setInput('proposal', mockProposal);
      fixture.detectChanges();

      expect(component.isEditMode).toBeTruthy();
      expect(mockFormService.initForEdit).toHaveBeenCalledWith(mockProposal);
      expect(component.attachedFile.hasFile).toBeTruthy();
      expect(component.attachedFile.name).toBe('DocumentoOriginal.pdf');
    });
  });

  describe('Delegación de Getters al FormService', () => {
    it('debería retornar las opciones correspondientes a través de signals', () => {
      expect(component.modalityOptions).toEqual(mockFormService.modalityOptions);
      expect(component.student1Options()).toEqual([{ id: 'stu1', label: 'Estudiante 1' }]);
      expect(component.student2Options()).toEqual([]);
      expect(component.codirectorOptions()).toEqual([]);
      expect(component.advisorOptions()).toEqual([]);
    });

    it('debería mostrar u ocultar el campo de asesor según la modalidad seleccionada', () => {
      expect(component.showAdvisorField).toBeFalsy();

      mockFormGroup.get('modality')?.setValue('Practica profesional');
      expect(component.showAdvisorField).toBeTruthy();
    });
  });

  describe('Gestión de Archivos', () => {
    it('debería actualizar el estado y notificar cuando se adjunta un archivo', () => {
      const mockFile = new File([], 'mi-propuesta.pdf');

      component.handleFileUploaded({ fileName: 'mi-propuesta.pdf', file: mockFile });

      expect(component.attachedFile.hasFile).toBeTruthy();
      expect(component.attachedFile.name).toBe('mi-propuesta.pdf');
      expect(component.uploadModalOpen).toBeFalsy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
    });

    it('debería limpiar el estado del archivo al removerlo', () => {
      component.attachedFile = { hasFile: true, name: 'doc.pdf', file: new File([], 'doc.pdf') };

      component.removeFile();

      expect(component.attachedFile.hasFile).toBeFalsy();
      expect(component.attachedFile.name).toBeNull();
      expect(component.attachedFile.file).toBeNull();
    });
  });

  describe('Validadores de Campos de la UI', () => {
    it('debería calcular correctamente isFieldInvalid', () => {
      const titleControl = mockFormGroup.get('title');

      expect(component.isFieldInvalid('title')).toBeFalsy();

      titleControl?.markAsTouched();
      expect(component.isFieldInvalid('title')).toBeTruthy();

      titleControl?.setValue('Mi título');
      expect(component.isFieldInvalid('title')).toBeFalsy();
    });

    it('debería calcular correctamente hasValue', () => {
      expect(component.hasValue('student2')).toBeFalsy();

      mockFormGroup.get('student2')?.setValue('stu2');
      expect(component.hasValue('student2')).toBeTruthy();
    });
  });

  describe('Flujo de Envío (Submit asíncrono)', () => {
    it('debería detenerse y notificar error si el formulario es inválido', async () => {
      await component.submit();

      expect(mockFormGroup.touched).toBeTruthy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Formulario incorrecto', type: NotificationType.ERROR })
      );
      expect(mockFormService.buildProposalPayload).not.toHaveBeenCalled();
    });

    it('debería detenerse y notificar error si falta el archivo en modo creación', async () => {
      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });
      fixture.detectChanges();

      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Archivo requerido', type: NotificationType.ERROR })
      );
    });

    it('debería notificar error si ocurre un fallo al leer el archivo adjunto', async () => {
      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });
      component.handleFileUploaded({ fileName: 'A.pdf', file: new File([''], 'A.pdf') });

      // Simulamos que el file reader arroja una excepción
      mockReadFileAsDataUrl.mockRejectedValue(new Error('Fallo de lectura'));

      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error al leer el archivo', type: NotificationType.ERROR })
      );
      expect(mockFormService.buildProposalPayload).not.toHaveBeenCalled();
    });

    it('debería emitir el payload exitosamente con los documentos mapeados (Modo Creación)', async () => {
      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });

      const mockPayload = { id: 'payload-1' } as Proposal;
      mockFormService.buildProposalPayload.mockReturnValue(mockPayload);
      mockReadFileAsDataUrl.mockResolvedValue('data:application/pdf;base64,m0ck');

      component.handleFileUploaded({ fileName: 'A.pdf', file: new File([''], 'A.pdf') });

      // Esperamos a que resuelva la promesa del submit completo
      await component.submit();

      expect(mockReadFileAsDataUrl).toHaveBeenCalledWith(expect.any(File));
      expect(mockFormService.buildProposalPayload).toHaveBeenCalledWith(null, expect.arrayContaining([
        expect.objectContaining({
          name: 'A.pdf',
          type: DocumentType.PROPUESTA,
          status: stateList.EN_REVISION
        })
      ]));
      expect(component.onSubmit.emit).toHaveBeenCalledWith(mockPayload);
    });

    it('debería notificar error si buildProposalPayload retorna null', async () => {
      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });
      mockFormService.buildProposalPayload.mockReturnValue(null);
      mockReadFileAsDataUrl.mockResolvedValue('data:application/pdf;base64,m0ck');

      component.handleFileUploaded({ fileName: 'A.pdf', file: new File([''], 'A.pdf') });

      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', type: NotificationType.ERROR })
      );
      expect(component.onSubmit.emit).not.toHaveBeenCalled();
    });

    it('debería usar los documentos originales al enviar en Modo Edición', async () => {
      const mockProposal = { id: 'prop-1', documents: [{ name: 'DocOriginal.pdf' }] } as Proposal;
      fixture.componentRef.setInput('proposal', mockProposal);
      fixture.detectChanges();

      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });
      const mockPayload = { id: 'payload-edit' } as Proposal;
      mockFormService.buildProposalPayload.mockReturnValue(mockPayload);

      await component.submit();

      expect(mockFormService.buildProposalPayload).toHaveBeenCalledWith(
        mockProposal, mockProposal.documents
      );
      expect(component.onSubmit.emit).toHaveBeenCalledWith(mockPayload);
    });
  });
});
