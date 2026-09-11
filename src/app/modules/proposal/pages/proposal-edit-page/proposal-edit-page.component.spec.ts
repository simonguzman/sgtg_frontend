import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

import { ProposalEditPageComponent } from './proposal-edit-page.component';
import { ProposalEditFacadeService } from './services/proposal-edit-facade.service';

import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ProposalFormComponent } from '../../components/proposal-form/proposal-form.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

import { Proposal } from '../../interfaces/proposal.interface';
import { Modality } from '../../enums/modality.enum';
import { stateList } from '../../../../core/enums/state.enum';

// ── Mocks Estrictos de Componentes Standalone Hijos ─────────────────────────

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

// ── Mocks Estrictos de Servicios ─────────────────────────────────────────────

interface MockRouter {
  navigate: jest.Mock;
}

interface MockActivatedRoute {
  snapshot: { paramMap: { get: jest.Mock } };
}

interface MockLocation {
  back: jest.Mock;
}

interface MockFacade {
  loadAndAuthorize: jest.Mock;
  validateRules: jest.Mock;
  saveUpdate: jest.Mock;
  showValidationError: jest.Mock;
}

// ── Funciones Fábrica fuertemente tipadas (Adiós "unknown") ──────────────────

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Título de Prueba',
  description: 'Descripción de Prueba',
  modality: Modality.TI,
  authors: [],
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  isActive: true,
  isArchived: false,
  ...overrides
} as Proposal);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ProposalEditPageComponent', () => {
  let component: ProposalEditPageComponent;
  let fixture: ComponentFixture<ProposalEditPageComponent>;

  let mockRouter: MockRouter;
  let mockRoute: MockActivatedRoute;
  let mockLocation: MockLocation;
  let mockFacade: MockFacade;

  const mockProposal = createMockProposal({ id: '1', title: 'Test' });

  beforeEach(async () => {
    // 🔕 Silenciamos la consola para mantener limpios los logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

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
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Location, useValue: mockLocation },
        { provide: ProposalEditFacadeService, useValue: mockFacade },
      ],
    })
    .overrideComponent(ProposalEditPageComponent, {
      remove: { imports: [ConfirmationActionModalComponent, ProposalFormComponent, InfoBannerComponent] },
      add: { imports: [MockConfirmationModalComponent, MockProposalFormComponent, MockInfoBannerComponent] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposalEditPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ngOnInit (Carga y Autorización)', () => {
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

    it('debe navegar a /proposal si la fachada rechaza por falta de permisos (onForbidden)', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('1');
      fixture.detectChanges();

      // Simulamos que la fachada invoca onForbidden (segundo callback)
      const onForbidden = mockFacade.loadAndAuthorize.mock.calls[0][2];
      onForbidden();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal']);
    });

    it('debe navegar a /proposal si la fachada no encuentra el documento (onNotFound)', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('1');
      fixture.detectChanges();

      // Simulamos que la fachada invoca onNotFound (tercer callback)
      const onNotFound = mockFacade.loadAndAuthorize.mock.calls[0][3];
      onNotFound();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal']);
    });
  });

  describe('Interacciones de UI', () => {
    it('debe llamar a location.back() al ejecutar goBack', () => {
      component.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });

    it('debe limpiar los datos pendientes y cerrar el modal al cancelar', () => {
      component.isModalOpen.set(true);
      component.pendingData.set(mockProposal);

      component.cancelUpdate();

      expect(component.isModalOpen()).toBeFalsy();
      expect(component.pendingData()).toBeNull();
    });
  });

  describe('handleUpdate (Validación)', () => {
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

  describe('confirmUpdate (Guardado)', () => {
    beforeEach(() => {
      component.proposalToEdit.set(mockProposal);
      component.pendingData.set(createMockProposal({ id: '1', title: 'Updated' }));
    });

    it('debe retornar temprano sin hacer nada si no hay propuesta original o datos pendientes', () => {
      component.proposalToEdit.set(null);
      component.confirmUpdate();

      expect(mockFacade.saveUpdate).not.toHaveBeenCalled();
    });

    it('debe llamar a saveUpdate de la fachada y navegar en éxito', () => {
      component.confirmUpdate();

      expect(component.isModalOpen()).toBeFalsy();

      // Simulamos callback de éxito de la fachada (tercer parámetro)
      const onSuccess = mockFacade.saveUpdate.mock.calls[0][2];
      onSuccess();

      expect(component.pendingData()).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal']);
    });

    it('solo debe cerrar el modal y no navegar si la fachada falla al guardar', () => {
      component.isModalOpen.set(true);

      component.confirmUpdate();

      // Simulamos callback de error de la fachada (cuarto parámetro)
      const onError = mockFacade.saveUpdate.mock.calls[0][3];
      onError();

      // pendingData NO debe borrarse para permitirle al usuario reintentar
      expect(component.pendingData()).toBeDefined();
      expect(component.isModalOpen()).toBeFalsy();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
