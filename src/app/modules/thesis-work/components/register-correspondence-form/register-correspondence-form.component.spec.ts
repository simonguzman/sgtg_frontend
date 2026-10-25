import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RegisterCorrespondenceFormComponent } from './register-correspondence-form.component';
import { RegisterCorrespondenceFormService } from './services/register-correspondence-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { SustentationRegistry } from '../../interfaces/sustentation-registry.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';

@Component({ selector: 'app-button-component', template: '', standalone: true })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() disabled: boolean | null = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', template: '<ng-content></ng-content>', standalone: true })
class MockInfoBannerComponent {
  @Input() title = '';
}

@Component({ selector: 'app-file-upload-modal', template: '', standalone: true })
class MockFileUploadModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onFileUploaded = new EventEmitter<{ fileName: string; file: File }>();
  @Output() onClose = new EventEmitter<void>();
}

interface MockRegisterCorrespondenceFormService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getMemberName: jest.Mock<string, [string | undefined]>;
  downloadDocument: jest.Mock<Promise<void>, [FileDocument | undefined | null]>;
}

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

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'archivo',
  url: 'http://test.com/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

const createMockSustentationRegistry = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sust-1',
  sustentationDate: new Date(),
  location: 'Auditorio',
  assignedJurors: [createMockUser({ id: 'j-1', firstName: 'Jurado', lastName: 'Uno' })],
  verdicts: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [createMockFileDocument({ id: 'doc-1' })],
    evaluations: [],
    specialRequests: [],
    sustentations: [createMockSustentationRegistry()],
    state: stateList.APROBADO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
        title: 'Tesis Mock',
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

describe('RegisterCorrespondenceFormComponent', () => {
  let component: RegisterCorrespondenceFormComponent;
  let fixture: ComponentFixture<RegisterCorrespondenceFormComponent>;

  let formServiceMock: MockRegisterCorrespondenceFormService;

  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    formServiceMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getMemberName: jest.fn(),
      downloadDocument: jest.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterCorrespondenceFormComponent]
    })
    .overrideComponent(RegisterCorrespondenceFormComponent, {
      remove: {
        imports: [ButtonComponent, InfoBannerComponent, FileUploadModalComponent],
        providers: [RegisterCorrespondenceFormService]
      },
      add: {
        imports: [MockButtonComponent, MockInfoBannerComponent, MockFileUploadModalComponent],
        providers: [{ provide: RegisterCorrespondenceFormService, useValue: formServiceMock }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrespondenceFormComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.componentRef.setInput('isSubmitting', false);

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y Computed Signals', () => {
    it('el formato E es el que adjuntó el Consejo en la última programación; el acta, la de la última sesión calificada', () => {
      const formatoE1 = createMockFileDocument({ id: 'e-1', type: DocumentType.FORMATO_E });
      const formatoE2 = createMockFileDocument({ id: 'e-2', type: DocumentType.FORMATO_E });
      const actaSesion1 = createMockFileDocument({ id: 'g-1', type: DocumentType.FORMATO_G });
      const formatoSolicitud = createMockFileDocument({ id: 'e-solicitud', type: DocumentType.FORMATO_E });
      const pazYSalvo = createMockFileDocument({ id: 'f-1', type: DocumentType.PAZ_Y_SALVO });
      const sesion = (id: string, formatEDocument: FileDocument, acta?: FileDocument) => createMockSustentationRegistry({
        id, formatEDocument,
        verdicts: acta ? [{ jurorId: 'j1', veredict: stateList.APLAZADO, observations: '', evaluationDate: new Date(),
          attachedDocument: acta }] : []
      } as Partial<SustentationRegistry>);
      // La segunda sesión (más reciente, primero) aún sin calificar; la primera se aplazó con su acta
      fixture.componentRef.setInput('thesisWork', createMockThesisWork({
        sustentations: [sesion('sesion-2', formatoE2), sesion('sesion-1', formatoE1, actaSesion1)],
        finalDeliveries: [{ id: 'entrega-final', uploadDate: new Date(), monograph: formatoSolicitud,
          formatE: formatoSolicitud, pazYSalvo, status: stateList.EN_REVISION }]
      } as Partial<ThesisWork>));

      expect(component.formatoEDoc()?.id).toBe('e-2');
      expect(component.formatoGDoc()?.id).toBe('g-1');
      expect(component.formatoFDoc()?.id).toBe('f-1');
    });

    it('sin sesiones el formato E es el de la solicitud de sustentación', () => {
      const formatoSolicitud = createMockFileDocument({ id: 'e-solicitud', type: DocumentType.FORMATO_E });
      fixture.componentRef.setInput('thesisWork', createMockThesisWork({
        sustentations: [],
        finalDeliveries: [{ id: 'entrega-final', uploadDate: new Date(), monograph: formatoSolicitud,
          formatE: formatoSolicitud, status: stateList.EN_REVISION }]
      } as Partial<ThesisWork>));

      expect(component.formatoEDoc()?.id).toBe('e-solicitud');
      expect(component.formatoGDoc()).toBeUndefined();
    });

    it('debería llamar al método de descarga del servicio', () => {
      const mockDoc = createMockFileDocument();

      component.downloadDocument(mockDoc);

      expect(formServiceMock.downloadDocument).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe('Interacción con el Modal de Archivos', () => {
    it('debería guardar el archivo emitido por el modal y cerrar el modal', () => {
      const mockFile = new File([''], 'formato_h.pdf', { type: 'application/pdf' });
      const eventPayload = { fileName: 'formato_h.pdf', file: mockFile };

      component.isModalOpen.set(true);

      component.handleFileUploaded(eventPayload);

      expect(component.selectedFile()).toEqual(eventPayload);
      expect(component.isModalOpen()).toBeFalsy();
    });

    it('debería limpiar el archivo seleccionado (removeSelectedFile)', () => {
      const mockFile = new File([''], 'doc.pdf', { type: 'application/pdf' });
      component.selectedFile.set({ fileName: 'doc.pdf', file: mockFile });

      component.removeSelectedFile();

      expect(component.selectedFile()).toBeNull();
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
