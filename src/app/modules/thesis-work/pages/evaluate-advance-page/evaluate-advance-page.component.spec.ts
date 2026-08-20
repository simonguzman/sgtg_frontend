import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';

// Componente
import { EvaluateAdvancePageComponent } from './evaluate-advance-page.component';

// Servicios y Facades
import { EvaluateAdvanceFacadeService } from './services/evaluate-advance-facade.service';
import { AuthService } from '../../../../core/services/auth/auth.service';

// Interfaces
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { User } from '../../../users/interfaces/user.interface';
import { SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';

describe('EvaluateAdvancePageComponent', () => {
  let component: EvaluateAdvancePageComponent;
  let fixture: ComponentFixture<EvaluateAdvancePageComponent>;

  // Espías fuertemente tipados
  let routerSpy: jest.Mocked<Router>;
  let facadeSpy: jest.Mocked<EvaluateAdvanceFacadeService>;

  // Variables de configuración de rutas
  let routeParamMapGetSpy: jest.Mock;
  let parentParamMapGetSpy: jest.Mock;
  let mockActivatedRoute: ActivatedRoute;

  // Signal simulado para el usuario actual
  const mockUserSignal = signal<User | null>({ id: 'u-1', firstName: 'Juan' } as unknown as User);

  beforeEach(async () => {
    // Arrange: Configuración de los parámetros de ruta sin 'any'
    routeParamMapGetSpy = jest.fn().mockImplementation((param: string) => param === 'advanceId' ? 'adv-1' : null);
    parentParamMapGetSpy = jest.fn().mockImplementation((param: string) => param === 'id' ? 'thesis-1' : null);

    mockActivatedRoute = {
      snapshot: { paramMap: { get: routeParamMapGetSpy } },
      parent: {
        snapshot: { paramMap: { get: parentParamMapGetSpy } },
        parent: null
      }
    } as unknown as ActivatedRoute;

    routerSpy = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    // Mock del facade asegurando que los métodos que refactorizamos a asíncronos retornen Promesas
    facadeSpy = {
      loadThesisWork: jest.fn(),
      saveEvaluation: jest.fn().mockResolvedValue(undefined), // Mockeamos la promesa resuelta
      downloadAdvance: jest.fn().mockResolvedValue(undefined), // Mockeamos la promesa resuelta
      showNavigationError: jest.fn()
    } as unknown as jest.Mocked<EvaluateAdvanceFacadeService>;

    const authSpy = { currentUser: mockUserSignal } as unknown as jest.Mocked<AuthService>;

    await TestBed.configureTestingModule({
      imports: [EvaluateAdvancePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: routerSpy },
        { provide: EvaluateAdvanceFacadeService, useValue: facadeSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluateAdvancePageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Rutas (ngOnInit)', () => {
    it('debe procesar exitosamente la jerarquía de rutas e invocar la carga de la tesis', () => {
      // Act
      fixture.detectChanges(); // Dispara ngOnInit

      // Assert
      expect(component.advanceId()).toBe('adv-1');
      expect(facadeSpy.loadThesisWork).toHaveBeenCalledWith(
        'thesis-1',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debe actualizar el thesisWorkState si la carga de la tesis (loadThesisWork) es exitosa', () => {
      // Arrange
      const mockThesis = { thesisWorkId: 't-1', advances: [] } as unknown as ThesisWork;
      facadeSpy.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesis));

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.thesisWorkState()).toEqual(mockThesis);
    });

    it('debe mostrar error de navegación y detenerse si falta el ID de la tesis en la ruta', () => {
      // Arrange: Simulamos que no se encuentra el 'id' en el padre
      parentParamMapGetSpy.mockReturnValue(null);

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeSpy.showNavigationError).toHaveBeenCalled();
      expect(facadeSpy.loadThesisWork).not.toHaveBeenCalled();
    });
  });

  describe('Propiedad Calculada (Computed): currentAdvance', () => {
    it('debe devolver null si el thesisWork o advanceId no han cargado aún', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(component.currentAdvance()).toBeNull();
    });

    it('debe devolver el avance correspondiente al advanceId extraído de la URL', () => {
      // Arrange
      const mockAdvance = { id: 'adv-1', title: 'Avance Real' } as unknown as Advance;
      component.advanceId.set('adv-1');
      component.thesisWorkState.set({ advances: [mockAdvance] } as unknown as ThesisWork);

      // Assert
      expect(component.currentAdvance()).toEqual(mockAdvance);
    });
  });

  describe('Interacciones y Manejo de Modal', () => {
    it('handleRequestConfirmation debe settear la data pendiente y abrir el modal', () => {
      // Arrange
      const payload = { formValues: { comments: 'Excelente avance' } } as unknown as SubmitAdvanceEvaluationPayload;

      // Act
      component.handleRequestConfirmation(payload);

      // Assert
      expect(component.pendingReviewData()).toEqual(payload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('downloadCurrentAdvance debe invocar al facade (método asíncrono) con el avance actual', () => {
      // Arrange
      const mockAdvance = { id: 'adv-1' } as unknown as Advance;
      component.advanceId.set('adv-1');
      component.thesisWorkState.set({ advances: [mockAdvance] } as unknown as ThesisWork);

      // Act
      component.downloadCurrentAdvance();

      // Assert
      expect(facadeSpy.downloadAdvance).toHaveBeenCalledWith(mockAdvance);
    });

    it('navigateBack debe usar el router para retroceder usando el padre actual de la ruta', () => {
      // Act
      component.navigateBack();

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: mockActivatedRoute.parent! });
    });
  });

  describe('Flujo de Guardado (processAdvanceEvaluation)', () => {
    beforeEach(() => {
      // Arrange: Estado ideal previo al guardado
      component.advanceId.set('adv-1');
      component.thesisWorkState.set({ advances: [{ id: 'adv-1' }] } as unknown as ThesisWork);
      component.pendingReviewData.set({} as unknown as SubmitAdvanceEvaluationPayload);
      component.isConfirmModalOpen.set(true);
    });

    it('debe abortar la operación silenciosamente si falta algún dato en el estado (ej: pendingReviewData null)', () => {
      // Arrange
      component.pendingReviewData.set(null);

      // Act
      component.processAdvanceEvaluation();

      // Assert
      expect(facadeSpy.saveEvaluation).not.toHaveBeenCalled();
    });

    it('debe invocar a saveEvaluation del facade inyectando todas las dependencias necesarias', () => {
      // Act
      component.processAdvanceEvaluation();

      // Assert
      expect(facadeSpy.saveEvaluation).toHaveBeenCalledWith(
        expect.any(Object), // thesis
        expect.any(Object), // advance
        expect.any(Object), // user
        expect.any(Object), // data
        expect.any(Function), // onSuccess callback
        expect.any(Function)  // onError callback
      );
    });

    it('al ejecutar el callback de éxito de saveEvaluation, debe cerrar el modal y navegar hacia atrás', async () => {
      // Arrange: Simulamos la implementación del método asíncrono ejecutando inmediatamente el callback onSuccess
      facadeSpy.saveEvaluation.mockImplementation(async (t, a, u, d, onSuccess) => {
        onSuccess();
        return Promise.resolve();
      });

      // Act
      component.processAdvanceEvaluation();

      // Assert
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: mockActivatedRoute.parent! });
    });
  });
});
