import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AssignEvaluatorsPageFacadeService } from './assign-evaluators-page-facade.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';

// 🔹 REFACTOR: Fábricas para generar entidades limpias sin usar 'as unknown'
const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-123',
  proposalId: 'prop-1',
  state: stateList.EN_REVISION,
  evaluators: [],
  documents: [],
  evaluations: [],
  ...overrides
} as PreliminaryDraft);

describe('AssignEvaluatorsPageFacadeService', () => {
  let facade: AssignEvaluatorsPageFacadeService;

  // 🔹 REFACTOR: Mocks estrictos sin Partial ni Any
  let mockRouteParamMapGet: jest.Mock;
  let mockRouteParentParamMapGet: jest.Mock;
  let mockRouter: { navigate: jest.Mock };
  let mockPreliminaryDraftService: {
    getPreliminaryDraftById: jest.Mock;
    assignReviewers: jest.Mock;
  };
  let mockNotificationService: { show: jest.Mock };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para mantener limpia la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRouteParamMapGet = jest.fn().mockReturnValue('draft-123');
    mockRouteParentParamMapGet = jest.fn().mockReturnValue(null);

    const mockRoute = {
      snapshot: { paramMap: { get: mockRouteParamMapGet } },
      parent: { snapshot: { paramMap: { get: mockRouteParentParamMapGet } } }
    };

    mockRouter = {
      navigate: jest.fn()
    };

    mockPreliminaryDraftService = {
      getPreliminaryDraftById: jest.fn(),
      assignReviewers: jest.fn()
    };

    mockNotificationService = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AssignEvaluatorsPageFacadeService,
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    facade = TestBed.inject(AssignEvaluatorsPageFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola original
  });

  describe('Inicialización y Carga de Datos (init)', () => {
    it('debería mostrar error de navegación y retroceder si no hay ID en la ruta', () => {
      mockRouteParamMapGet.mockReturnValue(null);
      mockRouteParentParamMapGet.mockReturnValue(null);

      facade.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de navegación' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: expect.anything() });
    });

    it('debería cargar los datos si el ID existe y setear selectedPreliminaryDraft', () => {
      const mockDraft = createMockPreliminaryDraft();
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));

      facade.init();

      expect(facade.targetPreliminaryDraftId()).toBe('draft-123');
      expect(facade.selectedPreliminaryDraft()).toEqual(mockDraft);
      expect(facade.isDataLoading()).toBeFalsy();
    });

    it('debería mostrar error si el anteproyecto no se encuentra', () => {
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(null));

      facade.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Anteproyecto no encontrado' })
      );
      expect(mockRouter.navigate).toHaveBeenCalled();
      expect(facade.isDataLoading()).toBeFalsy();
    });

    it('debería manejar el error de conexión en la carga', () => {
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(throwError(() => new Error('Error')));

      facade.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de servicio' })
      );
      expect(mockRouter.navigate).toHaveBeenCalled();
      expect(facade.isDataLoading()).toBeFalsy();
    });
  });

  describe('Flujo de Asignación', () => {
    const evaluators = { ev1: 'user-1', ev2: 'user-2' };
    const mockDraft = createMockPreliminaryDraft();

    beforeEach(() => {
      // 🔹 REFACTOR: Inicializamos el componente correctamente en lugar de forzar la señal
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));
      facade.init();
    });

    it('debería abrir el modal y guardar la data pendiente en handleAssign', () => {
      facade.handleAssign(evaluators);

      expect(facade.confirmState().isOpen).toBeTruthy();
      expect(facade.confirmState().pendingData).toEqual(evaluators);
    });

    it('debería limpiar el estado al cancelar la asignación', () => {
      facade.handleAssign(evaluators); // Abrimos primero
      facade.cancelAssignment();

      expect(facade.confirmState().isOpen).toBeFalsy();
      expect(facade.confirmState().pendingData).toBeNull();
    });

    it('debería procesar la asignación exitosa, mostrar notificación y volver atrás', () => {
      mockPreliminaryDraftService.assignReviewers.mockReturnValue(of({}));
      facade.handleAssign(evaluators);

      facade.confirmAssignment();

      expect(mockPreliminaryDraftService.assignReviewers).toHaveBeenCalledWith('draft-123', ['user-1', 'user-2']);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO, title: 'Procesando asignación' })
      );
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION, title: 'Asignación exitosa' })
      );
      expect(facade.confirmState().isOpen).toBeFalsy();
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    it('debería manejar el error de servicio al asignar', () => {
      mockPreliminaryDraftService.assignReviewers.mockReturnValue(throwError(() => new Error('API Error')));
      facade.handleAssign(evaluators);

      facade.confirmAssignment();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de servicio' })
      );
      expect(facade.confirmState().isOpen).toBeFalsy();
      expect(facade.confirmState().isProcessing).toBeFalsy();
    });
  });
});
