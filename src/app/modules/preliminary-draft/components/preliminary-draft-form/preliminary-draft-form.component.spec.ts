import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftFormComponent } from './preliminary-draft-form.component';
import { PreliminaryDraftFormService } from './services/preliminary-draft-form.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { Proposal } from '../../../proposal/interfaces/proposal.interface';
import { User } from '../../../users/interfaces/user.interface';
import { SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { Modality } from '../../../proposal/enums/modality.enum';
import { readFileAsDataUrl } from '../../../../core/utils/file-reader.utils';

// --- Mocking Utils ---
jest.mock('../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));
const mockedReadFileAsDataUrl = readFileAsDataUrl as jest.MockedFunction<typeof readFileAsDataUrl>;

// --- Factories estrictamente tipadas (FIX del error TS2352) ---
const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'u1',
  firstName: 'Director',
  lastName: 'Prueba',
  ...overrides
} as User);

const createMockProposal = (overrides?: Partial<Proposal>): Proposal => ({
  id: 'p1',
  title: 'Propuesta de Prueba',
  description: 'Desc',
  modality: Modality.TI,
  state: stateList.APROBADO,
  authors: [],
  director: createMockUser(),
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  ...overrides
} as Proposal);

const createMockFileDocument = (overrides?: Partial<FileDocument>): FileDocument => ({
  id: 'doc-1',
  name: 'anteproyecto.pdf',
  url: 'http://example.com/doc.pdf',
  uploadDate: '11/08/2026', // O un Date, dependiendo de tu interfaz FileDocument
  type: DocumentType.ANTEPROYECTO,
  status: stateList.EN_REVISION,
  ...overrides
} as FileDocument);

const createMockPreliminaryDraft = (overrides?: Partial<PreliminaryDraft>): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'p1',
  proposalData: createMockProposal(),
  documents: [createMockFileDocument()],
  state: stateList.EN_REVISION,
  createdData: new Date(),
  evaluations: [],
  ...overrides
} as PreliminaryDraft);

// --- Tipados para el Mock del Servicio ---
type MockFormType = FormGroup<{
  proposalId: FormControl<string | null>;
  title: FormControl<string | null>;
  description: FormControl<string | null>;
  document: FormControl<File | FileDocument | null>;
}>;

interface MockPreliminaryDraftFormService {
  form: MockFormType;
  proposalOptions: WritableSignal<SelectOption[]>;
  selectedProposal: WritableSignal<Proposal | null>;
  proposalEvaluationDocument: WritableSignal<FileDocument | null>;
  initForCreate: jest.Mock<void, []>;
  initForEdit: jest.Mock<void, [PreliminaryDraft]>;
  buildPreliminaryDraftPayload: jest.Mock<PreliminaryDraft | null, [PreliminaryDraft | null, FileDocument[]]>;
  getAuthorsNames: jest.Mock<string, [User[]]>;
  getMemberName: jest.Mock<string, [User | null | undefined]>;
}

