import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluateCorrectionsPageComponent } from './evaluate-corrections-page.component';
import { EvaluateCorrectionsFacadeService } from './services/evaluate-corrections-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { EvaluateCorrectionsFormComponent } from '../../components/evaluate-corrections-form/evaluate-corrections-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({ selector: 'app-evaluate-corrections-form', template: '', standalone: true })
class MockEvaluateCorrectionsFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSubmitEvaluation = new EventEmitter<{ evaluation: Omit<Evaluation, 'id' | 'date'>; file: File }>();
  @Output() onGoBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockEvaluateCorrectionsFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  saveEvaluation: jest.Mock<void, [string, Omit<Evaluation, 'id' | 'date'>, File, () => void, () => void]>;
  showNavigationError: jest.Mock<void, []>;
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
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
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

const createMockEvaluationPayload = (overrides: Partial<Omit<Evaluation, 'id' | 'date'>> = {}): Omit<Evaluation, 'id' | 'date'> => ({
  documentId: 'doc-1',
  proposalId: 'prop-1',
  evaluatorId: 'u-1',
  evaluatorName: 'Jurado Asignado',
  evaluatorRole: 'JURADO',
  veredict: stateList.APROBADO,
  observations: 'Dictamen validado correctamente.',
  ...overrides
});

describe('EvaluateCorrectionsPageComponent', () => {
  let component: EvaluateCorrectionsPageComponent;
  let fixture: ComponentFixture<EvaluateCorrectionsPageComponent>;

  let facadeMock: MockEvaluateCorrectionsFacadeService;
  let routerMock: MockRouter;
  let activatedRouteMock: MockRouteNode;

  const mockWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    facadeMock = {
      loadThesisWork: jest.fn(),
      saveEvaluation: jest.fn(),
      showNavigationError: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    activatedRouteMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateCorrectionsPageComponent],
      providers: [
        { provide: EvaluateCorrectionsFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    })
    .overrideComponent(EvaluateCorrectionsPageComponent, {
      remove: {
        imports: [EvaluateCorrectionsFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockEvaluateCorrectionsFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateCorrectionsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('ngOnInit e Inicialización de Ruta', () => {
    it('debería extraer el id de la ruta actual y llamar a loadThesisWork', () => {
      activatedRouteMock.snapshot.paramMap.get.mockReturnValue('456');

      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        '456',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería extraer el id del padre si no está en la ruta actual', () => {
      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería mostrar error de navegación y regresar si no hay id en el árbol de rutas', () => {
      activatedRouteMock.snapshot.paramMap.get.mockReturnValue(null);
      activatedRouteMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.any(Object));
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería setear la tesis en state cuando loadThesisWork retorna éxito', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockWork));

      fixture.detectChanges();

      expect(component.thesisWorkState()).toEqual(mockWork);
    });
  });

  describe('Acciones de Flujo de UI', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('handleOpenConfirmation debería guardar la evaluación pendiente y abrir el modal', () => {
      const mockEvent = {
        evaluation: createMockEvaluationPayload(),
        file: new File([''], 'test.pdf')
      };

      component.handleOpenConfirmation(mockEvent);

      expect(component.pendingEvaluationData()).toEqual(mockEvent);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('goBack debería navegar hacia loaded_documents con la ruta padre relativa', () => {
      component.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: activatedRouteMock.parent });
    });
  });

  describe('executeEvaluationSave', () => {
    const mockEvent = {
      evaluation: createMockEvaluationPayload(),
      file: new File([''], 'test.pdf')
    };

    beforeEach(() => {
      fixture.detectChanges();
      component.thesisWorkState.set(mockWork);
    });

    it('no debería hacer nada si no hay data pendiente o id de tesis', () => {
      component.pendingEvaluationData.set(null);

      component.executeEvaluationSave();

      expect(component.isSubmitting()).toBe(false);
      expect(facadeMock.saveEvaluation).not.toHaveBeenCalled();
    });

    it('debería manejar el flujo de éxito de guardado, apagar loading y retroceder', () => {
      component.handleOpenConfirmation(mockEvent);

      facadeMock.saveEvaluation.mockImplementation((id, evalData, file, onSuccess) => onSuccess());

      component.executeEvaluationSave();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.saveEvaluation).toHaveBeenCalledWith(
        '123',
        mockEvent.evaluation,
        mockEvent.file,
        expect.any(Function),
        expect.any(Function)
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: activatedRouteMock.parent });
    });

    it('debería manejar el flujo de error de guardado bajando la bandera de envío sin retroceder', () => {
      component.pendingEvaluationData.set(mockEvent);
      component.isConfirmModalOpen.set(true);

      facadeMock.saveEvaluation.mockImplementation((id, evalData, file, onSuccess, onError) => onError());

      component.executeEvaluationSave();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
