// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange, Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// 2. Componente a probar
import { EvaluateAdvanceFormComponent } from './evaluate-advance-form.component';
import { EvaluateAdvanceFormService } from './services/evaluate-advance-form.service';

// 3. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

// 4. Componentes Reales para hacer Override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// ── Mocks de Componentes Hijos (Standalone y Strict-Init) ────────────────────

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

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown') ─────────────────────

interface MockEvaluateAdvanceFormService {
  evaluationForm: FormGroup;
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => {
  const base: Partial<User> = {
    id: 'user-123',
    idType: IdentificationType.CC,
    idNumber: 123456789,
    firstName: 'Estudiante',
    secondName: '',
    lastName: 'Prueba',
    secondLastName: '',
    codeNumber: 1234567890,
    email: 'test@test.com',
    password: 'hash',
    state: UserState.active,
    roles: [],
    ...overrides
  };
  return base as User;
};

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
    thesisWorkId: 'mock-id-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    // FIX: Utilizamos un Utility Type (NonNullable) para mapear exactamente
    // las interfaces sin usar `any` ni tener que importar dependencias circulares.
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluators: [],
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
        title: 'Título',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      } as NonNullable<ThesisWork['preliminaryDraftData']>['proposalData']
    } as NonNullable<ThesisWork['preliminaryDraftData']>
  };
  return { ...baseThesis, ...overrides } as ThesisWork;
};

