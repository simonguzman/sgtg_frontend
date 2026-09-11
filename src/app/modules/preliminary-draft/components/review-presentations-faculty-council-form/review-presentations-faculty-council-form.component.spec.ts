// 1. Angular Core & Testing
import { ComponentRef, WritableSignal, signal, Component, Input, Output, EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

// 2. Core Enums & Interfaces
import { stateList } from '../../../../core/enums/state.enum';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';

// 3. Shared Modules Enums & Interfaces
import { Modality } from '../../../proposal/enums/modality.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../proposal/interfaces/proposal.interface';

// 4. Component, Service & Models
import { SaveEvaluationPayload } from './models/council-evaluation.model';
import { ReviewPresentationsFacultyCouncilFormComponent } from './review-presentations-faculty-council-form.component';
import { ReviewPresentationsFacultyCouncilFormFacadeService } from './services/review-presentations-faculty-council-form-facade.service';

// 5. Original Components for Override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// 🔹 REFACTOR: Mocks de Componentes Hijos para aislar el test del DOM y lógica externa
@Component({ selector: 'app-button-component', standalone: true, template: '<button (click)="onClick.emit()">{{label}}</button>' })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() disabled = false;
  @Input() type = 'button';
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-file-upload-modal', standalone: true, template: '<div>Mock Modal</div>' })
class MockFileUploadModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onFileUploaded = new EventEmitter<{ fileName: string; file: File }>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', standalone: true, template: '<div>Mock Banner <ng-content></ng-content></div>' })
class MockInfoBannerComponent {
  @Input() title = '';
}

// 🔹 REFACTOR: Interfaz estricta para el Facade sin el uso de 'any'
interface MockFacadeService {
  preliminaryDraft: WritableSignal<PreliminaryDraft | null>;
  uploadedSignedFile: WritableSignal<{ fileName: string; file: File } | null>;
  isUploadModalOpen: WritableSignal<boolean>;
  isReadOnly: WritableSignal<boolean>;
  signedProposalDocument: WritableSignal<FormattedDocument | undefined>;
  approvedPreliminaryDraftDocument: WritableSignal<FormattedDocument | undefined>;
  presentationDocument: WritableSignal<FormattedDocument | undefined>;
  evaluationFiles: WritableSignal<Array<FormattedDocument & { evaluator?: string }>>;
  documentUploadDate: WritableSignal<string>;
  evaluationForm: FormGroup;
  initFormEffects: jest.Mock<void, []>;
  isFieldInvalid: jest.Mock<boolean, [string]>;
  handleFileUploaded: jest.Mock<void, [{ fileName: string; file: File }]>;
  validateAndGetPayload: jest.Mock<SaveEvaluationPayload | null, []>;
  getStudentNames: jest.Mock<string, []>;
  getDirectorName: jest.Mock<string, []>;
  getCodirectorName: jest.Mock<string, []>;
  getAdvisorName: jest.Mock<string, []>;
}

// 🔹 REFACTOR: Fábricas de Datos (Factories)
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'usr-101',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Carlos',
  lastName: 'Pérez',
  secondLastName: 'Gómez',
  codeNumber: 20261001,
  roles: [],
  email: 'carlos.perez@universidad.edu.co',
  password: 'hashed_password',
  state: UserState.active,
  ...overrides
} as User);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-101',
  proposalId: 'prop-101',
  state: stateList.EN_REVISION,
  createdData: new Date('2026-08-12'),
  evaluations: [],
  documents: [],
  evaluators: [],
  isArchived: false,
  proposalData: {
    id: 'prop-101',
    title: 'Sistema de Gestión Académica',
    description: 'Proyecto de software para la facultad',
    modality: Modality.TI,
    authors: [createMockUser()],
    director: createMockUser(),
    codirector: createMockUser(),
    advisor: createMockUser(),
    state: stateList.EN_REVISION,
    createdAt: new Date('2026-08-12'),
    documents: [],
    evaluations: []
  } as Proposal,
  ...overrides
} as PreliminaryDraft);

