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
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';

// Helper Factory para generar datos estrictamente tipados
const createMockPreliminaryDraft = (overrides?: Partial<PreliminaryDraft>): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: '123',
  proposalData: {} as Proposal, // El casteo a la interfaz es válido en factories para obviar datos profundos no evaluados
  documents: [],
  state: 'EN_REVISION',
  createdData: new Date(),
  ...overrides
} as PreliminaryDraft);

describe('PreliminaryDraftCreatePageService', () => {
  let service: PreliminaryDraftCreatePageService;

  // Tipado ultra estricto de Mocks: Garantiza que la firma de jest.fn() coincida con el servicio real
  let mockPreliminaryDraftService: jest.Mocked<Pick<PreliminaryDraftService, 'createPreliminaryDraft'>>;
  let mockNotificationService: jest.Mocked<Pick<NotificationService, 'show'>>;
  let mockAuthService: jest.Mocked<Pick<AuthService, 'hasAnyRole'>>;
  let mockRouter: jest.Mocked<Pick<Router, 'navigate'>>;
  let mockLocation: jest.Mocked<Pick<Location, 'back'>>;

  beforeEach(() => {
    // Inicialización de los Mocks
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAccess', () => {
    it('no debería hacer nada si el usuario tiene los roles requeridos', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true);

      service.checkAccess();

      expect(mockAuthService.hasAnyRole).toHaveBeenCalledWith([
        UserRoleType.ADMINISTRADOR,
        UserRoleType.DIRECTOR
      ]);
      expect(mockNotificationService.show).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('debería mostrar notificación de error y redirigir si no tiene permisos', () => {
      mockAuthService.hasAnyRole.mockReturnValue(false);

      service.checkAccess();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });
  });

  describe('Flujo de Confirmación y Creación', () => {
    const mockDraft = createMockPreliminaryDraft();

    it('debería abrir el modal y actualizar el estado con la data pendiente', () => {
      service.openConfirmation(mockDraft);

      const state = service.confirmState();
      expect(state.isOpen).toBeTruthy();
      expect(state.pendingData).toEqual(mockDraft);
      expect(state.isProcessing).toBeFalsy();
    });

    it('debería cerrar el modal y limpiar la data al cancelar', () => {
      service.openConfirmation(mockDraft); // Abrimos primero
      service.cancelCreation(); // Cancelamos

      const state = service.confirmState();
      expect(state.isOpen).toBeFalsy();
      expect(state.pendingData).toBeNull();
      expect(state.isProcessing).toBeFalsy();
    });

    it('no debería ejecutar la creación si no hay datos pendientes o ya está procesando', () => {
      // Intento 1: Sin data pendiente
      service.confirmCreation();
      expect(mockPreliminaryDraftService.createPreliminaryDraft).not.toHaveBeenCalled();

      // Intento 2: Con data, pero marcando isProcessing como true
      service.confirmState.set({ isOpen: true, pendingData: mockDraft, isProcessing: true });
      service.confirmCreation();
      expect(mockPreliminaryDraftService.createPreliminaryDraft).not.toHaveBeenCalled();
    });

    it('debería procesar la creación con éxito, notificar y redirigir', () => {
      mockPreliminaryDraftService.createPreliminaryDraft.mockReturnValue(of(mockDraft));

      service.openConfirmation(mockDraft);
      service.confirmCreation();

      // Validar notificaciones e interacciones
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO, title: 'Procesando solicitud' })
      );
      expect(mockPreliminaryDraftService.createPreliminaryDraft).toHaveBeenCalledWith(mockDraft);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION, title: '¡Registro exitoso!' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);

      // Validar restablecimiento de estado
      const state = service.confirmState();
      expect(state.isOpen).toBeFalsy();
      expect(state.isProcessing).toBeFalsy();
      expect(state.pendingData).toBeNull();
    });

    it('debería manejar el error de la API, restaurar el estado del modal y notificar', () => {
      // Suprimimos el console.error temporalmente para limpiar la salida de pruebas
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockPreliminaryDraftService.createPreliminaryDraft.mockReturnValue(throwError(() => new Error('API Error')));

      service.openConfirmation(mockDraft);
      service.confirmCreation();

      // Validar manejo de errores
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de registro' })
      );

      // El estado debe cerrar el modal y apagar el modo de carga, pero mantener la data
      const state = service.confirmState();
      expect(state.isOpen).toBeFalsy();
      expect(state.isProcessing).toBeFalsy();

      consoleSpy.mockRestore(); // Limpiamos el espía
    });
  });

  describe('Navegación', () => {
    it('debería llamar a Location.back() al ejecutar goBack()', () => {
      service.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
