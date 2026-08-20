import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftCreatePageComponent } from './preliminary-draft-create-page.component';
import { PreliminaryDraftCreatePageService } from './services/preliminary-draft-create-page.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../proposal/interfaces/proposal.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { PreliminaryDraftFormComponent } from '../../components/preliminary-draft-form/preliminary-draft-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// 1. Mocks de Componentes Hijos (Standalone)
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

// 2. Tipado estricto para el estado del servicio
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
      imports: [PreliminaryDraftCreatePageComponent] // Componente real
    })
    .overrideComponent(PreliminaryDraftCreatePageComponent, {
      remove: {
        // Removemos el servicio real y los componentes hijos reales
        providers: [PreliminaryDraftCreatePageService],
        imports: [PreliminaryDraftFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        // Agregamos el mock del servicio y los componentes hijos simulados
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
      // AQUÍ SE CORRIGIÓ EL ERROR: Se agregó 'evaluations: []'
      const mockDraft: PreliminaryDraft = {
        preliminaryDraftId: '1',
        proposalId: '2',
        proposalData: {} as Proposal,
        documents: [],
        evaluations: [], // <-- PROPIEDAD FALTANTE AGREGADA
        state: stateList.EN_REVISION,
        createdData: new Date()
      };

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
