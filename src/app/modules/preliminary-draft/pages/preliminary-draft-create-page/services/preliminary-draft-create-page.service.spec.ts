import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { of, throwError } from 'rxjs';

import { PreliminaryDraftCreatePageService } from './preliminary-draft-create-page.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('PreliminaryDraftCreatePageService', () => {
  let service: PreliminaryDraftCreatePageService;

  let mockPreliminaryDraftService: jest.Mocked<Partial<PreliminaryDraftService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;
  let mockLocation: jest.Mocked<Partial<Location>>;

  beforeEach(() => {
    mockPreliminaryDraftService = {
      createPreliminaryDraft: jest.fn()
    };
    mockNotificationService = {
      show: jest.fn()
    };
    mockAuthService = {
      hasAnyRole: jest.fn()
    };
    mockRouter = {
      navigate: jest.fn()
    };
    mockLocation = {
      back: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftCreatePageService,
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: Location, useValue: mockLocation }
      ]
    });

    service = TestBed.inject(PreliminaryDraftCreatePageService);
  });

  describe('checkAccess', () => {
    it('no debería hacer nada si el usuario tiene los roles requeridos', () => {
      (mockAuthService.hasAnyRole as jest.Mock).mockReturnValue(true);

      service.checkAccess();

      expect(mockNotificationService.show).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('debería mostrar notificación de error y redirigir si no tiene permisos', () => {
      (mockAuthService.hasAnyRole as jest.Mock).mockReturnValue(false);

      service.checkAccess();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });
  });

  describe('Flujo de Confirmación y Creación', () => {
    const mockDraft = { proposalId: '123' } as unknown as PreliminaryDraft;

    it('debería abrir el modal y setear la data pendiente', () => {
      service.openConfirmation(mockDraft);

      const state = service.confirmState();
      expect(state.isOpen).toBeTruthy();
      expect(state.pendingData).toBe(mockDraft);
      expect(state.isProcessing).toBeFalsy();
    });

    it('debería cerrar el modal y limpiar la data pendiente al cancelar', () => {
      service.openConfirmation(mockDraft); // Abrimos primero
      service.cancelCreation();

      const state = service.confirmState();
      expect(state.isOpen).toBeFalsy();
      expect(state.pendingData).toBeNull();
    });

    it('no debería confirmar la creación si no hay datos pendientes o ya está procesando', () => {
      service.confirmCreation(); // Estado inicial (null, false)
      expect(mockPreliminaryDraftService.createPreliminaryDraft).not.toHaveBeenCalled();

      // Simulamos que está procesando
      service.confirmState.set({ isOpen: true, pendingData: mockDraft, isProcessing: true });
      service.confirmCreation();
      expect(mockPreliminaryDraftService.createPreliminaryDraft).not.toHaveBeenCalled();
    });

    it('debería procesar la creación con éxito, mostrar notificación y navegar', () => {
      (mockPreliminaryDraftService.createPreliminaryDraft as jest.Mock).mockReturnValue(of({}));
      service.openConfirmation(mockDraft);

      service.confirmCreation();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Procesando solicitud' })
      );
      expect(mockPreliminaryDraftService.createPreliminaryDraft).toHaveBeenCalledWith(mockDraft);

      // Validar handleCreationSuccess
      const state = service.confirmState();
      expect(state.isOpen).toBeFalsy();
      expect(state.isProcessing).toBeFalsy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería manejar el error de creación, restaurar el estado y mostrar notificación', () => {
      // Evitamos que el error ensucie el log de la consola durante la prueba
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (mockPreliminaryDraftService.createPreliminaryDraft as jest.Mock).mockReturnValue(throwError(() => new Error('API Error')));

      service.openConfirmation(mockDraft);
      service.confirmCreation();

      const state = service.confirmState();
      expect(state.isOpen).toBeFalsy();
      expect(state.isProcessing).toBeFalsy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('Navegación', () => {
    it('debería llamar a Location.back al ejecutar goBack', () => {
      service.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