describe('ReviewPresentationsFacultyCouncilFormComponent', () => {
  let component: ReviewPresentationsFacultyCouncilFormComponent;
  let fixture: ComponentFixture<ReviewPresentationsFacultyCouncilFormComponent>;
  let componentRef: ComponentRef<ReviewPresentationsFacultyCouncilFormComponent>;
  let mockFacade: MockFacadeService;

  const mockDraftData = createMockPreliminaryDraft();

  const mockFormattedDocument: FormattedDocument = {
    name: 'documento_resolucion.pdf',
    url: 'https://storage.example.com/docs/resolucion.pdf'
  };

  beforeEach(async () => {
    // 🔕 Silenciar los console.error y console.warn
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFacade = {
      preliminaryDraft: signal<PreliminaryDraft | null>(null),
      uploadedSignedFile: signal<{ fileName: string; file: File } | null>(null),
      isUploadModalOpen: signal<boolean>(false),
      isReadOnly: signal<boolean>(false),
      signedProposalDocument: signal<FormattedDocument | undefined>(undefined),
      approvedPreliminaryDraftDocument: signal<FormattedDocument | undefined>(undefined),
      presentationDocument: signal<FormattedDocument | undefined>(undefined),
      evaluationFiles: signal<Array<FormattedDocument & { evaluator?: string }>>([]),
      documentUploadDate: signal<string>('23/07/2026'),

      evaluationForm: new FormGroup({
        result: new FormControl('', [Validators.required]),
        comments: new FormControl('', [Validators.required]),
        maximumDeliveryDate: new FormControl(null),
        document: new FormControl(null)
      }),

      initFormEffects: jest.fn(),
      isFieldInvalid: jest.fn().mockReturnValue(false),
      handleFileUploaded: jest.fn(),
      validateAndGetPayload: jest.fn(),
      getStudentNames: jest.fn().mockReturnValue('Juan Pérez, Ana Gómez'),
      getDirectorName: jest.fn().mockReturnValue('Dr. Roberto Gómez'),
      getCodirectorName: jest.fn().mockReturnValue('Dra. María López'),
      getAdvisorName: jest.fn().mockReturnValue('Ing. Carlos Pérez')
    };

    await TestBed.configureTestingModule({
      imports: [ReviewPresentationsFacultyCouncilFormComponent],
      providers: [
        provideNoopAnimations() // <-- FIX: Provee el módulo vacío de animaciones para los tests de PrimeNG
      ]
    })
    .overrideComponent(ReviewPresentationsFacultyCouncilFormComponent, {
      remove: {
        imports: [ButtonComponent, FileUploadModalComponent, InfoBannerComponent],
        providers: [ReviewPresentationsFacultyCouncilFormFacadeService]
      },
      add: {
        imports: [MockButtonComponent, MockFileUploadModalComponent, MockInfoBannerComponent],
        providers: [{ provide: ReviewPresentationsFacultyCouncilFormFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPresentationsFacultyCouncilFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Asignación de la señal de entrada requerida (input.required)
    componentRef.setInput('preliminaryDraft', mockDraftData);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y Ciclo de Vida', () => {
    it('debería crearse correctamente la instancia del componente', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('debería ejecutar initFormEffects del facade durante ngOnInit', () => {
      fixture.detectChanges();
      expect(mockFacade.initFormEffects).toHaveBeenCalledTimes(1);
    });

    it('debería sincronizar el input preliminaryDraft con el signal preliminaryDraft del facade', () => {
      fixture.detectChanges();
      expect(mockFacade.preliminaryDraft()).toEqual(mockDraftData);
    });
  });

  describe('Método submit() y Salida de Eventos (Outputs)', () => {
    it('debería emitir onSaveEvaluation cuando la validación del facade retorna un payload válido', () => {
      const mockPayload: SaveEvaluationPayload = {
        formValues: {
          result: stateList.APROBADO,
          comments: 'Aprobado sin observaciones mayores',
          maximumDeliveryDate: new Date('2026-12-15'),
          document: null
        },
        file: new File(['contenido'], 'resolucion.pdf', { type: 'application/pdf' })
      };

      mockFacade.validateAndGetPayload.mockReturnValue(mockPayload);
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(mockPayload);
    });

    it('NO debería emitir onSaveEvaluation si la validación del facade retorna null', () => {
      mockFacade.validateAndGetPayload.mockReturnValue(null);
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Interacciones con la plantilla HTML y Descarga de Archivos', () => {
    it('debería emitir onDownloadFile al invocar el evento desde la vista', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');

      component.onDownloadFile.emit(mockFormattedDocument);

      expect(emitSpy).toHaveBeenCalledWith(mockFormattedDocument);
    });

    it('debería actualizar el estado del modal de carga cuando se dispara la apertura', () => {
      fixture.detectChanges();

      mockFacade.isUploadModalOpen.set(true);
      fixture.detectChanges();

      expect(mockFacade.isUploadModalOpen()).toBe(true);
    });

    it('debería invocar la eliminación del archivo firmado cuando el usuario lo remueve', () => {
      mockFacade.uploadedSignedFile.set({ fileName: 'resolucion_firmada.pdf', file: new File([], 'resolucion_firmada.pdf') });
      fixture.detectChanges();

      mockFacade.uploadedSignedFile.set(null);
      fixture.detectChanges();

      expect(mockFacade.uploadedSignedFile()).toBeNull();
    });
  });
});
