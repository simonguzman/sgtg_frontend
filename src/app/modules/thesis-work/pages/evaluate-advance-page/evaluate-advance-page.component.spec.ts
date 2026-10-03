import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal, WritableSignal, Component, Input, Output, EventEmitter } from '@angular/core';
import { EvaluateAdvancePageComponent } from './evaluate-advance-page.component';
import { EvaluateAdvanceFacadeService } from './services/evaluate-advance-facade.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { User } from '../../../users/interfaces/user.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { EvaluateAdvanceFormComponent } from '../../components/evaluate-advance-form/evaluate-advance-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({ selector: 'app-evaluate-advance-form', template: '', standalone: true })
class MockEvaluateAdvanceFormComponent {
  @Input({ required: true }) advanceData!: Advance;
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Output() onBack = new EventEmitter<void>();
  @Output() onSaveEvaluation = new EventEmitter<SubmitAdvanceEvaluationPayload>();

  @Output() onDownloadAdvance = new EventEmitter<FileDocument>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

interface MockEvaluateAdvanceFacadeService {
  loadThesisWork: jest.Mock<void, [string, (t: ThesisWork) => void, () => void]>;
  saveEvaluation: jest.Mock<Promise<void>, [ThesisWork, Advance, User, SubmitAdvanceEvaluationPayload, () => void, () => void]>;

