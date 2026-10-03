import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PreliminaryDraftEditPageComponent } from './preliminary-draft-edit-page.component';
import { PreliminaryDraftEditPageService } from './services/preliminary-draft-edit-page.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { PreliminaryDraftFormComponent } from '../../components/preliminary-draft-form/preliminary-draft-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

interface MockPreliminaryDraftEditPageService {
  init: jest.Mock<void, []>;
  goBack: jest.Mock<void, []>;
  handleUpdate: jest.Mock<void, [PreliminaryDraft]>;
  cancelUpdate: jest.Mock<void, []>;
  confirmUpdate: jest.Mock<void, []>;
  preliminaryDraftToEdit: WritableSignal<PreliminaryDraft | null>;
  confirmState: WritableSignal<{ isOpen: boolean; pendingData: PreliminaryDraft | null; isProcessing: boolean }>;
}

@Component({ selector: 'app-preliminary-draft-form', standalone: true, template: '' })
class MockPreliminaryDraftFormComponent {
  @Input({ required: true }) preliminaryDraft!: PreliminaryDraft;
  @Output() onSave = new EventEmitter<PreliminaryDraft>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', standalone: true, template: '' })
class MockInfoBannerComponent {
  @Input() title = '';
}

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => {
  const base: Partial<PreliminaryDraft> = {
    preliminaryDraftId: 'draft-123',
    proposalId: 'prop-1',
    state: stateList.EN_REVISION,
    evaluators: [],
    documents: [],
    evaluations: []
  };
  return { ...base, ...overrides } as PreliminaryDraft;
};

describe('PreliminaryDraftEditPageComponent', () => {
  let component: PreliminaryDraftEditPageComponent;
  let fixture: ComponentFixture<PreliminaryDraftEditPageComponent>;

  let mockPageService: MockPreliminaryDraftEditPageService;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    mockPageService = {
      init: jest.fn(),
      goBack: jest.fn(),
      handleUpdate: jest.fn(),
      cancelUpdate: jest.fn(),
      confirmUpdate: jest.fn(),
      preliminaryDraftToEdit: signal<PreliminaryDraft | null>(null),
      confirmState: signal({
        isOpen: false,
        pendingData: null,
        isProcessing: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftEditPageComponent]
    })
    .overrideComponent(PreliminaryDraftEditPageComponent, {
      remove: {
        imports: [PreliminaryDraftFormComponent, ConfirmationActionModalComponent, InfoBannerComponent]
      },
      add: {
        imports: [MockPreliminaryDraftFormComponent, MockConfirmationActionModalComponent, MockInfoBannerComponent],
        providers: [{ provide: PreliminaryDraftEditPageService, useValue: mockPageService }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftEditPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización (ngOnInit)', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería iniciar la orquestación llamando a init() del servicio', () => {
      fixture.detectChanges();
      expect(mockPageService.init).toHaveBeenCalled();
    });
  });

  describe('Renderizado de vista (Control Flow)', () => {
    it('debería mostrar el spinner (loading state) cuando el signal preliminaryDraftToEdit es null', () => {
      mockPageService.preliminaryDraftToEdit.set(null);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('.animate-spin'));
      const formEl = fixture.debugElement.query(By.directive(MockPreliminaryDraftFormComponent));

      expect(spinner).toBeTruthy();
      expect(formEl).toBeNull();
    });

    it('debería renderizar el formulario y ocultar el spinner cuando hay datos disponibles', () => {
      const draft = createMockDraft();
      mockPageService.preliminaryDraftToEdit.set(draft);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('.animate-spin'));
      const formEl = fixture.debugElement.query(By.directive(MockPreliminaryDraftFormComponent));

      expect(spinner).toBeNull();
      expect(formEl).toBeTruthy();

      expect(formEl.componentInstance.preliminaryDraft).toEqual(draft);
    });
  });

  describe('Interacciones y Delegación de Eventos', () => {
    beforeEach(() => {
      mockPageService.preliminaryDraftToEdit.set(createMockDraft());
      fixture.detectChanges();
    });

    it('debería delegar el evento (click) del botón regresar hacia pageService.goBack()', () => {
      const backBtn = fixture.debugElement.query(By.css('button'));
      backBtn.triggerEventHandler('click', null);

      expect(mockPageService.goBack).toHaveBeenCalled();
    });

    it('debería delegar el evento (onSave) del formulario hacia pageService.handleUpdate()', () => {
      const formEl = fixture.debugElement.query(By.directive(MockPreliminaryDraftFormComponent));
      const draftToSave = createMockDraft({ proposalId: 'updated-prop' });

      formEl.componentInstance.onSave.emit(draftToSave);

      expect(mockPageService.handleUpdate).toHaveBeenCalledWith(draftToSave);
    });
  });

  describe('Interacción con el Modal de Confirmación', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería reaccionar al cambio de estado de isOpen desde el signal confirmState', () => {
      mockPageService.confirmState.set({ isOpen: true, pendingData: null, isProcessing: false });
      fixture.detectChanges();

      const modalEl = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent));

      expect(modalEl.componentInstance.isOpen).toBe(true);
    });

    it('debería delegar el evento (onClose) del modal hacia pageService.cancelUpdate()', () => {
      const modalEl = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent));
      modalEl.componentInstance.onClose.emit();

      expect(mockPageService.cancelUpdate).toHaveBeenCalled();
    });

    it('debería delegar el evento (confirm) del modal hacia pageService.confirmUpdate()', () => {
      const modalEl = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent));
      modalEl.componentInstance.confirm.emit();

      expect(mockPageService.confirmUpdate).toHaveBeenCalled();
    });
  });
});
