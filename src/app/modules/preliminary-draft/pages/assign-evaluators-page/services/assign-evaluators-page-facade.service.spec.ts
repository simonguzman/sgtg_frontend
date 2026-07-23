import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { AssignEvaluatorsPageFacadeService } from './assign-evaluators-page-facade.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('AssignEvaluatorsPageFacadeService', () => {
  let facade: AssignEvaluatorsPageFacadeService;

  let mockRoute: Partial<ActivatedRoute>;
  let mockRouter: jest.Mocked<Partial<Router>>;
  let mockPreliminaryDraftService: jest.Mocked<Partial<PreliminaryDraftService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;

  const mockDraft = { preliminaryDraftId: 'draft-123' } as unknown as PreliminaryDraft;

  beforeEach(() => {
    mockRoute = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('draft-123') } } as any,
      parent: null
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

  describe('Inicialización y Carga de Datos (init)', () => {
    it('debería mostrar error de navegación y retroceder si no hay ID en la ruta', () => {
      (mockRoute.snapshot!.paramMap.get as jest.Mock).mockReturnValue(null);

      facade.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de navegación' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockRoute });
    });

    it('debería cargar los datos si el ID existe y setear selectedPreliminaryDraft', () => {
      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(of(mockDraft));

      facade.init();

      expect(facade.targetPreliminaryDraftId()).toBe('draft-123');
      expect(facade.selectedPreliminaryDraft()).toEqual(mockDraft);
      expect(facade.isDataLoading()).toBeFalsy();
    });

    it('debería mostrar error si el anteproyecto no se encuentra', () => {
      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(of(null));

      facade.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Anteproyecto no encontrado' })
      );
      expect(mockRouter.navigate).toHaveBeenCalled();
      expect(facade.isDataLoading()).toBeFalsy();
    });

    it('debería manejar el error de conexión en la carga', () => {
      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(throwError(() => new Error('Error')));

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

    beforeEach(() => {
      // Forzamos el estado como si la data ya hubiera cargado
      (facade as any).selectedPreliminaryDraft = signal(mockDraft);
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
      (mockPreliminaryDraftService.assignReviewers as jest.Mock).mockReturnValue(of({}));
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
      (mockPreliminaryDraftService.assignReviewers as jest.Mock).mockReturnValue(throwError(() => new Error('API Error')));
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
