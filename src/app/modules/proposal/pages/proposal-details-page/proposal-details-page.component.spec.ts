import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProposalDetailsPageComponent } from './proposal-details-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ProposalDetailsFacadeService } from './services/proposal-details-facade.service';
import { Component, Input } from '@angular/core';
import { Proposal } from '../../interfaces/proposal.interface';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
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
    getAuthors: jest.Mock;
    getMemberName: jest.Mock;
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
      getAuthors: jest.fn(),
      getMemberName: jest.fn(),
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
