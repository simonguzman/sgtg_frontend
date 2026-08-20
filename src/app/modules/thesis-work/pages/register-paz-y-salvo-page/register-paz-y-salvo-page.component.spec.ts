import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterPazYSalvoPageComponent } from './register-paz-y-salvo-page.component';
import { RegisterPazYSalvoFacadeService } from './services/register-paz-y-salvo-facade.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../interfaces/paz-y-salvo-playload.interface';

// Tipado estricto para simular la ruta sin usar 'any'
type MockRouteParam = {
  snapshot: { paramMap: { get: jest.Mock } };
  parent: MockRouteParam | null;
};

describe('RegisterPazYSalvoPageComponent', () => {
  let component: RegisterPazYSalvoPageComponent;
  let fixture: ComponentFixture<RegisterPazYSalvoPageComponent>;
  let facadeMock: jest.Mocked<RegisterPazYSalvoFacadeService>;
  let routerMock: jest.Mocked<Router>;
  let routeMock: MockRouteParam;

  const mockWork = {
    thesisWorkId: '123',
    preliminaryDraftData: {
      proposalData: { title: 'Test Title' }
    }
  } as unknown as ThesisWork;

  beforeEach(async () => {
    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
        parent: null
      }
    };

    routerMock = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    facadeMock = {
      loadThesisWork: jest.fn(),
      processPazYSalvo: jest.fn()
    } as unknown as jest.Mocked<RegisterPazYSalvoFacadeService>;

    await TestBed.configureTestingModule({
      imports: [RegisterPazYSalvoPageComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: RegisterPazYSalvoFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock as unknown as ActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPazYSalvoPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Limpia el estado de los mocks entre cada prueba para evitar falsos positivos
    jest.clearAllMocks();
  });

  describe('ngOnInit', () => {
    it('debería extraer el ID de la ruta padre y cargar la tesis', () => {
      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería regresar si no encuentra un ID en toda la jerarquía de rutas', () => {
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('callbacks de loadThesisWork deberían modificar el estado correctamente', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockWork));

      fixture.detectChanges();

      expect(component.thesisWorkState()).toEqual(mockWork);
    });
  });

  describe('Acciones del usuario', () => {
    it('handleRequestConfirmation debería guardar la data pendiente y abrir el modal', () => {
      const mockData = {
        payload: { academicApproved: true } as PazYSalvoPayload,
        file: new File([''], 'test.pdf')
      };

      component.handleRequestConfirmation(mockData);

      expect(component.pendingData()).toEqual(mockData);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('goBack debería navegar a loaded_documents relativo al padre', () => {
      component.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });

  describe('processPazYSalvo', () => {
    const mockData = {
      payload: { academicApproved: true } as PazYSalvoPayload,
      file: new File([''], 'test.pdf')
    };

    beforeEach(() => {
      component.thesisWorkState.set(mockWork);
      component.pendingData.set(mockData);
    });

    it('debería abortar si no hay data pendiente o ID de tesis', () => {
      component.pendingData.set(null);
      component.processPazYSalvo();

      expect(facadeMock.processPazYSalvo).not.toHaveBeenCalled();
    });

    it('debería llamar al facade e indicar isSubmitting', () => {
      component.isConfirmModalOpen.set(true);
      component.processPazYSalvo();

      expect(component.isSubmitting()).toBe(true);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processPazYSalvo).toHaveBeenCalledWith(
        '123',
        mockData.payload,
        mockData.file,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('callback onSuccess debería detener isSubmitting y navegar atrás', () => {
      facadeMock.processPazYSalvo.mockImplementation((id, p, f, onSuccess) => onSuccess());

      component.processPazYSalvo();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalled();
    });

    it('callback onError debería detener isSubmitting y NO navegar', () => {
      facadeMock.processPazYSalvo.mockImplementation((id, p, f, onSuccess, onError) => onError());

      component.processPazYSalvo();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
