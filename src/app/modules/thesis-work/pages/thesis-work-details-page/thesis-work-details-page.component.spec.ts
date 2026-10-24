import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ThesisWorkDetailsPageComponent } from './thesis-work-details-page.component';
import { ThesisWorkDetailsFacadeService } from './services/thesis-work-details-facade.service';
import { ThesisWorkDetailsView } from './models/thesis-work-details-page.model';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { WorkDetailsComponent } from '../../../../shared/components/work-details/work-details.component';
import { WorkDetailsDocument, WorkDetailsView } from '../../../../shared/components/work-details/work-details.model';

interface MockThesisWorkDetailsFacadeService {
  isLoading: WritableSignal<boolean>;
  details: WritableSignal<ThesisWorkDetailsView | null>;
  loadThesisWorkDetails: jest.Mock<void, [string]>;
  handleMissingId: jest.Mock<void, []>;
  goBack: jest.Mock<void, []>;
  downloadDocument: jest.Mock<Promise<void>, [WorkDetailsDocument]>;
}

interface MockRouter {
  navigate: jest.Mock<Promise<boolean>, [any[], any?]>;
}

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-work-details', standalone: true, template: '' })
class MockWorkDetailsComponent {
  @Input() view!: WorkDetailsView;
  @Output() download = new EventEmitter<WorkDetailsDocument>();
}

const createMockThesisWorkDetailsView = (overrides: Partial<ThesisWorkDetailsView> = {}): ThesisWorkDetailsView => ({
  heading: 'Información del trabajo de grado',
  title: 'Título Base',
  specificObjectives: [],
  modality: 'Modalidad Base',
  state: 'En desarrollo',
  participants: [{ label: 'Estudiante', value: 'Autor Base' }],
  dates: [],
  documents: [],
  ...overrides
});

describe('ThesisWorkDetailsPageComponent', () => {
  let component: ThesisWorkDetailsPageComponent;
  let fixture: ComponentFixture<ThesisWorkDetailsPageComponent>;

  let facadeMock: MockThesisWorkDetailsFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    facadeMock = {
      isLoading: signal(false),
      details: signal<ThesisWorkDetailsView | null>(null),
      loadThesisWorkDetails: jest.fn(),
      handleMissingId: jest.fn(),
      goBack: jest.fn(),
      downloadDocument: jest.fn().mockResolvedValue(undefined)
    };

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('tw-123') } },
      parent: { snapshot: { paramMap: { get: jest.fn() } }, parent: null }
    };

    await TestBed.configureTestingModule({
      imports: [ThesisWorkDetailsPageComponent],
      providers: [
        { provide: ThesisWorkDetailsFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(ThesisWorkDetailsPageComponent, {
      remove: { imports: [ButtonComponent, WorkDetailsComponent] },
      add: { imports: [MockButtonComponent, MockWorkDetailsComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThesisWorkDetailsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización (ngOnInit)', () => {
    it('debe crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debe cargar los detalles si se proporciona un ID en la ruta directa', () => {
      fixture.detectChanges();

      expect(routeMock.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(facadeMock.loadThesisWorkDetails).toHaveBeenCalledWith('tw-123');
    });

    it('debe buscar el ID en el padre si no está en la ruta actual', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue('parent-id-456');

      fixture.detectChanges();

      expect(facadeMock.loadThesisWorkDetails).toHaveBeenCalledWith('parent-id-456');
    });

    it('debe manejar la ausencia de ID delegando al facade y abortando la carga', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(facadeMock.handleMissingId).toHaveBeenCalled();
      expect(facadeMock.loadThesisWorkDetails).not.toHaveBeenCalled();
    });
  });

  describe('Interacciones y renderizado del DOM (Template)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    const detalle = () => fixture.debugElement.query(By.directive(MockWorkDetailsComponent));

    it('debe mostrar el mensaje de carga cuando isLoading es verdadero', () => {
      facadeMock.isLoading.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Cargando información estructural del trabajo de grado...');
      expect(detalle()).toBeNull();
    });

    it('debe mostrar el detalle con la vista del facade', () => {
      const view = createMockThesisWorkDetailsView();
      facadeMock.details.set(view);
      fixture.detectChanges();
      expect(detalle().componentInstance.view).toBe(view);
    });

    it('debe llamar a facade.goBack() al hacer clic en el botón Regresar', () => {
      fixture.debugElement.query(By.css('button.group')).nativeElement.click();
      expect(facadeMock.goBack).toHaveBeenCalled();
    });

    it('debe emitir la navegación correcta al hacer clic en "Evaluaciones realizadas"', () => {
      facadeMock.details.set(createMockThesisWorkDetailsView());
      fixture.detectChanges();
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      buttons[0].componentInstance.onClick.emit();
      buttons[1].componentInstance.onClick.emit();
      expect(routerMock.navigate).toHaveBeenCalledWith(['evaluations_performed'], { relativeTo: routeMock });
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock });
    });

    it('debe delegar en el facade la descarga del documento elegido', () => {
      facadeMock.details.set(createMockThesisWorkDetailsView());
      fixture.detectChanges();
      const documento = { name: 'Resolución del Consejo', description: '', url: '/r' };
      detalle().componentInstance.download.emit(documento);
      expect(facadeMock.downloadDocument).toHaveBeenCalledWith(documento);
    });
  });
});
