import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ThesisWorkDetailsPageComponent } from './thesis-work-details-page.component';
import { ThesisWorkDetailsFacadeService } from './services/thesis-work-details-facade.service';
import { ThesisWorkDetailsView } from './models/thesis-work-details-page.model';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

interface MockThesisWorkDetailsFacadeService {
  isLoading: WritableSignal<boolean>;
  details: WritableSignal<ThesisWorkDetailsView | null>;
  loadThesisWorkDetails: jest.Mock<void, [string]>;
  handleMissingId: jest.Mock<void, []>;
  goBack: jest.Mock<void, []>;
  downloadDocument: jest.Mock<Promise<void>, []>;
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

const createMockThesisWorkDetailsView = (overrides: Partial<ThesisWorkDetailsView> = {}): ThesisWorkDetailsView => ({
  id: 'tw-123',
  title: 'Título Base',
  description: 'Descripción Base',
  modality: 'Modalidad Base',
  state: 'ACTIVO',
  participants: {
    authors: 'Autor Base',
    director: 'Director Base',
  },
  mainDocument: null,
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
      remove: { imports: [ButtonComponent] },
      add: { imports: [MockButtonComponent] }
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

    it('debe mostrar el mensaje de carga cuando isLoading es verdadero', () => {
      facadeMock.isLoading.set(true);
      fixture.detectChanges();

      const loadingDiv = fixture.debugElement.query(By.css('.text-center'));
      expect(loadingDiv).toBeTruthy();
      expect(loadingDiv.nativeElement.textContent).toContain('Cargando información estructural');
    });

    it('debe renderizar la información estructural y participantes cuando existen detalles', () => {
      const mockDetails = createMockThesisWorkDetailsView({
        title: 'Tesis de Inteligencia Artificial',
        description: 'Análisis de datos',
        participants: {
          authors: 'Juan Pérez',
          director: 'Dr. Smith'
        }
      });

      facadeMock.details.set(mockDetails);
      fixture.detectChanges();

      const informationBlocks = fixture.debugElement.queryAll(By.css('.information-block p'));
      expect(informationBlocks[0].nativeElement.textContent.trim()).toBe('Tesis de Inteligencia Artificial');
      expect(informationBlocks[1].nativeElement.textContent.trim()).toBe('Análisis de datos');

      const participantsText = fixture.debugElement.query(By.css('.space-y-2')).nativeElement.textContent;
      expect(participantsText).toContain('Juan Pérez');
      expect(participantsText).toContain('Dr. Smith');
    });

    it('debe mostrar codirector y asesor únicamente si están presentes', () => {
      const mockDetails = createMockThesisWorkDetailsView({
        participants: {
          authors: 'Juan Pérez',
          director: 'Dr. Smith',
          codirector: 'Dra. López',
          advisor: 'Lic. Gómez'
        }
      });

      facadeMock.details.set(mockDetails);
      fixture.detectChanges();

      const participantsText = fixture.debugElement.query(By.css('.space-y-2')).nativeElement.textContent;
      expect(participantsText).toContain('Codirector:');
      expect(participantsText).toContain('Dra. López');
      expect(participantsText).toContain('Asesor:');
      expect(participantsText).toContain('Lic. Gómez');
    });

    it('debe llamar a facade.goBack() al hacer clic en el botón Regresar', () => {
      const backButton = fixture.debugElement.query(By.css('button'));
      backButton.triggerEventHandler('click', null);

      expect(facadeMock.goBack).toHaveBeenCalled();
    });

    it('debe emitir la navegación correcta al hacer clic en "Evaluaciones realizadas"', () => {
      facadeMock.details.set(createMockThesisWorkDetailsView());
      fixture.detectChanges();

      const evaluationButton = fixture.debugElement.query(
        By.css('app-button-component[label="Evaluaciones realizadas"]')
      );

      evaluationButton.triggerEventHandler('onClick', null);

      expect(routerMock.navigate).toHaveBeenCalledWith(
        ['evaluations_performed'],
        { relativeTo: routeMock }
      );
    });

    it('debe llamar a facade.downloadDocument() al hacer clic en Descargar', () => {
      facadeMock.details.set(createMockThesisWorkDetailsView({
        mainDocument: { name: 'archivo.pdf', url: 'http://test.com/archivo.pdf', description: 'Desc' }
      }));
      fixture.detectChanges();

      const downloadButton = fixture.debugElement.query(
        By.css('app-button-component[label="Descargar"]')
      );

      downloadButton.triggerEventHandler('onClick', null);

      expect(facadeMock.downloadDocument).toHaveBeenCalled();
    });
  });
});
