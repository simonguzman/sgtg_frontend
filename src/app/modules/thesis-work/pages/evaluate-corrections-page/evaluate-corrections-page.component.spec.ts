import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluateCorrectionsPageComponent } from './evaluate-corrections-page.component';
import { EvaluateCorrectionsFacadeService } from './services/evaluate-corrections-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { EvaluateCorrectionsFormComponent } from '../../components/evaluate-corrections-form/evaluate-corrections-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
// IMPORTANTE: Asegúrate de importar tu Enum si 'veredict' lo requiere
import { stateList } from '../../../../core/enums/state.enum';

// --- Tipo Utilitario Estricto ---
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

// --- Mocks de Componentes Hijos ---
@Component({ selector: 'app-evaluate-corrections-form', template: '', standalone: true })
class MockEvaluateCorrectionsFormComponent {
  @Input() thesisWork!: ThesisWork;
  @Input() isSubmitting!: boolean;
  @Output() onSubmitEvaluation = new EventEmitter<{ evaluation: Omit<Evaluation, 'id' | 'date'>; file: File }>();
  @Output() onGoBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen!: boolean;
  @Input() description!: string;
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

describe('EvaluateCorrectionsPageComponent', () => {
  let component: EvaluateCorrectionsPageComponent;
  let fixture: ComponentFixture<EvaluateCorrectionsPageComponent>;
  let facadeMock: jest.Mocked<EvaluateCorrectionsFacadeService>;
  let routerMock: jest.Mocked<Router>;

  // Función refactorizada para crear el mock de la ruta SIN 'unknown'
  const createRouteMock = (id: string | null, parentId: string | null = null): ActivatedRoute => {
    return {
      snapshot: {
        paramMap: { get: jest.fn().mockReturnValue(id) }
      },
      parent: parentId ? {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue(parentId) } },
        parent: null
      } : null
    } as DeepPartial<ActivatedRoute> as ActivatedRoute;
  };

  beforeEach(async () => {
    // Inicialización de mocks limpia
    facadeMock = {
      loadThesisWork: jest.fn(),
      saveEvaluation: jest.fn(),
      showNavigationError: jest.fn(),
    } as DeepPartial<EvaluateCorrectionsFacadeService> as jest.Mocked<EvaluateCorrectionsFacadeService>;

    routerMock = {
      navigate: jest.fn(),
    } as DeepPartial<Router> as jest.Mocked<Router>;

    await TestBed.configureTestingModule({
      imports: [EvaluateCorrectionsPageComponent],
      providers: [
        { provide: EvaluateCorrectionsFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: createRouteMock('123') }
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
  });

  describe('ngOnInit e Inicialización de Ruta', () => {
    it('debería extraer el id y llamar a loadThesisWork', () => {
      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería extraer el id del padre si no está en la ruta actual', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [EvaluateCorrectionsPageComponent],
        providers: [
          { provide: EvaluateCorrectionsFacadeService, useValue: facadeMock },
          { provide: Router, useValue: routerMock },
          { provide: ActivatedRoute, useValue: createRouteMock(null, 'parent-456') }
        ]
      }).overrideComponent(EvaluateCorrectionsPageComponent, {
        remove: { imports: [EvaluateCorrectionsFormComponent, ConfirmationActionModalComponent] },
        add: { imports: [MockEvaluateCorrectionsFormComponent, MockConfirmationActionModalComponent] }
      });

      const newFixture = TestBed.createComponent(EvaluateCorrectionsPageComponent);
      newFixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'parent-456',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería mostrar error de navegación y regresar si no hay id', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [EvaluateCorrectionsPageComponent],
        providers: [
          { provide: EvaluateCorrectionsFacadeService, useValue: facadeMock },
          { provide: Router, useValue: routerMock },
          { provide: ActivatedRoute, useValue: createRouteMock(null, null) }
        ]
      }).overrideComponent(EvaluateCorrectionsPageComponent, {
        remove: { imports: [EvaluateCorrectionsFormComponent, ConfirmationActionModalComponent] },
        add: { imports: [MockEvaluateCorrectionsFormComponent, MockConfirmationActionModalComponent] }
      });

      const newFixture = TestBed.createComponent(EvaluateCorrectionsPageComponent);
      newFixture.detectChanges();

      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.any(Object));
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería setear la tesis en state cuando loadThesisWork retorna éxito', () => {
      let successCallback: (work: ThesisWork) => void = () => {};
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess, onError) => {
        successCallback = onSuccess;
      });

      fixture.detectChanges();

      // Uso de DeepPartial en lugar de 'unknown'
      const mockWork = { thesisWorkId: '123' } as DeepPartial<ThesisWork> as ThesisWork;
      successCallback(mockWork);

      expect(component.thesisWorkState()).toEqual(mockWork);
    });
  });

  describe('Acciones de Flujo de UI', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('handleOpenConfirmation debería guardar la evaluación pendiente y abrir el modal', () => {
      const mockEvent = {
        // Asumiendo que usas el Enum stateList
        evaluation: { veredict: stateList.APROBADO } as DeepPartial<Omit<Evaluation, 'id' | 'date'>> as Omit<Evaluation, 'id' | 'date'>,
        file: new File([''], 'test.pdf')
      };

      component.handleOpenConfirmation(mockEvent);

      expect(component.pendingEvaluationData()).toEqual(mockEvent);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('goBack debería navegar hacia loaded_documents', () => {
      component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.any(Object));
    });
  });

  describe('executeEvaluationSave', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('no debería hacer nada si no hay data pendiente o id de tesis', () => {
      component.pendingEvaluationData.set(null);
      component.executeEvaluationSave();

      expect(component.isSubmitting()).toBe(false);
      expect(facadeMock.saveEvaluation).not.toHaveBeenCalled();
    });

    it('debería manejar el flujo de éxito de guardado', () => {
      const mockEvent = {
        evaluation: { veredict: stateList.APROBADO } as DeepPartial<Omit<Evaluation, 'id' | 'date'>> as Omit<Evaluation, 'id' | 'date'>,
        file: new File([''], 'test.pdf')
      };

      component.thesisWorkState.set({ thesisWorkId: '123' } as DeepPartial<ThesisWork> as ThesisWork);
      component.handleOpenConfirmation(mockEvent);

      let successCallback: () => void = () => {};
      facadeMock.saveEvaluation.mockImplementation((id, evalData, file, onSuccess, onError) => {
        successCallback = onSuccess;
      });

      component.executeEvaluationSave();

      expect(component.isSubmitting()).toBe(true);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.saveEvaluation).toHaveBeenCalledWith('123', mockEvent.evaluation, mockEvent.file, expect.any(Function), expect.any(Function));

      successCallback();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.any(Object));
    });

    it('debería manejar el flujo de error de guardado', () => {
      const mockEvent = {
        evaluation: {} as DeepPartial<Omit<Evaluation, 'id' | 'date'>> as Omit<Evaluation, 'id' | 'date'>,
        file: new File([''], 'test.pdf')
      };

      component.thesisWorkState.set({ thesisWorkId: '123' } as DeepPartial<ThesisWork> as ThesisWork);
      component.pendingEvaluationData.set(mockEvent);

      let errorCallback: () => void = () => {};
      facadeMock.saveEvaluation.mockImplementation((id, evalData, file, onSuccess, onError) => {
        errorCallback = onError;
      });

      component.executeEvaluationSave();

      errorCallback();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
