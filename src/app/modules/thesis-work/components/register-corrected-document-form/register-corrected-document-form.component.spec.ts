// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';

// 2. Componente a probar
import { RegisterCorrectedDocumentFormComponent } from './register-corrected-document-form.component';
import { RegisterCorrectedDocumentFormService } from './services/register-corrected-document-form.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

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

interface MockRegisterCorrectedDocumentFormService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  notifyFileAttached: jest.Mock<void, [string]>;
  notifyMissingDocuments: jest.Mock<void, []>;
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
  codeNumber: 1234567890, // Aprendido e integrado
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123', // Aprendido e integrado en la raíz
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterCorrectedDocumentFormComponent', () => {
  let component: RegisterCorrectedDocumentFormComponent;
  let fixture: ComponentFixture<RegisterCorrectedDocumentFormComponent>;

  // Interface de mock estricta
  let formServiceMock: MockRegisterCorrectedDocumentFormService;

  // Fábrica de datos seguros (evitando el objeto falso)
  const mockThesisWork = createMockThesisWork({ state: stateList.APROBADO });

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks definidos estructuralmente sin as unknown
    formServiceMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante'),
      getDirectorName: jest.fn().mockReturnValue('Director'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor'),
      notifyFileAttached: jest.fn(),
      notifyMissingDocuments: jest.fn()
    };

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

    // Inserción del input simulando el flujo natural de Angular
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  // Limpieza del estado de los espías entre tests
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y getters', () => {
    it('debería inicializarse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería retornar los nombres correctos delegando al servicio', () => {
      expect(component.getStudentNames()).toBe('Estudiante');
      expect(formServiceMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);

      expect(component.getDirectorName()).toBe('Director');
      expect(formServiceMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);

      expect(component.getCodirectorName()).toBe('Codirector');
      expect(formServiceMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);

      expect(component.getAdvisorName()).toBe('Asesor');
      expect(formServiceMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
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
