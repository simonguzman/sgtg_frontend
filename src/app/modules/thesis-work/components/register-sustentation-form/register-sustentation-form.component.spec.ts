// 1. Angular Core, Testing y Formularios
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DatePicker } from 'primeng/datepicker';

// 2. Componente a probar
import { RegisterSustentationFormComponent, SustentationFormPayload } from './register-sustentation-form.component';
import { RegisterSustentationFormService } from './services/register-sustentation-form.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { Modality } from '../../../proposal/enums/modality.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

// 4. Componentes Reales para Override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';

// ── Mocks de Componentes Hijos (Standalone) ──────────────────────────────────

@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() type = 'button';
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

@Component({
  selector: 'app-searchable-select',
  template: '',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MockSearchableSelectComponent), multi: true }]
})
class MockSearchableSelectComponent {
  @Input() id = '';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = '';
  @Input() hasError = false;
  @Input() isValid = false;
  writeValue(obj: any): void {}
  registerOnChange(fn: any): void {}
  registerOnTouched(fn: any): void {}
}

@Component({
  selector: 'p-datepicker',
  template: '',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MockDatePickerComponent), multi: true }]
})
class MockDatePickerComponent {
  @Input() showTime = false;
  @Input() hourFormat = '12';
  @Input() placeholder = '';
  @Input() styleClass = '';
  @Input() inputStyleClass = '';
  writeValue(obj: any): void {}
  registerOnChange(fn: any): void {}
  registerOnTouched(fn: any): void {}
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockRegisterSustentationFormService {
  form: FormGroup;
  getEligibleJurors: jest.Mock<User[], [ThesisWork]>;
  getMemberFullName: jest.Mock<string, [User | undefined]>;
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getExistingDocument: jest.Mock<FileDocument | null, [ThesisWork, string]>;
  notifyIncompleteForm: jest.Mock<void, []>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

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
        title: 'Título Mock',
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
  name: 'documento.pdf',
  url: 'http://test/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterSustentationFormComponent', () => {
  let component: RegisterSustentationFormComponent;
  let fixture: ComponentFixture<RegisterSustentationFormComponent>;
  let formServiceMock: MockRegisterSustentationFormService;
  let fb: FormBuilder;

  const mockThesisWork = createMockThesisWork();
  const mockUsers: User[] = [
    createMockUser({ id: 'j1', firstName: 'Jurado', lastName: 'Uno' }),
    createMockUser({ id: 'j2', firstName: 'Jurado', lastName: 'Dos' }),
    createMockUser({ id: 'j3', firstName: 'Jurado', lastName: 'Tres' })
  ];

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    fb = new FormBuilder();

    // Creamos el FormGroup reactivo exactamente igual al original
    const mockForm = fb.nonNullable.group({
      sustentationDate: ['', Validators.required],
      location: ['', Validators.required],
      juror1: ['', Validators.required],
      juror2: ['', Validators.required]
    });

    formServiceMock = {
      form: mockForm,
      getEligibleJurors: jest.fn().mockReturnValue(mockUsers),
      getMemberFullName: jest.fn().mockImplementation((u: User | undefined) => u ? `${u.firstName} ${u.lastName}` : 'No asignado'),
      getStudentNames: jest.fn().mockReturnValue('Estudiante Test'),
      getDirectorName: jest.fn().mockReturnValue('Director Test'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector Test'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor Test'),
      getExistingDocument: jest.fn().mockReturnValue(null),
      notifyIncompleteForm: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        RegisterSustentationFormComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ]
    })
    .overrideComponent(RegisterSustentationFormComponent, {
      remove: {
        imports: [ButtonComponent, FileUploadModalComponent, InfoBannerComponent, SearchableSelectComponent, DatePicker],
        providers: [RegisterSustentationFormService]
      },
      add: {
        imports: [MockButtonComponent, MockFileUploadModalComponent, MockInfoBannerComponent, MockSearchableSelectComponent, MockDatePickerComponent],
        providers: [{ provide: RegisterSustentationFormService, useValue: formServiceMock }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSustentationFormComponent);
    component = fixture.componentInstance;

    // Asignación segura del Signal input requerido
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Signals (Signals & Computeds)', () => {
    it('debería calcular las opciones de juror1 correctamente usando getEligibleJurors', () => {
      const options = component.juror1Options();
      expect(options).toHaveLength(3);
      expect(options[0].label).toBe('Jurado Uno');
      expect(formServiceMock.getEligibleJurors).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería limpiar juror2 si se selecciona en juror1 el mismo ID y filtrar juror2Options', () => {
      // Configuramos un estado inicial
      component.form.get('juror2')?.setValue('j2');

      // Simulamos la selección del jurado 2 en el selector del jurado 1
      component.form.get('juror1')?.setValue('j2');
      fixture.detectChanges();

      // El jurado 2 debió ser reseteado
      expect(component.form.get('juror2')?.value).toBe('');

      // juror2Options ya no debería incluir al 'j2'
      const j2Options = component.juror2Options();
      expect(j2Options.find(opt => opt.id === 'j2')).toBeUndefined();
      expect(j2Options).toHaveLength(2); // Quedan j1 y j3
    });

    it('debería retornar el nombre por defecto para uploadedFileName si no hay archivo', () => {
      component.uploadedFormatE.set(null);
      expect(component.uploadedFileName()).toBe('Formato_E - Sustentación');
    });

    it('debería retornar el nombre del archivo cargado en uploadedFileName', () => {
      const file = new File([''], 'formato_e_firmado.pdf');
      component.uploadedFormatE.set({ fileName: 'formato_e_firmado.pdf', file });
      expect(component.uploadedFileName()).toBe('formato_e_firmado.pdf');
    });
  });

  describe('Delegaciones al Servicio (UI Helpers)', () => {
    it('debería delegar la obtención de nombres al servicio', () => {
      expect(component.getStudentNames()).toBe('Estudiante Test');
      expect(component.getDirectorName()).toBe('Director Test');
      expect(component.getCodirectorName()).toBe('Codirector Test');
      expect(component.getAdvisorName()).toBe('Asesor Test');

      expect(formServiceMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar getMemberFullName al servicio', () => {
      const user = createMockUser({ firstName: 'Juan', lastName: 'Perez' });
      component.getMemberFullName(user);
      expect(formServiceMock.getMemberFullName).toHaveBeenCalledWith(user);
    });

    it('debería delegar getExistingDocument al servicio', () => {
      component.getExistingDocument('MONOGRAFIA');
      expect(formServiceMock.getExistingDocument).toHaveBeenCalledWith(mockThesisWork, 'MONOGRAFIA');
    });
  });

  describe('Validaciones de Campos de la UI (isFieldInvalid / isFieldValid)', () => {
    it('isFieldInvalid debería ser true si el campo es inválido y fue tocado', () => {
      const control = component.form.get('location');
      control?.markAsTouched();
      expect(component.isFieldInvalid('location')).toBe(true);
    });

    it('isFieldInvalid debería ser true si hay intento de envío (isSubmitAttempted) y es inválido', () => {
      component.isSubmitAttempted.set(true);
      expect(component.isFieldInvalid('location')).toBe(true);
    });

    it('isFieldValid debería ser true si el campo es válido y fue tocado o hay intento de envío', () => {
      const control = component.form.get('location');
      control?.setValue('Auditorio Principal');

      expect(component.isFieldValid('location')).toBe(false); // Válido pero no tocado/enviado

      control?.markAsTouched();
      expect(component.isFieldValid('location')).toBe(true); // Válido y tocado
    });
  });

  describe('Manejo de Archivos', () => {
    it('debería emitir onDownloadFile solo si el documento no es nulo', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');

      // Caso nulo
      component.downloadDocument(null);
      expect(emitSpy).not.toHaveBeenCalled();

      // Caso exitoso
      const mockDoc = createMockFileDocument({ id: 'doc1', name: 'archivo.pdf' });
      component.downloadDocument(mockDoc);
      expect(emitSpy).toHaveBeenCalledWith(mockDoc);
    });

    it('handleFileUploaded debería guardar el archivo y cerrar el modal', () => {
      component.isModalOpen.set(true);
      const mockEvent = { fileName: 'test.pdf', file: new File([''], 'test.pdf') };

      component.handleFileUploaded(mockEvent);

      expect(component.uploadedFormatE()).toEqual(mockEvent);
      expect(component.isModalOpen()).toBe(false);
    });
  });

  describe('Envío del Formulario (submit)', () => {
    it('debería marcar campos como tocados, intentar envío y notificar si es inválido (campos vacíos)', () => {
      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(component.form.touched).toBe(true);
      expect(formServiceMock.notifyIncompleteForm).toHaveBeenCalled();
    });

    it('debería notificar error si el formulario es válido pero falta el archivo', () => {
      component.form.setValue({
        sustentationDate: '2026-08-18T10:00:00',
        location: 'Auditorio',
        juror1: 'j1',
        juror2: 'j2'
      });
      component.uploadedFormatE.set(null); // Sin archivo

      component.submit();

      expect(formServiceMock.notifyIncompleteForm).toHaveBeenCalled();
    });

    it('debería emitir onSave con los valores crudos (raw value) y el archivo si todo es correcto', () => {
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      const mockFile = new File([''], 'test.pdf');
      const mockDateStr = '2026-08-18T10:00:00';

      component.form.setValue({
        sustentationDate: mockDateStr,
        location: 'Auditorio',
        juror1: 'j1',
        juror2: 'j2'
      });
      component.uploadedFormatE.set({ fileName: 'test.pdf', file: mockFile });

      component.submit();

      expect(formServiceMock.notifyIncompleteForm).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith({
        payload: {
          sustentationDate: mockDateStr,
          location: 'Auditorio',
          juror1: 'j1',
          juror2: 'j2'
        },
        file: mockFile
      });
    });
  });
});
