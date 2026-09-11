import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { ReviewPreliminaryDraftPageComponent } from './review-preliminary-draft-page.component';
import { ReviewPreliminaryDraftPageFacadeService, PendingReviewData } from './services/review-preliminary-draft-page-facade.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { ReviewPreliminaryDraftFormComponent } from '../../components/review-preliminary-draft-form/review-preliminary-draft-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { stateList } from '../../../../core/enums/state.enum';

// 🔹 REFACTOR: Fábricas de datos para generar entidades limpias sin usar 'as unknown'
// NOTA: Se corrigió 'proposal' a 'proposalData' para coincidir con la interfaz real de PreliminaryDraft
const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: '123',
  proposalId: 'prop-1',
  proposalData: { title: 'Título de prueba' } as PreliminaryDraft['proposalData'],
  evaluators: [],
  documents: [],
  ...overrides
} as PreliminaryDraft);

const createMockPendingData = (overrides: Partial<PendingReviewData> = {}): PendingReviewData => ({
  formValues: { result: stateList.APROBADO, comments: 'Todo correcto' },
  file: new File([''], 'evaluacion.pdf', { type: 'application/pdf' }),
  ...overrides
} as PendingReviewData);


@Component({
  selector: 'app-review-preliminary-draft-form',
  standalone: true,
  template: '<div></div>'
})
class MockReviewFormComponent {
  @Input() preliminaryDraft!: PreliminaryDraft;
  @Output() onSaveEvaluation = new EventEmitter<PendingReviewData>();
  @Output() onDownloadPreliminaryDraft = new EventEmitter<void>();
}

@Component({
  selector: 'app-confirmation-action-modal',
  standalone: true,
  template: '<div></div>'
})
class MockConfirmationModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}


describe('ReviewPreliminaryDraftPageComponent', () => {
  let component: ReviewPreliminaryDraftPageComponent;
  let fixture: ComponentFixture<ReviewPreliminaryDraftPageComponent>;

  // Interfaz estricta para el mock del facade (sin usar 'any')
  let facadeMock: {
    preliminaryDraftState: WritableSignal<PreliminaryDraft | null>;
    isConfirmModalOpen: WritableSignal<boolean>;
    pendingReviewData: WritableSignal<PendingReviewData | null>;
    init: jest.Mock;
    goBack: jest.Mock;
    handleRequestConfirmation: jest.Mock;
    processEvaluation: jest.Mock;
    downloadCurrentDocument: jest.Mock;
  };

  beforeEach(async () => {
    // 🔕 Silenciar los console.error y console.warn
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización del mock con tipado estricto
    facadeMock = {
      preliminaryDraftState: signal<PreliminaryDraft | null>(null),
      isConfirmModalOpen: signal<boolean>(false),
      pendingReviewData: signal<PendingReviewData | null>(null),
      init: jest.fn(),
      goBack: jest.fn(),
      handleRequestConfirmation: jest.fn(),
      processEvaluation: jest.fn(),
      downloadCurrentDocument: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        ReviewPreliminaryDraftPageComponent
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '123' } } }
        }
      ]
    })
    .overrideComponent(ReviewPreliminaryDraftPageComponent, {
      remove: {
        // Removemos los componentes reales para aislar la prueba
        imports: [ReviewPreliminaryDraftFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        // Añadimos nuestros Mocks y el provider del Facade
        imports: [MockReviewFormComponent, MockConfirmationModalComponent],
        providers: [
          { provide: ReviewPreliminaryDraftPageFacadeService, useValue: facadeMock }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPreliminaryDraftPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar las implementaciones originales de la consola
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería llamar a facade.init() en ngOnInit', () => {
    fixture.detectChanges();
    expect(facadeMock.init).toHaveBeenCalled();
  });

  it('debería ocultar el formulario si preliminaryDraftState es null', () => {
    facadeMock.preliminaryDraftState.set(null);
    fixture.detectChanges();

    const formEl = fixture.debugElement.query(By.directive(MockReviewFormComponent));
    expect(formEl).toBeNull();
  });

  it('debería mostrar el formulario si preliminaryDraftState tiene datos', () => {
    const draft = createMockDraft();
    facadeMock.preliminaryDraftState.set(draft);
    fixture.detectChanges();

    const formEl = fixture.debugElement.query(By.directive(MockReviewFormComponent));
    expect(formEl).toBeTruthy();
    // Validamos que el Input se esté pasando correctamente
    expect(formEl.componentInstance.preliminaryDraft).toEqual(draft);
  });

  it('debería llamar a facade.goBack() al hacer click en el botón regresar', () => {
    fixture.detectChanges();
    const backBtn = fixture.nativeElement.querySelector('button');

    backBtn.click();

    expect(facadeMock.goBack).toHaveBeenCalled();
  });

  describe('Interacciones con el Formulario (Hijo)', () => {
    beforeEach(() => {
      facadeMock.preliminaryDraftState.set(createMockDraft());
      fixture.detectChanges();
    });

    it('debería delegar a handleRequestConfirmation cuando el formulario emite onSaveEvaluation', () => {
      const formDebugEl = fixture.debugElement.query(By.directive(MockReviewFormComponent));
      const formComponent: MockReviewFormComponent = formDebugEl.componentInstance;

      const payload = createMockPendingData();
      formComponent.onSaveEvaluation.emit(payload);

      expect(facadeMock.handleRequestConfirmation).toHaveBeenCalledWith(payload);
    });

    it('debería delegar a downloadCurrentDocument cuando el formulario emite onDownloadPreliminaryDraft', () => {
      const formDebugEl = fixture.debugElement.query(By.directive(MockReviewFormComponent));
      const formComponent: MockReviewFormComponent = formDebugEl.componentInstance;

      formComponent.onDownloadPreliminaryDraft.emit();

      expect(facadeMock.downloadCurrentDocument).toHaveBeenCalled();
    });
  });

  describe('Interacciones con el Modal de Confirmación (Hijo)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería recibir el estado de isOpen desde el facade', () => {
      facadeMock.isConfirmModalOpen.set(true);
      fixture.detectChanges();

      const modalDebugEl = fixture.debugElement.query(By.directive(MockConfirmationModalComponent));
      expect(modalDebugEl.componentInstance.isOpen).toBe(true);
    });

    it('debería setear isConfirmModalOpen a false cuando el modal emite onClose', () => {
      facadeMock.isConfirmModalOpen.set(true); // Simulamos que está abierto
      fixture.detectChanges();

      const modalDebugEl = fixture.debugElement.query(By.directive(MockConfirmationModalComponent));
      const modalComponent: MockConfirmationModalComponent = modalDebugEl.componentInstance;

      // Desencadenamos el evento de cierre
      modalComponent.onClose.emit();

      expect(facadeMock.isConfirmModalOpen()).toBe(false);
    });

    it('debería delegar a processEvaluation cuando el modal emite confirm', () => {
      const modalDebugEl = fixture.debugElement.query(By.directive(MockConfirmationModalComponent));
      const modalComponent: MockConfirmationModalComponent = modalDebugEl.componentInstance;

      modalComponent.confirm.emit();

      expect(facadeMock.processEvaluation).toHaveBeenCalled();
    });
  });
});
