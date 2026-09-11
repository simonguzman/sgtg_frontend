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
import { stateList } from '../../../../../core/enums/state.enum';

// 🔹 REFACTOR: Fábricas para generar datos estructurados y evitar 'as unknown'
type ProposalData = NonNullable<PreliminaryDraft['proposalData']>;

const createMockProposalData = (overrides: Partial<ProposalData> = {}): ProposalData => ({
  id: '123',
  title: 'Título de prueba',
  description: 'Descripción',
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  authors: [],
  ...overrides
} as ProposalData);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: '123',
  proposalData: createMockProposalData(),
  documents: [],
  state: stateList.EN_REVISION,
  createdData: new Date(),
  ...overrides
} as PreliminaryDraft);

describe('PreliminaryDraftCreatePageService', () => {
  let service: PreliminaryDraftCreatePageService;

  // 🔹 REFACTOR: Tipado ultra estricto y limpio (sin Pick complejo)
  let mockPreliminaryDraftService: { createPreliminaryDraft: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockAuthService: { hasAnyRole: jest.Mock };
  let mockRouter: { navigate: jest.Mock };
  let mockLocation: { back: jest.Mock };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido en la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

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
    jest.restoreAllMocks(); // 🧹 Restaurar consola
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
      mockPreliminaryDraftService.createPreliminaryDraft.mockReturnValue(throwError(() => new Error('API Error')));

      service.openConfirmation(mockDraft);
      service.confirmCreation();

      // 🔹 REFACTOR: Validar el manejo de errores y que se imprimió el error (está silenciado)
      expect(console.error).toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de registro' })
      );

      // El estado debe cerrar el modal y apagar el modo de carga, pero mantener la data
      const state = service.confirmState();
      expect(state.isOpen).toBeFalsy();
      expect(state.isProcessing).toBeFalsy();
    });
  });

  describe('Navegación', () => {
    it('debería llamar a Location.back() al ejecutar goBack()', () => {
      service.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