  downloadAdvance: jest.Mock<Promise<void>, [FileDocument]>;
  showNavigationError: jest.Mock<void, []>;
}

interface MockAuthService {
  currentUser: WritableSignal<User | null>;
}

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

const createMockUser = (overrides: Partial<User> = {}): User => {
  const base: Partial<User> = {
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
  };
  return base as User;
};

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => {
  const base: Partial<FileDocument> = {
    id: 'doc-1',
    name: 'documento.pdf',
    url: 'http://test/doc.pdf',
    type: DocumentType.AVANCE,
    uploadDate: new Date(),
    status: stateList.EN_REVISION,
    ...overrides
  };
  return base as FileDocument;
};

const createMockAdvance = (overrides: Partial<Advance> = {}): Advance => {
  const base: Partial<Advance> = {
    id: 'adv-1',
    title: 'Avance Real',
    comments: 'Comentarios',
    uploadDate: new Date(),
    studentId: 'u-1',
    status: stateList.EN_REVISION,
    documents: [createMockFileDocument()],
    ...overrides
  };
  return base as Advance;
};

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
    thesisWorkId: 'thesis-1',
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
      evaluators: [],
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Mock Title',
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

describe('EvaluateAdvancePageComponent', () => {
  let component: EvaluateAdvancePageComponent;
  let fixture: ComponentFixture<EvaluateAdvancePageComponent>;

  let routerSpy: Pick<Router, 'navigate'>;
  let facadeSpy: MockEvaluateAdvanceFacadeService;

  let routeParamMapGetSpy: jest.Mock;
  let parentParamMapGetSpy: jest.Mock;
  let mockActivatedRoute: MockRouteNode;

  const mockUser = createMockUser();
  const mockAdvance = createMockAdvance();
  const mockThesis = createMockThesisWork({ advances: [mockAdvance] });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    routeParamMapGetSpy = jest.fn().mockImplementation((param: string) => param === 'advanceId' ? 'adv-1' : null);
    parentParamMapGetSpy = jest.fn().mockImplementation((param: string) => param === 'id' ? 'thesis-1' : null);

    mockActivatedRoute = {
      snapshot: { paramMap: { get: routeParamMapGetSpy } },
      parent: {
        snapshot: { paramMap: { get: parentParamMapGetSpy } },
        parent: null
      }
    };

    routerSpy = {
      navigate: jest.fn()
    };

    facadeSpy = {
      loadThesisWork: jest.fn(),
      saveEvaluation: jest.fn().mockResolvedValue(undefined),
      downloadAdvance: jest.fn().mockResolvedValue(undefined),
      showNavigationError: jest.fn()
    };

    const authSpy: MockAuthService = {
      currentUser: signal<User | null>(mockUser)
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateAdvancePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: routerSpy },
        { provide: EvaluateAdvanceFacadeService, useValue: facadeSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    })
    .overrideComponent(EvaluateAdvancePageComponent, {
      remove: { imports: [EvaluateAdvanceFormComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockEvaluateAdvanceFormComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateAdvancePageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y Rutas (ngOnInit)', () => {
    it('debe procesar exitosamente la jerarquía de rutas e invocar la carga de la tesis', () => {
      fixture.detectChanges();

      expect(component.advanceId()).toBe('adv-1');
      expect(facadeSpy.loadThesisWork).toHaveBeenCalledWith(
        'thesis-1',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debe actualizar el thesisWorkState si la carga de la tesis (loadThesisWork) es exitosa', () => {
      facadeSpy.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesis));

      fixture.detectChanges();

      expect(component.thesisWorkState()).toEqual(mockThesis);
    });

    it('debe mostrar error de navegación y detenerse si falta el ID de la tesis en la ruta', () => {
      parentParamMapGetSpy.mockReturnValue(null);

      fixture.detectChanges();

      expect(facadeSpy.showNavigationError).toHaveBeenCalled();
      expect(facadeSpy.loadThesisWork).not.toHaveBeenCalled();
    });
  });

  describe('Propiedad Calculada (Computed): currentAdvance', () => {
    it('debe devolver null si el thesisWork o advanceId no han cargado aún', () => {
      fixture.detectChanges();

      expect(component.currentAdvance()).toBeNull();
    });

    it('debe devolver el avance correspondiente al advanceId extraído de la URL', () => {
      component.advanceId.set('adv-1');
      component.thesisWorkState.set(mockThesis);

      expect(component.currentAdvance()).toEqual(mockAdvance);
    });
  });

  describe('Interacciones y Manejo de Modal', () => {
    it('handleRequestConfirmation debe settear la data pendiente y abrir el modal', () => {
      const payload: SubmitAdvanceEvaluationPayload = {
        formValues: { result: AdvanceEvaluationResult.EVALUADO, comments: 'Excelente' },
        files: []
      };

      component.handleRequestConfirmation(payload);

      expect(component.pendingReviewData()).toEqual(payload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('downloadCurrentAdvance debe invocar al facade (método asíncrono) con el documento recibido', () => {
      const mockDoc = createMockFileDocument();

      component.downloadCurrentAdvance(mockDoc);

      expect(facadeSpy.downloadAdvance).toHaveBeenCalledWith(mockDoc);
    });

    it('navigateBack debe usar el router para retroceder usando el padre actual de la ruta', () => {
      component.navigateBack();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: mockActivatedRoute.parent });
    });
  });

  describe('Flujo de Guardado (processAdvanceEvaluation)', () => {
    const payloadMock: SubmitAdvanceEvaluationPayload = {
      formValues: { result: AdvanceEvaluationResult.EN_REVISION, comments: '' },
      files: []
    };

    beforeEach(() => {
      component.advanceId.set('adv-1');
      component.thesisWorkState.set(mockThesis);
      component.pendingReviewData.set(payloadMock);
      component.isConfirmModalOpen.set(true);
    });

    it('debe abortar la operación silenciosamente si falta algún dato en el estado (ej: pendingReviewData null)', () => {
      component.pendingReviewData.set(null);

      component.processAdvanceEvaluation();

      expect(facadeSpy.saveEvaluation).not.toHaveBeenCalled();
    });

    it('debe invocar a saveEvaluation del facade inyectando todas las dependencias necesarias', () => {
      component.processAdvanceEvaluation();

      expect(facadeSpy.saveEvaluation).toHaveBeenCalledWith(
        mockThesis,
        mockAdvance,
        mockUser,
        payloadMock,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('al ejecutar el callback de éxito de saveEvaluation, debe cerrar el modal y navegar hacia atrás', async () => {
      facadeSpy.saveEvaluation.mockImplementation(async (t, a, u, d, onSuccess) => {
        onSuccess();
        return Promise.resolve();
      });

      component.processAdvanceEvaluation();

      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: mockActivatedRoute.parent });
    });
  });
});