const createMockAdvance = (overrides: Partial<Advance> = {}): Advance => {
  const document: FileDocument = {
    id: '1',
    name: 'doc1.pdf',
    url: 'url1',
    type: DocumentType.AVANCE,
    uploadDate: new Date(),
    status: stateList.EN_REVISION
  };

  const base: Partial<Advance> = {
    id: 'adv-1',
    title: 'Avance 1',
    comments: 'Comentario estudiante',
    uploadDate: new Date(),
    studentId: 'user-123',
    status: stateList.EN_REVISION,
    documents: [document],
    ...overrides
  };
  return base as Advance;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateAdvanceFormComponent', () => {
  let component: EvaluateAdvanceFormComponent;
  let fixture: ComponentFixture<EvaluateAdvanceFormComponent>;
  let formServiceSpy: MockEvaluateAdvanceFormService;

  const mockThesisWork = createMockThesisWork();
  const mockAdvanceData = createMockAdvance();

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Inicializamos un formulario reactivo real para el mock.
    // FIX: Usamos fb.control con el tipado exacto para aceptar `undefined` y simular un form vacío.
    const fb = new FormBuilder();
    const mockForm = fb.group({
      result: fb.control<AdvanceEvaluationResult | undefined>(undefined, Validators.required),
      comments: fb.control<string>('', Validators.required)
    });

    // Construcción estricta del Mock Service
    formServiceSpy = {
      evaluationForm: mockForm,
      getStudentNames: jest.fn().mockReturnValue('Estudiante Prueba'),
      getDirectorName: jest.fn().mockReturnValue('Director Prueba'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector Prueba'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor Prueba')
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateAdvanceFormComponent, ReactiveFormsModule]
    })
    .overrideComponent(EvaluateAdvanceFormComponent, {
      remove: {
        imports: [ButtonComponent, FileUploadModalComponent, InfoBannerComponent],
        providers: [EvaluateAdvanceFormService]
      },
      add: {
        imports: [MockButtonComponent, MockFileUploadModalComponent, MockInfoBannerComponent],
        providers: [{ provide: EvaluateAdvanceFormService, useValue: formServiceSpy }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateAdvanceFormComponent);
    component = fixture.componentInstance;

    // Asignación de Inputs requeridos ANTES de detectar cambios
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.componentRef.setInput('advanceData', mockAdvanceData);

    // Espiamos los event emitters
    jest.spyOn(component.onSaveEvaluation, 'emit');
    jest.spyOn(component.onDownloadAdvance, 'emit');

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Getters y Estado Inicial', () => {
    it('debe calcular isReadOnly correctamente basado en los inputs de evaluación', () => {
      expect(component.isReadOnly).toBe(false);

      fixture.componentRef.setInput('alreadyEvaluated', true);
      expect(component.isReadOnly).toBe(true);

      fixture.componentRef.setInput('alreadyEvaluated', false);
      fixture.componentRef.setInput('isFullyEvaluated', true);
      expect(component.isReadOnly).toBe(true);
    });

    it('debe retornar la lista de documentos de avance de forma segura', () => {
      const docs = component.advanceDocuments;

      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe('doc1.pdf');
    });

    it('debe retornar una lista vacía si documents viene vacío', () => {
      fixture.componentRef.setInput('advanceData', createMockAdvance({ documents: [] }));
      expect(component.advanceDocuments).toEqual([]);
    });
  });

  describe('Ciclo de vida (ngOnChanges)', () => {
    it('debe deshabilitar el formulario si el estado cambia a read-only (alreadyEvaluated = true)', () => {
      fixture.componentRef.setInput('alreadyEvaluated', true);

      const changes = {
        alreadyEvaluated: new SimpleChange(false, true, false)
      };

      component.ngOnChanges(changes);

      expect(component.evaluationForm.disabled).toBe(true);
    });

    it('debe habilitar el formulario si el estado cambia a editable', () => {
      fixture.componentRef.setInput('alreadyEvaluated', false);
      fixture.componentRef.setInput('isFullyEvaluated', false);
      component.evaluationForm.disable(); // Forzamos estado deshabilitado inicial

      const changes = {
        isFullyEvaluated: new SimpleChange(true, false, false)
      };

      component.ngOnChanges(changes);

      expect(component.evaluationForm.enabled).toBe(true);
    });
  });

  describe('Manejo de Archivos (Retroalimentación vía Signals)', () => {
    it('debe agregar un archivo al Signal al disparar handleFeedbackUploaded y cerrar el modal', () => {
      const mockFile = new File([''], 'test.pdf');
      const payload = { fileName: 'test.pdf', file: mockFile };
      component.isFeedbackModalOpen.set(true);

      component.handleFeedbackUploaded(payload);

      expect(component.uploadedFeedbackFiles()).toEqual([payload]);
      expect(component.isFeedbackModalOpen()).toBe(false);
    });

    it('debe eliminar un archivo del Signal basado en su índice (removeFeedbackFile)', () => {
      const mockFile = new File([''], 'test.pdf');
      component.uploadedFeedbackFiles.set([
        { fileName: 'f1.pdf', file: mockFile },
        { fileName: 'f2.pdf', file: mockFile }
      ]);

      component.removeFeedbackFile(0);

      expect(component.uploadedFeedbackFiles()).toHaveLength(1);
      expect(component.uploadedFeedbackFiles()[0].fileName).toBe('f2.pdf');
    });
  });

  describe('Validación y Envío (submit)', () => {
    it('debe marcar el formulario como touched y no emitir si el formulario es inválido', () => {
      // FIX: Utilizamos `undefined` en lugar de `null` para cumplir con el tipado estricto
      component.evaluationForm.patchValue({ result: undefined, comments: '' });

      component.submit();

      expect(component.evaluationForm.touched).toBe(true);
      expect(component.isFieldInvalid('comments')).toBe(true);
      expect(component.onSaveEvaluation.emit).not.toHaveBeenCalled();
    });

    it('debe emitir el payload formateado correctamente si el formulario es válido', () => {
      const mockFile = new File([''], 'retro.pdf');
      component.uploadedFeedbackFiles.set([{ fileName: 'retro.pdf', file: mockFile }]);

      component.evaluationForm.patchValue({
        result: AdvanceEvaluationResult.EVALUADO,
        comments: 'Excelente avance, todo en orden.'
      });

      component.submit();

      expect(component.onSaveEvaluation.emit).toHaveBeenCalledWith({
        formValues: {
          result: AdvanceEvaluationResult.EVALUADO,
          comments: 'Excelente avance, todo en orden.'
        },
        files: [mockFile]
      });
    });
  });

  describe('Delegación al FormService (Proxies)', () => {
    it('debe llamar al servicio para obtener los nombres de estudiantes', () => {
      expect(component.getStudentNames()).toBe('Estudiante Prueba');
      expect(formServiceSpy.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debe llamar al servicio para obtener el nombre del director', () => {
      expect(component.getDirectorName()).toBe('Director Prueba');
      expect(formServiceSpy.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debe llamar al servicio para obtener el nombre del codirector', () => {
      expect(component.getCodirectorName()).toBe('Codirector Prueba');
      expect(formServiceSpy.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debe llamar al servicio para obtener el nombre del asesor', () => {
      expect(component.getAdvisorName()).toBe('Asesor Prueba');
      expect(formServiceSpy.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });
});