// --- Inicio de Pruebas ---
describe('PreliminaryDraftFormComponent', () => {
  let component: PreliminaryDraftFormComponent;
  let fixture: ComponentFixture<PreliminaryDraftFormComponent>;
  let mockFormService: MockPreliminaryDraftFormService;
  let mockNotificationService: jest.Mocked<Pick<NotificationService, 'show'>>;

  beforeEach(async () => {
    // Configuración de resolución exitosa del file reader mock
    mockedReadFileAsDataUrl.mockResolvedValue('data:application/pdf;base64,mock');

    const form: MockFormType = new FormGroup({
      proposalId: new FormControl<string | null>('', Validators.required),
      title: new FormControl<string | null>('', Validators.required),
      description: new FormControl<string | null>('', Validators.required),
      document: new FormControl<File | FileDocument | null>(null, Validators.required)
    });

    mockFormService = {
      form,
      proposalOptions: signal<SelectOption[]>([]),
      selectedProposal: signal<Proposal | null>(null),
      proposalEvaluationDocument: signal<FileDocument | null>(null),
      initForCreate: jest.fn(),
      initForEdit: jest.fn(),
      buildPreliminaryDraftPayload: jest.fn(),
      getAuthorsNames: jest.fn().mockReturnValue('Autores de prueba'),
      getMemberName: jest.fn().mockReturnValue('Director de prueba')
    };

    mockNotificationService = {
      show: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftFormComponent, ReactiveFormsModule],
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Ciclo de Vida', () => {
    it('debería inicializarse en modo creación si no recibe preliminaryDraft', () => {
      fixture.componentRef.setInput('preliminaryDraft', null);
      fixture.detectChanges();

      expect(component.isEditMode).toBeFalsy();
      expect(mockFormService.initForCreate).toHaveBeenCalled();
      expect(component.attachedFile.hasFile).toBeFalsy();
    });

    it('debería inicializarse en modo edición si recibe un preliminaryDraft con documento principal', () => {
      const mockDraft = createMockPreliminaryDraft({
        documents: [createMockFileDocument({ name: 'mi-documento.pdf', type: DocumentType.ANTEPROYECTO })]
      });

      fixture.componentRef.setInput('preliminaryDraft', mockDraft);
      fixture.detectChanges();

      expect(component.isEditMode).toBeTruthy();
      expect(mockFormService.initForEdit).toHaveBeenCalledWith(mockDraft);
      expect(component.attachedFile.hasFile).toBeTruthy();
      expect(component.attachedFile.name).toBe('mi-documento.pdf');
    });

    it('debería inicializarse en modo edición sin documento si el preliminaryDraft no lo tiene', () => {
      const mockDraft = createMockPreliminaryDraft({ documents: [] });

      fixture.componentRef.setInput('preliminaryDraft', mockDraft);
      fixture.detectChanges();

      expect(component.isEditMode).toBeTruthy();
      expect(component.attachedFile.hasFile).toBeFalsy();
      expect(component.attachedFile.name).toBeNull();
    });
  });

  describe('Validaciones de Interfaz (UI)', () => {
    it('debería retornar true en isFieldInvalid si el campo es inválido y fue tocado', () => {
      component.form.get('title')?.setErrors({ required: true });
      component.form.get('title')?.markAsTouched();
      expect(component.isFieldInvalid('title')).toBeTruthy();
    });

    it('debería retornar false en isFieldInvalid si el campo es inválido pero no ha sido tocado', () => {
      component.form.get('title')?.setErrors({ required: true });
      component.form.get('title')?.markAsUntouched();
      expect(component.isFieldInvalid('title')).toBeFalsy();
    });

    it('debería retornar true en isFieldValid si el campo es válido y fue tocado', () => {
      component.form.get('title')?.setErrors(null);
      component.form.get('title')?.markAsTouched();
      expect(component.isFieldValid('title')).toBeTruthy();
    });
  });

  describe('Interacciones con Archivos', () => {
    it('debería adjuntar un archivo correctamente y mostrar notificación de éxito', () => {
      const mockFile = new File(['contenido'], 'test.pdf', { type: 'application/pdf' });

      component.handleFileUploaded({ fileName: 'test.pdf', file: mockFile });

      expect(component.attachedFile.hasFile).toBeTruthy();
      expect(component.attachedFile.name).toBe('test.pdf');
      expect(component.form.get('document')?.value).toBe(mockFile);
      expect(component.form.get('document')?.touched).toBeTruthy();
      expect(component.uploadModalOpen).toBeFalsy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
    });

    it('debería remover el archivo correctamente y mostrar notificación de información', () => {
      component.attachedFile = { hasFile: true, name: 'test.pdf', file: new File([''], 'test.pdf') };
      component.form.get('document')?.setValue(new File([''], 'dummy.pdf'));

      component.removeFile();

      expect(component.attachedFile.hasFile).toBeFalsy();
      expect(component.attachedFile.name).toBeNull();
      expect(component.form.get('document')?.value).toBeNull();
      expect(component.form.get('document')?.touched).toBeTruthy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO })
      );
    });
  });

  describe('Flujo de Submit y Mapeo de Documentos', () => {
    it('debería mostrar notificación de error si el formulario es inválido', async () => {
      component.form.patchValue({ proposalId: '' }); // Formulario inválido
      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          title: 'Datos incompletos'
        })
      );
      expect(mockFormService.buildPreliminaryDraftPayload).not.toHaveBeenCalled();
    });

    it('debería usar el documento existente si el archivo no cambió (modo edición)', async () => {
      const mockExistingDoc = createMockFileDocument({ name: 'doc-existente.pdf' });
      const mockDraft = createMockPreliminaryDraft({ documents: [mockExistingDoc] });

      fixture.componentRef.setInput('preliminaryDraft', mockDraft);
      fixture.detectChanges();

      // Hacemos el formulario válido
      component.form.patchValue({
        proposalId: 'p1',
        title: 'Título',
        description: 'Descripción',
        document: mockExistingDoc // Usamos el objeto existente
      });

      // Aseguramos que coincide el nombre
      component.attachedFile = { hasFile: true, name: 'doc-existente.pdf', file: null };

      mockFormService.buildPreliminaryDraftPayload.mockReturnValue(mockDraft);
      jest.spyOn(component.onSave, 'emit');

      await component.submit();

      expect(mockFormService.buildPreliminaryDraftPayload).toHaveBeenCalledWith(
        mockDraft,
        [mockExistingDoc] // Pasó directamente el existente, sin leer de nuevo
      );
      expect(component.onSave.emit).toHaveBeenCalledWith(mockDraft);
    });

    it('debería emitir onSave con nuevo archivo si el formulario es válido y el payload se construye correctamente', async () => {
      const mockFile = new File([''], 'nuevo-anteproyecto.pdf', { type: 'application/pdf' });

      component.form.patchValue({
        proposalId: 'p1',
        title: 'Título de Prueba',
        description: 'Descripción',
        document: mockFile
      });

      component.attachedFile = { hasFile: true, name: 'nuevo-anteproyecto.pdf', file: mockFile };

      const mockPayload = createMockPreliminaryDraft();
      mockFormService.buildPreliminaryDraftPayload.mockReturnValue(mockPayload);
      jest.spyOn(component.onSave, 'emit');

      await component.submit();

      expect(mockedReadFileAsDataUrl).toHaveBeenCalledWith(mockFile);
      expect(mockFormService.buildPreliminaryDraftPayload).toHaveBeenCalledWith(
        null, // No hay draft inicial, porque no se configuró preliminaryDraft()
        expect.arrayContaining([
          expect.objectContaining({ name: 'nuevo-anteproyecto.pdf' })
        ])
      );
      expect(component.onSave.emit).toHaveBeenCalledWith(mockPayload);
    });

    it('debería mostrar notificación de error y abortar si la lectura del archivo falla', async () => {
      const mockFile = new File([''], 'error.pdf', { type: 'application/pdf' });

      component.form.patchValue({ proposalId: 'p1', title: 'T', description: 'D', document: mockFile });
      component.attachedFile = { hasFile: true, name: 'error.pdf', file: mockFile };

      // Simulamos que FileReader falla
      mockedReadFileAsDataUrl.mockRejectedValueOnce(new Error('Fallo de lectura simulado'));

      await component.submit();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          title: 'Error al leer el archivo'
        })
      );
      expect(mockFormService.buildPreliminaryDraftPayload).not.toHaveBeenCalled();
    });

    it('no debería emitir evento si buildPreliminaryDraftPayload retorna null', async () => {
      const mockFile = new File([''], 'nuevo.pdf', { type: 'application/pdf' });
      component.form.patchValue({ proposalId: 'p1', title: 'T', description: 'D', document: mockFile });
      component.attachedFile = { hasFile: true, name: 'nuevo.pdf', file: mockFile };

      // Simulamos que el payload falló al construirse internamente en el servicio
      mockFormService.buildPreliminaryDraftPayload.mockReturnValue(null);
      jest.spyOn(component.onSave, 'emit');

      await component.submit();

      expect(component.onSave.emit).not.toHaveBeenCalled();
    });
  });
});
