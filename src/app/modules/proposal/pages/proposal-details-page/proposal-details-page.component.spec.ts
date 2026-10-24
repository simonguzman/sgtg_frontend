import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProposalDetailsPageComponent } from './proposal-details-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ProposalDetailsFacadeService } from './services/proposal-details-facade.service';
import { Component, Input } from '@angular/core';
import { Proposal } from '../../interfaces/proposal.interface';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { WorkDetailsView } from '../../../../shared/components/work-details/work-details.model';
@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label!: string;
  @Input() variant!: string;
}
describe('ProposalDetailsPageComponent', () => {
  let component: ProposalDetailsPageComponent;
  let fixture: ComponentFixture<ProposalDetailsPageComponent>;
  let mockRouter: { navigate: jest.Mock };
  let mockRoute: { snapshot: { paramMap: { get: jest.Mock } }, parent: { snapshot: { paramMap: { get: jest.Mock } } } };
  let mockFacade: {
    handleMissingId: jest.Mock;
    goBack: jest.Mock;
    load: jest.Mock;
    buildView: jest.Mock;
    downloadDocument: jest.Mock;
  };
  const mockView: WorkDetailsView = {
    heading: 'Información de la propuesta', title: 'Test Proposal', specificObjectives: [], modality: 'Trabajo de investigación',
    state: 'En revisión', participants: [], dates: [], documents: []
  };
  const mockProposal = { id: '123', title: 'Test Proposal', authors: [] } as unknown as Proposal;
  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRouter = {
      navigate: jest.fn(),
    };
    mockRoute = {
      snapshot: { paramMap: { get: jest.fn() } },
      parent: { snapshot: { paramMap: { get: jest.fn() } } }
    };
    mockFacade = {
      handleMissingId: jest.fn(),
      goBack: jest.fn(),
      load: jest.fn(),
      buildView: jest.fn().mockReturnValue(mockView),
      downloadDocument: jest.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [ProposalDetailsPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter as unknown as Router },
        { provide: ActivatedRoute, useValue: mockRoute as unknown as ActivatedRoute },
        { provide: ProposalDetailsFacadeService, useValue: mockFacade as unknown as ProposalDetailsFacadeService },
      ],
    })
    .overrideComponent(ProposalDetailsPageComponent, {
      remove: { imports: [ButtonComponent] },
      add: { imports: [MockButtonComponent] },
    })
    .compileComponents();
    fixture = TestBed.createComponent(ProposalDetailsPageComponent);
    component = fixture.componentInstance;
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });
  describe('ngOnInit (Control de Rutas)', () => {
    it('debe llamar a handleMissingId si no se encuentra un ID en la ruta (ni principal ni padre)', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue(null);
      mockRoute.parent.snapshot.paramMap.get.mockReturnValue(null);
      fixture.detectChanges();
      expect(mockFacade.handleMissingId).toHaveBeenCalled();
      const callback = mockFacade.handleMissingId.mock.calls[0][0];
      callback();
      expect(mockFacade.goBack).toHaveBeenCalled();
    });
    it('debe obtener el ID del padre si no está en la ruta principal y llamar a load()', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue(null);
      mockRoute.parent.snapshot.paramMap.get.mockReturnValue('123');
      fixture.detectChanges();
      expect(mockFacade.load).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });
    it('debe actualizar el signal proposal si load es exitoso (onSuccess)', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('123');
      fixture.detectChanges();
      const onSuccessCallback = mockFacade.load.mock.calls[0][1];
      onSuccessCallback(mockProposal);
      expect(component.proposal()).toEqual(mockProposal);
    });
    it('muestra el detalle que arma el facade con la propuesta cargada', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('123');
      fixture.detectChanges();
      mockFacade.load.mock.calls[0][1](mockProposal);
      fixture.detectChanges();
      expect(mockFacade.buildView).toHaveBeenCalledWith(mockProposal);
      const detalle = fixture.debugElement.query(element => element.name === 'app-work-details');
      expect(detalle.componentInstance.view).toBe(mockView);
    });
    it('debe llamar a facade.goBack() si load retorna NotFound o Error', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('123');
      fixture.detectChanges();
      const onNotFoundCallback = mockFacade.load.mock.calls[0][2];
      const onErrorCallback = mockFacade.load.mock.calls[0][3];
      onNotFoundCallback();
      expect(mockFacade.goBack).toHaveBeenCalledTimes(1);
      onErrorCallback();
      expect(mockFacade.goBack).toHaveBeenCalledTimes(2);
    });
  });
  describe('Navegación Relativa', () => {
    it('navigateToEvaluations debe navegar relativo a la ruta actual', () => {
      component.navigateToEvaluations();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['evaluations_performed'],
        { relativeTo: mockRoute as unknown as ActivatedRoute }
      );
    });
    it('navigateToLoadedProposals debe navegar relativo a la ruta actual', () => {
      component.navigateToLoadedProposals();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['loaded_proposals'],
        { relativeTo: mockRoute as unknown as ActivatedRoute }
      );
    });
  });
});
