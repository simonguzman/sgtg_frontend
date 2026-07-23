import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { signal } from '@angular/core';

import { ProposalFormComponent } from './proposal-form.component';
import { ProposalFormService } from './services/proposal-form.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

import { Proposal } from '../../interfaces/proposal.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

describe('ProposalFormComponent', () => {
  let component: ProposalFormComponent;
  let fixture: ComponentFixture<ProposalFormComponent>;

  let mockFormService: jest.Mocked<any>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockFormGroup: FormGroup;
  const fb = new FormBuilder();

  // Mock global de crypto para JSDOM (evita errores con crypto.randomUUID)
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-1234' }
    });
  });

  beforeEach(async () => {
    // Configuración del formulario reactivo simulado
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

    // Mock del servicio de formulario con signals
    mockFormService = {
      form: mockFormGroup,
      initForCreate: jest.fn(),
      initForEdit: jest.fn(),
      buildProposalPayload: jest.fn(),
      modalityOptions: [{ id: '1', label: 'Practica profesional' }] as SelectOption[],
      student1Options: signal([{ id: 'stu1', label: 'Estudiante 1' }]),
      student2Options: signal([]),
      codirectorOptions: signal([]),
      advisorOptions: signal([])
    };

    // Mock de notificaciones
    mockNotificationService = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    await TestBed.configureTestingModule({
      imports: [ProposalFormComponent, ReactiveFormsModule],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    })
    // Es CRÍTICO sobrescribir el provider a nivel de componente
    .overrideComponent(ProposalFormComponent, {
      set: {
        providers: [{ provide: ProposalFormService, useValue: mockFormService }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposalFormComponent);
    component = fixture.componentInstance;

    // Espía de la emisión del Output
    jest.spyOn(component.onSubmit, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Reactividad (effect)', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería iniciar en modo creación si el input proposal es nulo', () => {
      fixture.detectChanges(); // Ejecuta el effect inicial

      expect(component.isEditMode).toBeFalsy();
      expect(mockFormService.initForCreate).toHaveBeenCalled();
      expect(component.attachedFile.hasFile).toBeFalsy();
    });

    it('debería iniciar en modo edición si se proporciona una propuesta (input signal)', () => {
      const mockProposal = {
        id: 'prop-1',
        documents: [{ name: 'DocumentoOriginal.pdf' }]
      } as Proposal;

      // Seteamos el valor del Signal @input()
      fixture.componentRef.setInput('proposal', mockProposal);
      fixture.detectChanges(); // Dispara el effect

      expect(component.isEditMode).toBeTruthy();
      expect(mockFormService.initForEdit).toHaveBeenCalledWith(mockProposal);
      expect(component.attachedFile.hasFile).toBeTruthy();
      expect(component.attachedFile.name).toBe('DocumentoOriginal.pdf');
    });
  });

  describe('Delegación de Getters al FormService', () => {
    it('debería retornar las opciones de modalidad y signals de usuarios', () => {
      expect(component.modalityOptions).toEqual(mockFormService.modalityOptions);
      expect(component.student1Options()).toEqual([{ id: 'stu1', label: 'Estudiante 1' }]);
      expect(component.student2Options()).toEqual([]);
      expect(component.codirectorOptions()).toEqual([]);
      expect(component.advisorOptions()).toEqual([]);
    });

    it('debería mostrar u ocultar el campo de advisor según la modalidad seleccionada', () => {
      expect(component.showAdvisorField).toBeFalsy();

      mockFormGroup.get('modality')?.setValue('Practica profesional');
      expect(component.showAdvisorField).toBeTruthy();
    });
  });

  describe('Gestión de Archivos (Upload & Remove)', () => {
    it('debería actualizar el estado y notificar cuando se adjunta un archivo', () => {
      const fileEvent = { fileName: 'mi-propuesta.pdf', file: new File([], 'mi-propuesta.pdf') };

      component.handleFileUploaded(fileEvent);

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

      expect(component.isFieldInvalid('title')).toBeFalsy(); // Inválido pero no tocado

      titleControl?.markAsTouched();
      expect(component.isFieldInvalid('title')).toBeTruthy(); // Inválido y tocado

      titleControl?.setValue('Mi título');
      expect(component.isFieldInvalid('title')).toBeFalsy(); // Válido
    });

    it('debería calcular correctamente hasValue', () => {
      expect(component.hasValue('student2')).toBeFalsy();

      mockFormGroup.get('student2')?.setValue('stu2');
      expect(component.hasValue('student2')).toBeTruthy();
    });
  });

  describe('Flujo de Envío (Submit)', () => {
    it('debería detenerse y notificar error si el formulario es inválido', () => {
      component.submit();

      expect(mockFormGroup.touched).toBeTruthy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Formulario incorrecto', type: NotificationType.ERROR })
      );
      expect(mockFormService.buildProposalPayload).not.toHaveBeenCalled();
    });

    it('debería detenerse y notificar error si es modo creación y falta el archivo', () => {
      // Hacemos el form válido
      mockFormGroup.patchValue({
        title: 'T', description: 'D', modality: 'M', student1: 'S'
      });
      fixture.detectChanges(); // Aplicar modo creación explícitamente

      component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Archivo requerido', type: NotificationType.ERROR })
      );
    });

    it('debería emitir el payload si el form es válido y se generó exitosamente (Modo Creación)', () => {
      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });

      const mockPayload = { id: 'payload-1' } as Proposal;
      mockFormService.buildProposalPayload.mockReturnValue(mockPayload);

      // Simulamos la carga de archivo
      component.handleFileUploaded({ fileName: 'A.pdf', file: new File([], 'A.pdf') });

      component.submit();

      // Verifica el mapeo automático de documentos usando el uuid de prueba
      expect(mockFormService.buildProposalPayload).toHaveBeenCalledWith(null, expect.arrayContaining([
        expect.objectContaining({ name: 'A.pdf', type: DocumentType.PROPUESTA, status: stateList.EN_REVISION })
      ]));
      expect(component.onSubmit.emit).toHaveBeenCalledWith(mockPayload);
    });

    it('debería notificar error si buildProposalPayload retorna null', () => {
      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });
      mockFormService.buildProposalPayload.mockReturnValue(null);
      component.handleFileUploaded({ fileName: 'A.pdf', file: new File([], 'A.pdf') });

      component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', type: NotificationType.ERROR })
      );
      expect(component.onSubmit.emit).not.toHaveBeenCalled();
    });

    it('debería usar los documentos originales al enviar en Modo Edición', () => {
      const mockProposal = { id: 'prop-1', documents: [{ name: 'DocOriginal.pdf' }] } as Proposal;
      fixture.componentRef.setInput('proposal', mockProposal);
      fixture.detectChanges();

      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });
      const mockPayload = { id: 'payload-edit' } as Proposal;
      mockFormService.buildProposalPayload.mockReturnValue(mockPayload);

      component.submit();

      expect(mockFormService.buildProposalPayload).toHaveBeenCalledWith(
        mockProposal, mockProposal.documents
      );
      expect(component.onSubmit.emit).toHaveBeenCalledWith(mockPayload);
    });
  });
});
