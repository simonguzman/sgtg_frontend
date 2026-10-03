import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { ProposalCreatePageComponent } from './proposal-create-page.component';
import { ProposalCreateFacadeService } from './services/proposal-create-facade.service';
import { Proposal } from '../../interfaces/proposal.interface';
import { ProposalFormComponent } from '../../components/proposal-form/proposal-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({ selector: 'app-proposal-form', standalone: true, template: '' })
class MockProposalFormComponent {}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {}

interface MockLocation {
  back: jest.Mock;
}

interface MockFacade {
  validate: jest.Mock;
  save: jest.Mock;
}

describe('ProposalCreatePageComponent', () => {
  let component: ProposalCreatePageComponent;
  let fixture: ComponentFixture<ProposalCreatePageComponent>;
  let mockLocation: MockLocation;
  let mockFacade: MockFacade;
  const mockProposal = { title: 'Test Proposal' } as Proposal;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

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
        { provide: Location, useValue: mockLocation as Partial<Location> },
        { provide: ProposalCreateFacadeService, useValue: mockFacade as Partial<ProposalCreateFacadeService> },
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('handleCreateProposal()', () => {
    it('NO debe abrir el modal ni setear proposal si la validación falla', () => {
      mockFacade.validate.mockReturnValue(false);
      component.handleCreateProposal(mockProposal);
      expect(component.pendingProposal()).toBeNull();
      expect(component.isModalOpen()).toBeFalsy();
    });

    it('debe setear pendingProposal y abrir modal si la validación es exitosa', () => {
      mockFacade.validate.mockReturnValue(true);
      component.handleCreateProposal(mockProposal);
      expect(component.pendingProposal()).toEqual(mockProposal);
      expect(component.isModalOpen()).toBeTruthy();
    });
  });

  describe('confirmCreation()', () => {
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
        expect.any(Function),
        expect.any(Function)
      );
      const onSuccessCallback = mockFacade.save.mock.calls[0][1];
      onSuccessCallback();
      expect(component.pendingProposal()).toBeNull();
      const onErrorCallback = mockFacade.save.mock.calls[0][2];
      onErrorCallback();
    });
  });

  describe('cancelCreation()', () => {
    it('debe cerrar el modal y limpiar pendingProposal', () => {
      component.isModalOpen.set(true);
      component.pendingProposal.set(mockProposal);
      component.cancelCreation();
      expect(component.isModalOpen()).toBeFalsy();
      expect(component.pendingProposal()).toBeNull();
    });
  });

  describe('goBack()', () => {
    it('debe llamar a location.back()', () => {
      component.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
