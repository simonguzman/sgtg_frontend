import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { AssignEvaluatorsPageComponent } from './assign-evaluators-page.component';
import { AssignEvaluatorsPageFacadeService } from './services/assign-evaluators-page-facade.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { AssignEvaluatorsFormComponent } from '../../components/assign-evaluators-form/assign-evaluators-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { stateList } from '../../../../core/enums/state.enum';

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-123',
  proposalId: 'prop-1',
  state: stateList.EN_REVISION,
  evaluators: [],
  documents: [],
  evaluations: [],
  ...overrides
} as PreliminaryDraft);

@Component({
  selector: 'app-assign-evaluators-form',
  standalone: true,
  template: '<div>Mock Form</div>'
})
class MockAssignEvaluatorsFormComponent {
  @Input() preliminaryDraft!: PreliminaryDraft;
  @Output() onSave = new EventEmitter<{ ev1: string; ev2: string }>();
}

@Component({
  selector: 'app-confirmation-action-modal',
  standalone: true,
  template: '<div>Mock Modal</div>'
})
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

interface ConfirmState {
  isOpen: boolean;
  pendingData: { ev1: string; ev2: string } | null;
  isProcessing: boolean;
}

describe('AssignEvaluatorsPageComponent', () => {
  let component: AssignEvaluatorsPageComponent;
  let fixture: ComponentFixture<AssignEvaluatorsPageComponent>;

  let mockFacade: {
    init: jest.Mock;
    goBack: jest.Mock;
    handleAssign: jest.Mock;
    cancelAssignment: jest.Mock;
    confirmAssignment: jest.Mock;
    selectedPreliminaryDraft: WritableSignal<PreliminaryDraft | null>;
    isDataLoading: WritableSignal<boolean>;
    confirmState: WritableSignal<ConfirmState>;
  };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFacade = {
      init: jest.fn(),
      goBack: jest.fn(),
      handleAssign: jest.fn(),
      cancelAssignment: jest.fn(),
      confirmAssignment: jest.fn(),
      selectedPreliminaryDraft: signal(null),
      isDataLoading: signal(true),
      confirmState: signal({
        isOpen: false,
        pendingData: null,
        isProcessing: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [AssignEvaluatorsPageComponent]
    })
    .overrideComponent(AssignEvaluatorsPageComponent, {
      remove: {
        imports: [AssignEvaluatorsFormComponent, ConfirmationActionModalComponent],
        providers: [AssignEvaluatorsPageFacadeService]
      },
      add: {
        imports: [MockAssignEvaluatorsFormComponent, MockConfirmationActionModalComponent],
        providers: [{ provide: AssignEvaluatorsPageFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignEvaluatorsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización y Renderizado Condicional', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería inicializar el facade al cargar el componente (ngOnInit)', () => {
      fixture.detectChanges();
      expect(mockFacade.init).toHaveBeenCalled();
    });

    it('debería mostrar el spinner (loader) cuando isDataLoading es true', () => {
      mockFacade.isDataLoading.set(true);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('.animate-spin'));
      expect(spinner).toBeTruthy();
    });

    it('debería mostrar el formulario cuando termina de cargar y hay datos', () => {
      const mockDraft = createMockDraft();
      mockFacade.isDataLoading.set(false);
      mockFacade.selectedPreliminaryDraft.set(mockDraft);
      fixture.detectChanges();

      const formElement = fixture.debugElement.query(By.directive(MockAssignEvaluatorsFormComponent));
      expect(formElement).toBeTruthy();

      expect(formElement.componentInstance.preliminaryDraft).toEqual(mockDraft);
    });
  });

  describe('Interacciones con la Vista (Eventos)', () => {
    beforeEach(() => {
      mockFacade.isDataLoading.set(false);
      mockFacade.selectedPreliminaryDraft.set(createMockDraft());
      fixture.detectChanges();
    });

    it('debería llamar a goBack() al hacer clic en el botón de Regresar', () => {
      const backButton = fixture.debugElement.query(By.css('button')).nativeElement;
      backButton.click();

      expect(mockFacade.goBack).toHaveBeenCalled();
    });

    it('debería delegar el evento onSave del formulario al método handleAssign', () => {
      const formElement = fixture.debugElement.query(By.directive(MockAssignEvaluatorsFormComponent));
      const mockEventPayload = { ev1: 'user-1', ev2: 'user-2' };

      formElement.componentInstance.onSave.emit(mockEventPayload);

      expect(mockFacade.handleAssign).toHaveBeenCalledWith(mockEventPayload);
    });
  });

  describe('Interacción con el Modal de Confirmación', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería inyectar el estado de isOpen correctamente hacia el modal', () => {
      let modalElement: MockConfirmationActionModalComponent = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent)).componentInstance;
      expect(modalElement.isOpen).toBeFalsy();

      mockFacade.confirmState.set({ isOpen: true, pendingData: null, isProcessing: false });
      fixture.detectChanges();

      modalElement = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent)).componentInstance;
      expect(modalElement.isOpen).toBeTruthy();
    });

    it('debería delegar el evento onClose hacia cancelAssignment()', () => {
      const modalElement = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent));
      modalElement.componentInstance.onClose.emit();

      expect(mockFacade.cancelAssignment).toHaveBeenCalled();
    });

    it('debería delegar el evento confirm hacia confirmAssignment()', () => {
      const modalElement = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent));
      modalElement.componentInstance.confirm.emit();

      expect(mockFacade.confirmAssignment).toHaveBeenCalled();
    });
  });
});
