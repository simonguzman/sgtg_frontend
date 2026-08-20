// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';

// 2. Componentes a probar
import { UploadAdvancePageComponent } from './upload-advance-page.component';

// 3. Servicios y Facades
import { UploadAdvancePageFacadeService } from './services/upload-advance-page-facade.service';
import { AuthService } from '../../../../core/services/auth/auth.service';

// 4. Interfaces y Modelos
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { UploadAdvancePayload } from '../../interfaces/advance-playload.interface';
import { User } from '../../../users/interfaces/user.interface';

describe('UploadAdvancePageComponent', () => {
  let component: UploadAdvancePageComponent;
  let fixture: ComponentFixture<UploadAdvancePageComponent>;

  // Espías
  let routerSpy: jest.Mocked<Router>;
  let facadeSpy: jest.Mocked<UploadAdvancePageFacadeService>;
  let authSpy: jest.Mocked<AuthService>;

  // Mocks de utilidades
  let parentParamMapGetSpy: jest.Mock;
  let mockActivatedRoute: unknown;
  const mockUserSignal = signal<User | null>({ id: 'user-123' } as unknown as User);

  beforeEach(async () => {
    // Inicializamos el espía de la ruta para simular la búsqueda del ID
    parentParamMapGetSpy = jest.fn().mockReturnValue('thesis-123');

    mockActivatedRoute = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: parentParamMapGetSpy } },
        parent: null
      }
    };

    routerSpy = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    facadeSpy = {
      loadThesisWork: jest.fn(),
      processAdvance: jest.fn(),
      showNavigationError: jest.fn()
    } as unknown as jest.Mocked<UploadAdvancePageFacadeService>;

    authSpy = {
      currentUser: mockUserSignal
    } as unknown as jest.Mocked<AuthService>;

    await TestBed.configureTestingModule({
      imports: [UploadAdvancePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute as ActivatedRoute },
        { provide: Router, useValue: routerSpy },
        { provide: UploadAdvancePageFacadeService, useValue: facadeSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UploadAdvancePageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización (ngOnInit)', () => {
    it('debe buscar el id en la jerarquía de rutas y llamar al facade para cargar el trabajo', () => {
      // Act
      fixture.detectChanges(); // Dispara ngOnInit

      // Assert
      expect(facadeSpy.loadThesisWork).toHaveBeenCalledWith(
        'thesis-123',
        expect.any(Function), // Success callback
        expect.any(Function)  // Error callback
      );
    });

    it('debe mostrar error y regresar si no se encuentra ningún ID en la jerarquía', () => {
      // Arrange: Simulamos que no se encontró ningún parámetro 'id'
      parentParamMapGetSpy.mockReturnValue(null);

      // Act
      fixture.detectChanges();

      // Assert
      expect(facadeSpy.showNavigationError).toHaveBeenCalled();

      const activatedRouteDef = mockActivatedRoute as ActivatedRoute;
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['loaded_documents'],
        { relativeTo: activatedRouteDef.parent }
      );
    });

    it('debe setear thesisWorkState al ejecutarse el callback de éxito', () => {
      // Arrange
      const mockThesis = {
        thesisWorkId: 'test-id',
        preliminaryDraftData: { proposalData: { title: 'Mock Title' } }
      } as unknown as ThesisWork;

      facadeSpy.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesis));

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.thesisWorkState()).toEqual(mockThesis);
    });
  });

  describe('Interacciones con la Interfaz', () => {
    it('handleSaveRequest debe guardar el payload pendiente y abrir el modal de confirmación', () => {
      // Arrange
      const mockPayload = { formValues: { title: 'T' } } as unknown as UploadAdvancePayload;

      // Act
      component.handleSaveRequest(mockPayload);

      // Assert
      expect(component.pendingAdvanceData()).toEqual(mockPayload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('navigateBack debe usar el router para volver a loaded_documents', () => {
      // Act
      component.navigateBack();

      // Assert
      const activatedRouteDef = mockActivatedRoute as ActivatedRoute;
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['loaded_documents'],
        { relativeTo: activatedRouteDef.parent }
      );
    });
  });

  describe('Procesamiento Final (processAdvance)', () => {
    beforeEach(() => {
      // Pre-configuramos un estado inicial válido para ejecutar processAdvance
      component.thesisWorkState.set({ thesisWorkId: 't-1' } as unknown as ThesisWork);
      component.pendingAdvanceData.set({ formValues: { title: 'Advance' } } as unknown as UploadAdvancePayload);
      component.isConfirmModalOpen.set(true);
    });

    it('debe abortar la ejecución si falta el payload, el trabajo de grado o el usuario', () => {
      // Arrange
      component.pendingAdvanceData.set(null);

      // Act
      component.processAdvance();

      // Assert
      expect(facadeSpy.processAdvance).not.toHaveBeenCalled();
    });

    it('debe activar el estado isSaving y llamar al facade con los parámetros correctos', () => {
      // Act
      component.processAdvance();

      // Assert
      expect(component.isSaving()).toBe(true);
      expect(facadeSpy.processAdvance).toHaveBeenCalledWith(
        't-1',
        'user-123',
        expect.any(Object),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debe limpiar estados y redirigir cuando el guardado es exitoso', () => {
      // Arrange: Usamos '_' para omitir la advertencia de variables no usadas
      // y retornamos Promise.resolve() para cumplir con la firma asíncrona.
      facadeSpy.processAdvance.mockImplementation((_thesisId, _userId, _data, onSuccess): Promise<void> => {
        onSuccess();
        return Promise.resolve();
      });

      // Act
      component.processAdvance();

      // Assert
      expect(component.isSaving()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalled();
    });

    it('debe limpiar estados pero NO redirigir cuando ocurre un error en el guardado', () => {
      // Arrange
      facadeSpy.processAdvance.mockImplementation((_thesisId, _userId, _data, _onSuccess, onError): Promise<void> => {
        onError();
        return Promise.resolve();
      });

      // Act
      component.processAdvance();

      // Assert
      expect(component.isSaving()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });
});
