import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';

import { EvaluationProposalPageComponent } from './evaluation-proposal-page.component';
import { EvaluationProposalFacadeService } from './services/evaluation-proposal-facade.service';
import { Proposal } from '../../interfaces/proposal.interface';

// Importamos el componente real para poder removerlo en la configuración del TestBed
import { EvaluationProposalFormComponent } from '../../components/evaluation-proposal-form/evaluation-proposal-form.component';

// ============================================================================
// MOCK DEL COMPONENTE HIJO
// ============================================================================
@Component({
  selector: 'app-evaluation-proposal-form',
  standalone: true,
  template: '<div>Mock Form Component</div>'
})
class MockEvaluationProposalFormComponent {
  @Input() proposal!: Proposal;
  @Output() onDownloadOriginal = new EventEmitter<void>();
  // Tipado estricto en lugar de EventEmitter<any>
  @Output() onSaveEvaluation = new EventEmitter<{ result: string; comments: string; signedFileName: string }>();
  @Output() onGoBack = new EventEmitter<void>();
}

describe('EvaluationProposalPageComponent', () => {
  let component: EvaluationProposalPageComponent;
  let fixture: ComponentFixture<EvaluationProposalPageComponent>;

  let mockFacade: jest.Mocked<EvaluationProposalFacadeService>;
  let mockLocation: jest.Mocked<Location>;

  // Tipado estricto para el mock de la ruta
  let mockActivatedRoute: jest.Mocked<ActivatedRoute>;

  const mockProposal: Proposal = { id: 'prop-1', title: 'Propuesta 1' } as Proposal;

  beforeEach(async () => {
    mockFacade = {
      load: jest.fn(),
      downloadOriginalDocument: jest.fn(),
      saveEvaluation: jest.fn()
    } as unknown as jest.Mocked<EvaluationProposalFacadeService>;

    mockLocation = {
      back: jest.fn()
    } as unknown as jest.Mocked<Location>;

    // Configuración del mock de la ruta sin usar 'any'
    mockActivatedRoute = {
      snapshot: { paramMap: { get: jest.fn() } },
      parent: { snapshot: { paramMap: { get: jest.fn() } } }
    } as unknown as jest.Mocked<ActivatedRoute>;

    await TestBed.configureTestingModule({
      imports: [EvaluationProposalPageComponent],
      providers: [
        { provide: EvaluationProposalFacadeService, useValue: mockFacade },
        { provide: Location, useValue: mockLocation },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .overrideComponent(EvaluationProposalPageComponent, {
      // AQUÍ ESTÁ LA SOLUCIÓN: Removemos explícitamente el componente real
      remove: { imports: [EvaluationProposalFormComponent] },
      add: { imports: [MockEvaluationProposalFormComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationProposalPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ngOnInit (Resolución de ID y Carga)', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería regresar (goBack) si no encuentra ID en la ruta ni en el padre', () => {
      (mockActivatedRoute.snapshot.paramMap.get as jest.Mock).mockReturnValue(null);
      (mockActivatedRoute.parent!.snapshot.paramMap.get as jest.Mock).mockReturnValue(null);

      fixture.detectChanges();

      expect(mockLocation.back).toHaveBeenCalled();
      expect(mockFacade.load).not.toHaveBeenCalled();
    });

    it('debería tomar el ID de la ruta principal y llamar a facade.load', () => {
      (mockActivatedRoute.snapshot.paramMap.get as jest.Mock).mockReturnValue('123');

      fixture.detectChanges();

      expect(mockFacade.load).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería tomar el ID del parent si no está en la ruta principal', () => {
      (mockActivatedRoute.snapshot.paramMap.get as jest.Mock).mockReturnValue(null);
      (mockActivatedRoute.parent!.snapshot.paramMap.get as jest.Mock).mockReturnValue('456');

      fixture.detectChanges();

      expect(mockFacade.load).toHaveBeenCalledWith('456', expect.any(Function), expect.any(Function));
    });

    it('debería asignar la propuesta al Signal si la carga es exitosa', () => {
      (mockActivatedRoute.snapshot.paramMap.get as jest.Mock).mockReturnValue('123');

      mockFacade.load.mockImplementation((id, onSuccess, onNotFound) => {
        onSuccess(mockProposal);
      });

      fixture.detectChanges();

      expect(component.proposal()).toEqual(mockProposal);
    });

    it('debería regresar (goBack) si falla la carga (onNotFound)', () => {
      (mockActivatedRoute.snapshot.paramMap.get as jest.Mock).mockReturnValue('123');

      mockFacade.load.mockImplementation((id, onSuccess, onNotFound) => {
        onNotFound();
      });

      fixture.detectChanges();

      expect(mockLocation.back).toHaveBeenCalled();
      expect(component.proposal()).toBeNull();
    });
  });

  describe('Interacciones y Llamadas al Facade', () => {
    beforeEach(() => {
      component.proposal.set(mockProposal);
    });

    it('debería llamar a goBack correctamente', () => {
      component.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });

    it('downloadOriginalDocument: debería delegar al facade si hay propuesta', () => {
      component.downloadOriginalDocument();
      expect(mockFacade.downloadOriginalDocument).toHaveBeenCalledWith(mockProposal);
    });

    it('downloadOriginalDocument: NO debería hacer nada si no hay propuesta (null)', () => {
      component.proposal.set(null);
      component.downloadOriginalDocument();
      expect(mockFacade.downloadOriginalDocument).not.toHaveBeenCalled();
    });

    it('handleSaveEvaluation: debería delegar al facade si hay propuesta', () => {
      const mockEvent = { result: 'Aprobado', comments: 'Ok', signedFileName: 'firma.pdf' };

      component.handleSaveEvaluation(mockEvent);

      expect(mockFacade.saveEvaluation).toHaveBeenCalledWith(
        mockEvent,
        mockProposal,
        mockActivatedRoute,
        expect.any(Function)
      );
    });

    it('handleSaveEvaluation: NO debería hacer nada si no hay propuesta', () => {
      component.proposal.set(null);
      component.handleSaveEvaluation({ result: '', comments: '', signedFileName: '' });
      expect(mockFacade.saveEvaluation).not.toHaveBeenCalled();
    });
  });

  describe('Renderizado del Template', () => {
    it('debería mostrar mensaje de carga mientras proposal sea nulo', () => {
      component.proposal.set(null);
      fixture.detectChanges();

      const loadingDiv = fixture.debugElement.query(By.css('.text-center.text-\\[\\#777680\\]'));
      expect(loadingDiv).toBeTruthy();
      expect(loadingDiv.nativeElement.textContent).toContain('Cargando información de la propuesta...');
    });

    it('debería mostrar el formulario hijo si la propuesta está cargada', () => {
      component.proposal.set(mockProposal);
      fixture.detectChanges();

      const formComponent = fixture.debugElement.query(By.directive(MockEvaluationProposalFormComponent));
      const loadingDiv = fixture.debugElement.query(By.css('.text-center'));

      expect(formComponent).toBeTruthy();
      expect(loadingDiv).toBeNull();

      expect(formComponent.componentInstance.proposal).toEqual(mockProposal);
    });
  });
});
