// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { By } from '@angular/platform-browser';

// 2. Componente a probar
import { UploadFinalDeliveryFormComponent, UploadedFile } from './upload-final-delivery-form.component';
import { UploadFinalDeliveryFormService } from './services/upload-final-delivery-form.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// 4. Componentes Reales para hacer Override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

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
  @Output() onFileUploaded = new EventEmitter<UploadedFile>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', template: '', standalone: true })
class MockInfoBannerComponent {
  @Input() title = '';
}

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'DeepPartial') ────────

interface MockUploadFinalDeliveryFormService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  notifyFileAttached: jest.Mock<void, [string]>;
  notifyMissingDocuments: jest.Mock<void, []>;
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
        title: 'Título Test',
        description: 'Desc Test',
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

describe('UploadFinalDeliveryFormComponent', () => {
  let component: UploadFinalDeliveryFormComponent;
  let fixture: ComponentFixture<UploadFinalDeliveryFormComponent>;

  // Tipado estricto sin usar Partial
  let formServiceSpy: MockUploadFinalDeliveryFormService;

  // Mock estructurado generado por fábrica
  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Arrange: Inicialización limpia de mocks
    formServiceSpy = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante'),
      getDirectorName: jest.fn().mockReturnValue('Director'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor'),
      notifyFileAttached: jest.fn(),
      notifyMissingDocuments: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UploadFinalDeliveryFormComponent]
    })
    .overrideComponent(UploadFinalDeliveryFormComponent, {
      remove: {
        imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent],
        providers: [UploadFinalDeliveryFormService] // Removemos el proveedor real
      },
      add: {
        imports: [MockFileUploadModalComponent, MockButtonComponent, MockInfoBannerComponent],
        providers: [{ provide: UploadFinalDeliveryFormService, useValue: formServiceSpy }] // Inyectamos mock
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadFinalDeliveryFormComponent);
    component = fixture.componentInstance;

    // Asignación segura con SetInput nativo
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Estado Inicial', () => {
    it('debe inicializarse con todos los archivos nulos y ningún modal activo', () => {
      expect(component.uploadedMonograph()).toBeNull();
      expect(component.uploadedFormatE()).toBeNull();
      expect(component.uploadedAnnexes()).toBeNull();
      expect(component.activeModal()).toBeNull();
      expect(component.isSubmitAttempted()).toBe(false);
    });

    it('debe invocar los métodos del servicio para formatear los nombres de los participantes', () => {
      expect(component.getStudentNames()).toBe('Estudiante');
      expect(component.getDirectorName()).toBe('Director');
      expect(component.getCodirectorName()).toBe('Codirector');
      expect(component.getAdvisorName()).toBe('Asesor');

      expect(formServiceSpy.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceSpy.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceSpy.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(formServiceSpy.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('Control de Modales (openModal / closeModal)', () => {
    it('debe establecer el modal activo al invocar openModal', () => {
      component.openModal('MONOGRAPH');
      expect(component.activeModal()).toBe('MONOGRAPH');
    });

    it('debe resetear el modal activo a null al llamar closeModal', () => {
      component.openModal('FORMAT_E');
      component.closeModal();
      expect(component.activeModal()).toBeNull();
    });
  });

  describe('Manejo y Carga de Archivos', () => {
    const mockFilePayload: UploadedFile = { fileName: 'test.pdf', file: new File([], 'test.pdf') };

    it('debe guardar la monografía y notificar al adjuntar', () => {
      component.openModal('MONOGRAPH');
      component.handleFileUploaded(mockFilePayload);

      expect(component.uploadedMonograph()).toEqual(mockFilePayload);
      expect(component.activeModal()).toBeNull();
      expect(formServiceSpy.notifyFileAttached).toHaveBeenCalledWith('test.pdf');
    });

    it('debe guardar formato E y anexos de manera independiente', () => {
      component.openModal('FORMAT_E');
      component.handleFileUploaded(mockFilePayload);
      expect(component.uploadedFormatE()).toEqual(mockFilePayload);

      component.openModal('ANNEXES');
      component.handleFileUploaded(mockFilePayload);
      expect(component.uploadedAnnexes()).toEqual(mockFilePayload);
    });

    it('debe eliminar el archivo correspondiente al invocar removeFile', () => {
      component.openModal('MONOGRAPH');
      component.handleFileUploaded(mockFilePayload);

      component.removeFile('MONOGRAPH');
      expect(component.uploadedMonograph()).toBeNull();
    });
  });

  describe('Envío del Formulario (submit) y UI', () => {
    it('debe activar isSubmitAttempted y notificar faltantes si no se adjuntan los 3 archivos obligatorios', () => {
      const emitSpy = jest.spyOn(component.onSaveDelivery, 'emit');

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceSpy.notifyMissingDocuments).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debe emitir el evento onSaveDelivery cuando los 3 documentos están presentes', () => {
      const emitSpy = jest.spyOn(component.onSaveDelivery, 'emit');
      const mockFileM = new File([], 'm.pdf');
      const mockFileF = new File([], 'f.pdf');
      const mockFileA = new File([], 'a.pdf');

      component.openModal('MONOGRAPH');
      component.handleFileUploaded({ fileName: 'm.pdf', file: mockFileM });

      component.openModal('FORMAT_E');
      component.handleFileUploaded({ fileName: 'f.pdf', file: mockFileF });

      component.openModal('ANNEXES');
      component.handleFileUploaded({ fileName: 'a.pdf', file: mockFileA });

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceSpy.notifyMissingDocuments).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith({
        monograph: mockFileM,
        formatE: mockFileF,
        annexes: mockFileA
      });
    });

    it('debe pasar la propiedad disabled al botón de guardar si isSubmitting es true', () => {
      // Arrange
      fixture.componentRef.setInput('isSubmitting', true);
      fixture.detectChanges();

      // Act
      // Usamos By.directive para obtener robustez en lugar de selectores de atributos que podrían fallar
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      const saveButton = buttons.find(b => b.componentInstance.label === 'Guardar');

      // Assert
      expect(saveButton).toBeTruthy();
      expect(saveButton!.componentInstance.disabled).toBe(true);
    });
  });
});
