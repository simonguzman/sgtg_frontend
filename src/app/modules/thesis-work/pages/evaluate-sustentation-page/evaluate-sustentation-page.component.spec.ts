import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluateSustentationPageComponent } from './evaluate-sustentation-page.component';
import { EvaluateSustentationFacadeService } from './services/evaluate-sustentation-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationEvaluationPayload } from '../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { stateList } from '../../../../core/enums/state.enum';
import { SustentationVeredict } from '../../services/thesis-work-sustentation.service';

// Importaciones reales
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { EvaluateSustentationFormComponent } from '../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';

// Stubs con tipado estricto
@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen!: boolean;
  @Input() description!: string;
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-evaluate-sustentation-form', template: '', standalone: true })
class MockEvaluateSustentationFormComponent {
  @Input() thesisWork!: ThesisWork;
  @Input() isSubmitting!: boolean;
  @Output() onSave = new EventEmitter<{ payload: SustentationEvaluationPayload; file: File }>();
  @Output() onBack = new EventEmitter<void>();
}

// Interfaz para eliminar el 'any' en el mock de ActivatedRoute
interface MockActivatedRoute {
  snapshot: { paramMap: { get: jest.Mock } };
  parent: MockActivatedRoute | null;
}

describe('EvaluateSustentationPageComponent', () => {
  let component: EvaluateSustentationPageComponent;
  let fixture: ComponentFixture<EvaluateSustentationPageComponent>;
  let facadeMock: jest.Mocked<EvaluateSustentationFacadeService>;
  let routerMock: jest.Mocked<Router>;
  let activatedRouteMock: MockActivatedRoute;

  beforeEach(async () => {
    facadeMock = {
      loadThesisWork: jest.fn(),
      processEvaluation: jest.fn()
    } as unknown as jest.Mocked<EvaluateSustentationFacadeService>;

    routerMock = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    // Mock estricto sin usar 'any'
    activatedRouteMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateSustentationPageComponent],
      providers: [
        { provide: EvaluateSustentationFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock as unknown as ActivatedRoute }
      ]
    })
    .overrideComponent(EvaluateSustentationPageComponent, {
      remove: { imports: [ConfirmationActionModalComponent, EvaluateSustentationFormComponent] },
      add: { imports: [MockConfirmationActionModalComponent, MockEvaluateSustentationFormComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateSustentationPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ngOnInit y Navegación', () => {
    it('debería buscar el ID en la ruta anidada y cargar la tesis', () => {
      // Simular que facade.loadThesisWork llama al callback onSuccess
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => {
        onSuccess({ thesisWorkId: '123' } as ThesisWork);
      });

      fixture.detectChanges(); // Dispara ngOnInit

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith('123', expect.any(Function), expect.any(Function));
      expect(component.thesisWorkState()?.thesisWorkId).toBe('123');
    });

    it('debería regresar si no encuentra el ID en la ruta', () => {
      // Modificamos el mock para que nunca encuentre el ID de forma segura
      if (activatedRouteMock.parent) {
        activatedRouteMock.parent.snapshot.paramMap.get = jest.fn().mockReturnValue(null);
      }

      const goBackSpy = jest.spyOn(component, 'goBack');
      fixture.detectChanges();

      expect(goBackSpy).toHaveBeenCalled();
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería navegar a loaded_documents al llamar a goBack', () => {
      component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: activatedRouteMock.parent as unknown as ActivatedRoute });
    });
  });

  describe('Flujo de Guardado', () => {
    // Uso de unknown intermedio para castear enum a un tipo cerrado sin usar 'any'
    const mockData = {
      payload: {
        veredict: stateList.APROBADO as unknown as SustentationVeredict,
        observations: '',
        evaluationDate: new Date()
      },
      file: new File([''], 'test.pdf')
    };

    beforeEach(() => {
      component.thesisWorkState.set({ thesisWorkId: '123' } as ThesisWork);
    });

    it('debería almacenar datos temporales y abrir el modal en handleSaveTriggered', () => {
      component.handleSaveTriggered(mockData);

      expect(component.pendingData()).toEqual(mockData);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('debería procesar la sustentación y ejecutar onSuccess', () => {
      component.pendingData.set(mockData);
      const goBackSpy = jest.spyOn(component, 'goBack');

      // Simulamos la ejecución del callback onSuccess
      facadeMock.processEvaluation.mockImplementation((id, payload, file, onSuccess) => {
        onSuccess();
      });

      component.processSustentationEvaluation();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processEvaluation).toHaveBeenCalledWith('123', mockData.payload, mockData.file, expect.any(Function), expect.any(Function));
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('debería procesar la sustentación y manejar el onError si falla', () => {
      component.pendingData.set(mockData);
      const goBackSpy = jest.spyOn(component, 'goBack');

      // Simulamos la ejecución del callback onError
      facadeMock.processEvaluation.mockImplementation((id, payload, file, onSuccess, onError) => {
        onError();
      });

      component.processSustentationEvaluation();

      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).not.toHaveBeenCalled(); // No debe regresar si falló
    });

    it('no debería procesar nada si no hay datos pendientes o no hay ID de tesis', () => {
      component.pendingData.set(null);
      component.processSustentationEvaluation();

      expect(facadeMock.processEvaluation).not.toHaveBeenCalled();
    });
  });
});
