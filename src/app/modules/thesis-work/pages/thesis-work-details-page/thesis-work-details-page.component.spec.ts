import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkDetailsPageComponent } from './thesis-work-details-page.component';
import { ThesisWorkDetailsFacadeService } from './services/thesis-work-details-facade.service';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';

// Definimos una interfaz local para el Mock, evitando usar 'any' en la señal de detalles.
interface MockThesisWorkDetails {
  title: string;
  description: string;
  modality: string;
  state: string;
  participants: {
    authors: string;
    director: string;
    codirector?: string | null;
    advisor?: string | null;
  };
  mainDocument?: {
    name: string;
    description: string;
  } | null;
}

describe('ThesisWorkDetailsPageComponent', () => {
  let component: ThesisWorkDetailsPageComponent;
  let fixture: ComponentFixture<ThesisWorkDetailsPageComponent>;

  // Tipado estricto para los espías, exponiendo las señales como WritableSignals para mutarlas en las pruebas
  let facadeSpy: {
    isLoading: WritableSignal<boolean>;
    details: WritableSignal<MockThesisWorkDetails | null>;
    loadThesisWorkDetails: jest.Mock;
    handleMissingId: jest.Mock;
    goBack: jest.Mock;
    downloadDocument: jest.Mock;
  };

  let routerSpy: { navigate: jest.Mock };

  let routeSpy: {
    snapshot: { paramMap: { get: jest.Mock } };
    parent: { snapshot: { paramMap: { get: jest.Mock } } };
  };

  // Base mock para evitar errores de "undefined" en el HTML al evaluar propiedades anidadas
  const defaultMockDetails: MockThesisWorkDetails = {
    title: 'Título Base',
    description: 'Descripción Base',
    modality: 'Modalidad Base',
    state: 'ACTIVO',
    participants: {
      authors: 'Autor Base',
      director: 'Director Base'
    }
  };

  beforeEach(async () => {
    // Inicializamos las señales reactivas para el mock
    facadeSpy = {
      isLoading: signal(false),
      details: signal<MockThesisWorkDetails | null>(null),
      loadThesisWorkDetails: jest.fn(),
      handleMissingId: jest.fn(),
      goBack: jest.fn(),
      downloadDocument: jest.fn()
    };

    routerSpy = { navigate: jest.fn() };

    routeSpy = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('tw-123') } },
      parent: { snapshot: { paramMap: { get: jest.fn() } } }
    };

    await TestBed.configureTestingModule({
      imports: [ThesisWorkDetailsPageComponent],
      providers: [
        { provide: ThesisWorkDetailsFacadeService, useValue: facadeSpy as unknown as ThesisWorkDetailsFacadeService },
        { provide: Router, useValue: routerSpy as unknown as Router },
        { provide: ActivatedRoute, useValue: routeSpy as unknown as ActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ThesisWorkDetailsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización (ngOnInit)', () => {
    it('debe crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debe cargar los detalles si se proporciona un ID en la ruta directa', () => {
      fixture.detectChanges(); // Dispara ngOnInit

      expect(routeSpy.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(facadeSpy.loadThesisWorkDetails).toHaveBeenCalledWith('tw-123');
    });

    it('debe buscar el ID en el padre si no está en la ruta actual', () => {
      routeSpy.snapshot.paramMap.get.mockReturnValue(null);
      routeSpy.parent.snapshot.paramMap.get.mockReturnValue('parent-id-456');

      fixture.detectChanges();

      expect(facadeSpy.loadThesisWorkDetails).toHaveBeenCalledWith('parent-id-456');
    });

    it('debe manejar la ausencia de ID delegando al facade y abortando la carga', () => {
      routeSpy.snapshot.paramMap.get.mockReturnValue(null);
      routeSpy.parent.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(facadeSpy.handleMissingId).toHaveBeenCalled();
      expect(facadeSpy.loadThesisWorkDetails).not.toHaveBeenCalled();
    });
  });

  describe('Interacciones y renderizado del DOM (Template)', () => {
    beforeEach(() => {
      // Configuramos el componente inicial para estas pruebas
      fixture.detectChanges();
    });

    it('debe mostrar el mensaje de carga cuando isLoading es verdadero', () => {
      // Act
      facadeSpy.isLoading.set(true);
      fixture.detectChanges();

      // Assert
      const loadingDiv = fixture.debugElement.query(By.css('.text-center'));
      expect(loadingDiv).toBeTruthy();
      expect(loadingDiv.nativeElement.textContent).toContain('Cargando información estructural');
    });

    it('debe renderizar la información estructural y participantes cuando existen detalles', () => {
      // Arrange
      const mockDetails: MockThesisWorkDetails = {
        ...defaultMockDetails,
        title: 'Tesis de Inteligencia Artificial',
        description: 'Análisis de datos',
        participants: {
          authors: 'Juan Pérez',
          director: 'Dr. Smith'
        }
      };

      // Act
      facadeSpy.details.set(mockDetails);
      fixture.detectChanges();

      // Assert: Título general del trabajo
      const informationBlocks = fixture.debugElement.queryAll(By.css('.information-block p'));
      expect(informationBlocks[0].nativeElement.textContent.trim()).toBe('Tesis de Inteligencia Artificial');
      expect(informationBlocks[1].nativeElement.textContent.trim()).toBe('Análisis de datos');

      // Assert: Participantes
      const participantsText = fixture.debugElement.query(By.css('.space-y-2')).nativeElement.textContent;
      expect(participantsText).toContain('Juan Pérez');
      expect(participantsText).toContain('Dr. Smith');
    });

    it('debe llamar a facade.goBack() al hacer clic en el botón Regresar', () => {
      // Act
      const backButton = fixture.debugElement.query(By.css('button'));
      backButton.triggerEventHandler('click', null);

      // Assert
      expect(facadeSpy.goBack).toHaveBeenCalled();
    });

    it('debe emitir la navegación correcta al hacer clic en "Evaluaciones realizadas"', () => {
      // Arrange: Proveemos el objeto base completo para que el HTML no se rompa al renderizar
      facadeSpy.details.set({ ...defaultMockDetails });
      fixture.detectChanges();

      const evaluationButton = fixture.debugElement.query(
        By.css('app-button-component[label="Evaluaciones realizadas"]')
      );

      // Act
      evaluationButton.triggerEventHandler('onClick', null);

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['evaluations_performed'],
        { relativeTo: routeSpy }
      );
    });

    it('debe llamar a facade.downloadDocument() al hacer clic en Descargar', () => {
      // Arrange: Proveemos el objeto base completo sumando el mainDocument
      facadeSpy.details.set({
        ...defaultMockDetails,
        mainDocument: { name: 'archivo.pdf', description: 'Desc' }
      });
      fixture.detectChanges();

      const downloadButton = fixture.debugElement.query(
        By.css('app-button-component[label="Descargar"]')
      );

      // Act
      downloadButton.triggerEventHandler('onClick', null);

      // Assert
      expect(facadeSpy.downloadDocument).toHaveBeenCalled();
    });
  });
});
