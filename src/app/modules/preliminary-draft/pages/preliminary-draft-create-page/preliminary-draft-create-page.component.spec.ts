import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { PreliminaryDraftCreatePageComponent } from './preliminary-draft-create-page.component';
import { PreliminaryDraftCreatePageService } from './services/preliminary-draft-create-page.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { PreliminaryDraftFormComponent } from '../../components/preliminary-draft-form/preliminary-draft-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { User } from '../../../users/interfaces/user.interface';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  roles: [],
  ...overrides
} as User);

type ProposalData = NonNullable<PreliminaryDraft['proposalData']>;
const createMockProposalData = (overrides: Partial<ProposalData> = {}): ProposalData => ({
  id: 'prop-1',
  title: 'Título de prueba',
  description: 'Descripción',
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  authors: [],
  director: createMockUser(),
  ...overrides
} as ProposalData);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.EN_REVISION,
  createdData: new Date(),
  evaluations: [],
  documents: [],
  proposalData: createMockProposalData(),
  ...overrides
} as PreliminaryDraft);

@Component({
  selector: 'app-preliminary-draft-form',
  template: '<div>Mock Form</div>',
  standalone: true
})
class MockPreliminaryDraftFormComponent {
  @Output() onSave = new EventEmitter<PreliminaryDraft>();
}

@Component({
  selector: 'app-confirmation-action-modal',
  template: '<div>Mock Modal</div>',
  standalone: true
})
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

interface ConfirmState {
  isOpen: boolean;
  pendingData: PreliminaryDraft | null;
  isProcessing: boolean;
}

describe('PreliminaryDraftCreatePageComponent', () => {
  let component: PreliminaryDraftCreatePageComponent;
  let fixture: ComponentFixture<PreliminaryDraftCreatePageComponent>;

  let mockPageService: {
    checkAccess: jest.Mock;
    goBack: jest.Mock;
    openConfirmation: jest.Mock;
    cancelCreation: jest.Mock;
    confirmCreation: jest.Mock;
    confirmState: WritableSignal<ConfirmState>;
  };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockPageService = {
      checkAccess: jest.fn(),
      goBack: jest.fn(),
      openConfirmation: jest.fn(),
      cancelCreation: jest.fn(),
      confirmCreation: jest.fn(),
      confirmState: signal<ConfirmState>({
        isOpen: false,
        pendingData: null,
        isProcessing: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftCreatePageComponent]
    })
    .overrideComponent(PreliminaryDraftCreatePageComponent, {
      remove: {
        providers: [PreliminaryDraftCreatePageService],
        imports: [PreliminaryDraftFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        providers: [{ provide: PreliminaryDraftCreatePageService, useValue: mockPageService }],
        imports: [MockPreliminaryDraftFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftCreatePageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería verificar el acceso al inicializar (ngOnInit)', () => {
      fixture.detectChanges();
      expect(mockPageService.checkAccess).toHaveBeenCalled();
    });
  });

  describe('Interacciones del DOM', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería llamar a goBack del servicio al hacer clic en el botón de regresar', () => {
      const backButton = fixture.debugElement.query(By.css('button')).nativeElement;
      backButton.click();

      expect(mockPageService.goBack).toHaveBeenCalled();
    });
  });

  describe('Integración con Componentes Hijos (Eventos de Salida)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería llamar a openConfirmation cuando el formulario emita onSave', () => {
      const mockDraft = createMockDraft();

      const formElement = fixture.debugElement.query(By.directive(MockPreliminaryDraftFormComponent));
      formElement.triggerEventHandler('onSave', mockDraft);

      expect(mockPageService.openConfirmation).toHaveBeenCalledWith(mockDraft);
    });

    it('debería pasar el estado "isOpen" correcto al modal desde el Signal', () => {
      let modalComponent: MockConfirmationActionModalComponent = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent)).componentInstance;
      expect(modalComponent.isOpen).toBeFalsy();

      mockPageService.confirmState.set({ isOpen: true, pendingData: null, isProcessing: false });
      fixture.detectChanges();

      modalComponent = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent)).componentInstance;
      expect(modalComponent.isOpen).toBeTruthy();
    });

    it('debería llamar a cancelCreation cuando el modal emita onClose', () => {
      const modalElement = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent));
      modalElement.triggerEventHandler('onClose', null);

      expect(mockPageService.cancelCreation).toHaveBeenCalled();
    });

    it('debería llamar a confirmCreation cuando el modal emita confirm', () => {
      const modalElement = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent));
      modalElement.triggerEventHandler('confirm', null);

      expect(mockPageService.confirmCreation).toHaveBeenCalled();
    });
  });
});
