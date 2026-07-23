import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Component, Input, Output, EventEmitter } from '@angular/core';

import { ReviewPreliminaryDraftPageComponent } from './review-preliminary-draft-page.component';
import { ReviewPreliminaryDraftPageFacadeService, PendingReviewData } from './services/review-preliminary-draft-page-facade.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { ReviewPreliminaryDraftFormComponent } from '../../components/review-preliminary-draft-form/review-preliminary-draft-form.component';

// Mock robusto para evitar errores de propiedades no definidas (ej. title) en la vista
const mockDraft = {
  preliminaryDraftId: '123',
  proposalId: 'prop-1',
  proposal: {
    title: 'Título de prueba' // Previene el error Cannot read properties of undefined (reading 'title')
  },
  evaluators: [],
  documents: []
} as unknown as PreliminaryDraft;

@Component({
  selector: 'app-review-preliminary-draft-form',
  standalone: true,
  template: '<div></div>'
})
class MockReviewFormComponent {
  @Input() preliminaryDraft!: PreliminaryDraft;
  // Any eliminado, tipado con la interfaz correcta
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

  // Interfaz estricta para el mock del facade eliminando el 'any'
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
        ReviewPreliminaryDraftPageComponent,
        MockReviewFormComponent,
        MockConfirmationModalComponent
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
        imports: [ReviewPreliminaryDraftFormComponent] // <-- 1. Removemos el original
      },
      add: {
        imports: [MockReviewFormComponent], // <-- 2. Añadimos nuestro Mock
        providers: [
          { provide: ReviewPreliminaryDraftPageFacadeService, useValue: facadeMock }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPreliminaryDraftPageComponent);
    component = fixture.componentInstance;
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

    const formEl = fixture.nativeElement.querySelector('app-review-preliminary-draft-form');
    expect(formEl).toBeFalsy();
  });

  it('debería mostrar el formulario si preliminaryDraftState tiene datos', () => {
    // Usamos el mockDraft completo para que la renderización HTML no falle leyendo propiedades
    facadeMock.preliminaryDraftState.set(mockDraft);
    fixture.detectChanges();

    const formEl = fixture.nativeElement.querySelector('app-review-preliminary-draft-form');
    expect(formEl).toBeTruthy();
  });

  it('debería llamar a facade.goBack() al hacer click en el botón regresar', () => {
    fixture.detectChanges();
    const backBtn = fixture.nativeElement.querySelector('button');

    backBtn.click();

    expect(facadeMock.goBack).toHaveBeenCalled();
  });
});
