import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProposalEditPageComponent } from './proposal-edit-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ProposalEditFacadeService } from './services/proposal-edit-facade.service';
import { Proposal } from '../../interfaces/proposal.interface';

// 1. Importar los componentes REALES para poder removerlos del componente standalone
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ProposalFormComponent } from '../../components/proposal-form/proposal-form.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// 2. Mocks de componentes standalone hijos
@Component({ selector: 'app-proposal-form', standalone: true, template: '' })
class MockProposalFormComponent {
  @Input() proposal!: Proposal;
  @Output() onSubmit = new EventEmitter<Proposal>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', standalone: true, template: '' })
class MockInfoBannerComponent {
  @Input() title = '';
}

describe('ProposalEditPageComponent', () => {
  let component: ProposalEditPageComponent;
  let fixture: ComponentFixture<ProposalEditPageComponent>;

  let mockRouter: { navigate: jest.Mock };
  let mockRoute: { snapshot: { paramMap: { get: jest.Mock } } };
  let mockLocation: { back: jest.Mock };
  let mockFacade: {
    loadAndAuthorize: jest.Mock;
    validateRules: jest.Mock;
    saveUpdate: jest.Mock;
    showValidationError: jest.Mock;
  };

  const mockProposal = { id: '1', title: 'Test' } as unknown as Proposal;

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };
    mockRoute = { snapshot: { paramMap: { get: jest.fn() } } };
    mockLocation = { back: jest.fn() };
    mockFacade = {
      loadAndAuthorize: jest.fn(),
      validateRules: jest.fn(),
      saveUpdate: jest.fn(),
      showValidationError: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProposalEditPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter as unknown as Router },
        { provide: ActivatedRoute, useValue: mockRoute as unknown as ActivatedRoute },
        { provide: Location, useValue: mockLocation as unknown as Location },
        { provide: ProposalEditFacadeService, useValue: mockFacade as unknown as ProposalEditFacadeService },
      ],
    })
    .overrideComponent(ProposalEditPageComponent, {
      // AQUÍ ESTABA EL ERROR: Ahora removemos los reales y agregamos los mocks
      remove: { imports: [ConfirmationActionModalComponent, ProposalFormComponent, InfoBannerComponent] },
      add: { imports: [MockConfirmationModalComponent, MockProposalFormComponent, MockInfoBannerComponent] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposalEditPageComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('debe navegar a /proposal si no hay ID en la ruta', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue(null);
      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal']);
      expect(mockFacade.loadAndAuthorize).not.toHaveBeenCalled();
    });

    it('debe llamar a facade.loadAndAuthorize y setear proposalToEdit en éxito', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('1');
      fixture.detectChanges();

      // Simulamos que la fachada resuelve con éxito (primer callback)
      const onSuccess = mockFacade.loadAndAuthorize.mock.calls[0][1];
      onSuccess(mockProposal);

      expect(component.proposalToEdit()).toEqual(mockProposal);
    });
  });

  describe('handleUpdate', () => {
    it('debe mostrar error de validación si la fachada retorna un mensaje', () => {
      mockFacade.validateRules.mockReturnValue('Error de validación');
      component.handleUpdate(mockProposal);

      expect(mockFacade.showValidationError).toHaveBeenCalledWith('Error de validación');
      expect(component.isModalOpen()).toBeFalsy();
    });

    it('debe abrir el modal y setear pendingData si no hay errores', () => {
      mockFacade.validateRules.mockReturnValue(null);
      component.handleUpdate(mockProposal);

      expect(component.pendingData()).toEqual(mockProposal);
      expect(component.isModalOpen()).toBeTruthy();
    });
  });

  describe('confirmUpdate', () => {
    beforeEach(() => {
      component.proposalToEdit.set(mockProposal);
      component.pendingData.set({ ...mockProposal, title: 'Updated' } as unknown as Proposal);
    });

    it('debe llamar a saveUpdate de la fachada y navegar en éxito', () => {
      component.confirmUpdate();

      expect(component.isModalOpen()).toBeFalsy();

      // Simulamos callback de éxito de la fachada
      const onSuccess = mockFacade.saveUpdate.mock.calls[0][2];
      onSuccess();

      expect(component.pendingData()).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal']);
    });
  });
});
