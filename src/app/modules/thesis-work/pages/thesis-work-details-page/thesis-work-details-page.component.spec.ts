// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';

// 2. Componente a probar
import { ThesisWorkDetailsPageComponent } from './thesis-work-details-page.component';

// 3. Servicios y Modelos
import { ThesisWorkDetailsFacadeService } from './services/thesis-work-details-facade.service';
import { ThesisWorkDetailsView } from './models/thesis-work-details-page.model';

// Importación Basekit para override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown' ni casteos dobles) ──

interface MockThesisWorkDetailsFacadeService {
  isLoading: WritableSignal<boolean>;
  details: WritableSignal<ThesisWorkDetailsView | null>;
  loadThesisWorkDetails: jest.Mock<void, [string]>;
  handleMissingId: jest.Mock<void, []>;
  goBack: jest.Mock<void, []>;
  downloadDocument: jest.Mock<Promise<void>, []>;
}

interface MockRouter {
  // Acepta la ruta y un objeto opcional de extras (ej: relativeTo)
  navigate: jest.Mock<Promise<boolean>, [any[], any?]>;
}

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

// ── Mocks de Componentes Standalone (Strict-Init) ─────────────────────────────

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Output() onClick = new EventEmitter<void>();
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockThesisWorkDetailsView = (overrides: Partial<ThesisWorkDetailsView> = {}): ThesisWorkDetailsView => ({
  id: 'tw-123',
  title: 'Título Base',
  description: 'Descripción Base',
  modality: 'Modalidad Base',
  state: 'ACTIVO',
  participants: {
    authors: 'Autor Base',
    director: 'Director Base',
    // codirector y advisor son opcionales en tu interfaz, los omitimos por defecto
  },
  mainDocument: null,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ThesisWorkDetailsPageComponent', () => {
  let component: ThesisWorkDetailsPageComponent;
  let fixture: ComponentFixture<ThesisWorkDetailsPageComponent>;

  // Tipado estricto para los espías
  let facadeMock: MockThesisWorkDetailsFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicializamos las señales reactivas para el mock
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

    // Estructura recursiva segura de rutas, emulando ActivatedRoute
    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('tw-123') } },
      parent: { snapshot: { paramMap: { get: jest.fn() } }, parent: null }
    };

    await TestBed.configureTestingModule({
      imports: [ThesisWorkDetailsPageComponent],
      providers: [
        // Proveemos directamente los objetos que satisfacen las interfaces, ¡sin usar "as unknown"!
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
    jest.clearAllMocks(); // Limpiamos cruces entre pruebas
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización (ngOnInit)', () => {
    it('debe crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debe cargar los detalles si se proporciona un ID en la ruta directa', () => {
      // Act
      fixture.detectChanges(); // Dispara ngOnInit

      // Assert
      expect(routeMock.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(facadeMock.loadThesisWorkDetails).toHaveBeenCalledWith('tw-123');
    });

    it('debe buscar el ID en el padre si no está en la ruta actual', () => {
      // Arrange
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue('parent-id-456');

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeMock.loadThesisWorkDetails).toHaveBeenCalledWith('parent-id-456');
    });

    it('debe manejar la ausencia de ID delegando al facade y abortando la carga', () => {
      // Arrange
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeMock.handleMissingId).toHaveBeenCalled();
      expect(facadeMock.loadThesisWorkDetails).not.toHaveBeenCalled();
    });
  });

  describe('Interacciones y renderizado del DOM (Template)', () => {
    beforeEach(() => {
      // Configuramos el componente inicial para estas pruebas (ngOnInit se ejecuta)
      fixture.detectChanges();
    });

    it('debe mostrar el mensaje de carga cuando isLoading es verdadero', () => {
      // Act
      facadeMock.isLoading.set(true);
      fixture.detectChanges();

      // Assert
      const loadingDiv = fixture.debugElement.query(By.css('.text-center'));
      expect(loadingDiv).toBeTruthy();
      expect(loadingDiv.nativeElement.textContent).toContain('Cargando información estructural');
    });

    it('debe renderizar la información estructural y participantes cuando existen detalles', () => {
      // Arrange usando la fábrica
      const mockDetails = createMockThesisWorkDetailsView({
        title: 'Tesis de Inteligencia Artificial',
        description: 'Análisis de datos',
        participants: {
          authors: 'Juan Pérez',
          director: 'Dr. Smith'
        }
      });

      // Act
      facadeMock.details.set(mockDetails);
      fixture.detectChanges();

      // Assert: Título general del trabajo (los labels son Título, Descripción, etc.)
      const informationBlocks = fixture.debugElement.queryAll(By.css('.information-block p'));
      expect(informationBlocks[0].nativeElement.textContent.trim()).toBe('Tesis de Inteligencia Artificial');
      expect(informationBlocks[1].nativeElement.textContent.trim()).toBe('Análisis de datos');

      // Assert: Participantes
      const participantsText = fixture.debugElement.query(By.css('.space-y-2')).nativeElement.textContent;
      expect(participantsText).toContain('Juan Pérez');
      expect(participantsText).toContain('Dr. Smith');
    });

    it('debe mostrar codirector y asesor únicamente si están presentes', () => {
      // Arrange usando la fábrica
      const mockDetails = createMockThesisWorkDetailsView({
        participants: {
          authors: 'Juan Pérez',
          director: 'Dr. Smith',
          codirector: 'Dra. López',
          advisor: 'Lic. Gómez'
        }
      });

      // Act
      facadeMock.details.set(mockDetails);
      fixture.detectChanges();

      // Assert
      const participantsText = fixture.debugElement.query(By.css('.space-y-2')).nativeElement.textContent;
      expect(participantsText).toContain('Codirector:');
      expect(participantsText).toContain('Dra. López');
      expect(participantsText).toContain('Asesor:');
      expect(participantsText).toContain('Lic. Gómez');
    });

    it('debe llamar a facade.goBack() al hacer clic en el botón Regresar', () => {
      // Act
      const backButton = fixture.debugElement.query(By.css('button'));
      backButton.triggerEventHandler('click', null);

      // Assert
      expect(facadeMock.goBack).toHaveBeenCalled();
    });

    it('debe emitir la navegación correcta al hacer clic en "Evaluaciones realizadas"', () => {
      // Arrange
      facadeMock.details.set(createMockThesisWorkDetailsView());
      fixture.detectChanges();

      const evaluationButton = fixture.debugElement.query(
        By.css('app-button-component[label="Evaluaciones realizadas"]')
      );

      // Act
      evaluationButton.triggerEventHandler('onClick', null);

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(
        ['evaluations_performed'],
        { relativeTo: routeMock } // Navegación relativa exacta
      );
    });

    it('debe llamar a facade.downloadDocument() al hacer clic en Descargar', () => {
      // Arrange
      facadeMock.details.set(createMockThesisWorkDetailsView({
        mainDocument: { name: 'archivo.pdf', url: 'http://test.com/archivo.pdf', description: 'Desc' }
      }));
      fixture.detectChanges();

      const downloadButton = fixture.debugElement.query(
        By.css('app-button-component[label="Descargar"]')
      );

      // Act
      downloadButton.triggerEventHandler('onClick', null);

      // Assert
      expect(facadeMock.downloadDocument).toHaveBeenCalled();
    });
  });
});
