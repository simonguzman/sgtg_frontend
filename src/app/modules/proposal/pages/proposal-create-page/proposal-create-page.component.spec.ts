import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProposalCreatePageComponent } from './proposal-create-page.component';
import { Location } from '@angular/common';
import { ProposalCreateFacadeService } from './services/proposal-create-facade.service';
import { Component } from '@angular/core';
import { Proposal } from '../../interfaces/proposal.interface';
import { ProposalFormComponent } from '../../components/proposal-form/proposal-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// 1. Mocks de Componentes Hijos (Shallow Testing)
@Component({ selector: 'app-proposal-form', standalone: true, template: '' })
class MockProposalFormComponent {}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {}

describe('ProposalCreatePageComponent', () => {
  let component: ProposalCreatePageComponent;
  let fixture: ComponentFixture<ProposalCreatePageComponent>;

  // 2. Tipado estricto de Mocks de dependencias
  let mockLocation: { back: jest.Mock };
  let mockFacade: { validate: jest.Mock; save: jest.Mock };

  const mockProposal = { title: 'Test Proposal' } as unknown as Proposal;

  beforeEach(async () => {
    mockLocation = {
      back: jest.fn(),
    };

    mockFacade = {
      validate: jest.fn(),
      save: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProposalCreatePageComponent],
      providers: [
        { provide: Location, useValue: mockLocation as unknown as Location },
        { provide: ProposalCreateFacadeService, useValue: mockFacade as unknown as ProposalCreateFacadeService },
      ],
    })
      .overrideComponent(ProposalCreatePageComponent, {
        remove: {
          imports: [ProposalFormComponent, ConfirmationActionModalComponent],
        },
        add: {
          imports: [MockProposalFormComponent, MockConfirmationActionModalComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProposalCreatePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('handleCreateProposal', () => {
    it('NO debe abrir el modal ni setear proposal si la validación falla', () => {
      mockFacade.validate.mockReturnValue(false); // Falla la validación

      component.handleCreateProposal(mockProposal);

      expect(component.pendingProposal()).toBeNull();
      expect(component.isModalOpen()).toBeFalsy();
    });

    it('debe setear pendingProposal y abrir modal si la validación es exitosa', () => {
      mockFacade.validate.mockReturnValue(true); // Pasa la validación

      component.handleCreateProposal(mockProposal);

      expect(component.pendingProposal()).toEqual(mockProposal);
      expect(component.isModalOpen()).toBeTruthy();
    });
  });

  describe('confirmCreation', () => {
    it('NO debe llamar a save si no hay pendingProposal (null)', () => {
      component.pendingProposal.set(null);

      component.confirmCreation();

      expect(mockFacade.save).not.toHaveBeenCalled();
    });

    it('debe cerrar modal, delegar a save y limpiar pendingProposal al éxito', () => {
      component.pendingProposal.set(mockProposal);
      component.isModalOpen.set(true);

      component.confirmCreation();

      expect(component.isModalOpen()).toBeFalsy();
      expect(mockFacade.save).toHaveBeenCalledWith(
        mockProposal,
        expect.any(Function), // onSuccess callback
        expect.any(Function)  // onError callback
      );

      // Extraemos el callback 'onSuccess' que se pasó como segundo argumento al mock de 'save'
      const onSuccessCallback = mockFacade.save.mock.calls[0][1];

      // Ejecutamos el callback y verificamos que el estado interno se limpió
      onSuccessCallback();
      expect(component.pendingProposal()).toBeNull();

      // Ejecutamos el onError para cubrir el 100% de la rama (aunque esté vacío en el componente)
      const onErrorCallback = mockFacade.save.mock.calls[0][2];
      onErrorCallback();
    });
  });

  describe('cancelCreation', () => {
    it('debe cerrar el modal y limpiar pendingProposal', () => {
      component.isModalOpen.set(true);
      component.pendingProposal.set(mockProposal);

      component.cancelCreation();

      expect(component.isModalOpen()).toBeFalsy();
      expect(component.pendingProposal()).toBeNull();
    });
  });

  describe('goBack', () => {
    it('debe llamar a location.back()', () => {
      component.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
