import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';

import { ProposalFormComponent } from './proposal-form.component';
import { ProposalFormService } from './services/proposal-form.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

import { Proposal } from '../../interfaces/proposal.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

// 1. Mock de la utilidad de lectura de archivos
jest.mock('../../../../core/utils/file-reader.utils');
import { readFileAsDataUrl } from '../../../../core/utils/file-reader.utils';
import { Modality } from '../../enums/modality.enum';

// ── Interfaces Estrictas para Spies ──────────────────────────────────────────

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

interface MockNotificationService {
  show: jest.Mock;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'DocumentoOriginal.pdf',
  url: 'http://docs.com/1',
  uploadDate: new Date(),
  type: DocumentType.PROPUESTA,
  status: stateList.EN_REVISION,
  ...overrides
});

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Título Base',
  description: 'Desc',
  modality: Modality.TI,
  state: stateList.EN_REVISION,
  authors: [],
  evaluations: [],
  documents: [createMockFileDocument()],
  // @ts-expect-error: Evitamos mockear el árbol profundo de historial/director si no se usa
  director: { id: 'dir-1' },
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ProposalFormComponent', () => {
  let component: ProposalFormComponent;
  let fixture: ComponentFixture<ProposalFormComponent>;

  let mockFormService: MockFormService;
  let mockNotificationService: MockNotificationService;
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
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFormGroup = fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      modality: ['', Validators.required],
      student1: ['', Validators.required],
      student2: [''],
      codirector: [''],
      advisor: [''],
      document: [''] // No tiene validator requerido porque la validación es custom (attachedFile)
    });

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

    mockNotificationService = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ProposalFormComponent, ReactiveFormsModule],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    })
    .overrideComponent(ProposalFormComponent, {
      set: { providers: [{ provide: ProposalFormService, useValue: mockFormService }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposalFormComponent);
    component = fixture.componentInstance;

    jest.spyOn(component.onSubmit, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Reactividad (effect)', () => {
    it('debería iniciar en modo creación si el input proposal es nulo', () => {
      fixture.detectChanges();

      expect(component.isEditMode).toBeFalsy();
      expect(mockFormService.initForCreate).toHaveBeenCalled();
      expect(component.attachedFile.hasFile).toBeFalsy();
    });

    it('debería iniciar en modo edición si se proporciona una propuesta', () => {
      const mockProposal = createMockProposal();

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

    it('debería calcular correctamente isFileFieldInvalid basado en isSubmitAttempted y attachedFile', () => {
      // Estado inicial (No se ha intentado enviar)
      expect(component.isFileFieldInvalid).toBeFalsy();

      // Intento fallido de envío sin archivo
      component.isSubmitAttempted.set(true);
      component.attachedFile.hasFile = false;
      expect(component.isFileFieldInvalid).toBeTruthy(); // Ahora sí debe ser inválido

      // Intento de envío con archivo
      component.attachedFile.hasFile = true;
      expect(component.isFileFieldInvalid).toBeFalsy();
    });
  });

  describe('Flujo de Envío (Submit asíncrono y mapDocuments)', () => {
    beforeEach(() => {
      // Hacemos que el formulario sea válido base para poder probar las guardas posteriores
      mockFormGroup.patchValue({ title: 'T', description: 'D', modality: 'M', student1: 'S' });
    });

    it('debería detenerse y notificar error si el formulario es inválido', async () => {
      mockFormGroup.patchValue({ title: '' }); // Lo invalidamos

      await component.submit();

      expect(component.isSubmitAttempted()).toBeTruthy();
      expect(mockFormGroup.touched).toBeTruthy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Formulario incorrecto', type: NotificationType.ERROR })
      );
      expect(mockFormService.buildProposalPayload).not.toHaveBeenCalled();
    });

    it('debería detenerse y notificar error si falta el archivo en Modo Creación', async () => {
      component.attachedFile.hasFile = false; // Estado sin archivo

      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Archivo requerido', type: NotificationType.ERROR })
      );
    });

    it('debería detenerse y notificar error si el usuario ELIMINÓ el archivo en Modo Edición', async () => {
      // 1. Iniciamos en edición
      fixture.componentRef.setInput('proposal', createMockProposal());
      fixture.detectChanges();

      // 2. Simulamos que el usuario le dio al botón de "eliminar archivo"
      component.removeFile();

      // 3. Intenta enviar
      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Archivo requerido', type: NotificationType.ERROR })
      );
      expect(mockFormService.buildProposalPayload).not.toHaveBeenCalled();
    });

    it('debería notificar error si ocurre un fallo al leer el nuevo archivo adjunto (Caso 1 de mapDocuments)', async () => {
      component.handleFileUploaded({ fileName: 'A.pdf', file: new File([''], 'A.pdf') });

      // Simulamos que el file reader arroja una excepción
      mockReadFileAsDataUrl.mockRejectedValue(new Error('Fallo de lectura'));

      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error al leer el archivo', type: NotificationType.ERROR })
      );
      expect(mockFormService.buildProposalPayload).not.toHaveBeenCalled();
    });

    it('debería procesar y enviar un DOCUMENTO NUEVO si se adjuntó un archivo (Caso 1 de mapDocuments)', async () => {
      const mockPayload = createMockProposal({ id: 'payload-nuevo' });
      mockFormService.buildProposalPayload.mockReturnValue(mockPayload);
      mockReadFileAsDataUrl.mockResolvedValue('data:application/pdf;base64,m0ck');

      // Se simula la carga de un archivo desde la UI
      component.handleFileUploaded({ fileName: 'NUEVO_DOC.pdf', file: new File([''], 'NUEVO_DOC.pdf') });

      await component.submit();

      expect(mockReadFileAsDataUrl).toHaveBeenCalledWith(expect.any(File));
      expect(mockFormService.buildProposalPayload).toHaveBeenCalledWith(null, expect.arrayContaining([
        expect.objectContaining({ name: 'NUEVO_DOC.pdf', type: DocumentType.PROPUESTA })
      ]));
      expect(component.onSubmit.emit).toHaveBeenCalledWith(mockPayload);
    });

    it('debería reutilizar el DOCUMENTO ORIGINAL si no se reemplazó el archivo en Modo Edición (Caso 2 de mapDocuments)', async () => {
      const mockProposal = createMockProposal();
      fixture.componentRef.setInput('proposal', mockProposal);
      fixture.detectChanges(); // Esto setea attachedFile.hasFile = true, pero file = null

      const mockPayload = createMockProposal({ id: 'payload-editado' });
      mockFormService.buildProposalPayload.mockReturnValue(mockPayload);

      await component.submit();

      // Nunca debe intentar leer el archivo, porque es nulo y estamos reutilizando el existente
      expect(mockReadFileAsDataUrl).not.toHaveBeenCalled();

      // Debe haber pasado los documentos originales (mockProposal.documents) al payload
      expect(mockFormService.buildProposalPayload).toHaveBeenCalledWith(
        mockProposal, mockProposal.documents
      );
      expect(component.onSubmit.emit).toHaveBeenCalledWith(mockPayload);
    });

    it('debería notificar error si buildProposalPayload retorna null', async () => {
      mockFormService.buildProposalPayload.mockReturnValue(null);
      mockReadFileAsDataUrl.mockResolvedValue('data:application/pdf;base64,m0ck');

      component.handleFileUploaded({ fileName: 'A.pdf', file: new File([''], 'A.pdf') });

      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', type: NotificationType.ERROR })
      );
      expect(component.onSubmit.emit).not.toHaveBeenCalled();
    });
  });
});
