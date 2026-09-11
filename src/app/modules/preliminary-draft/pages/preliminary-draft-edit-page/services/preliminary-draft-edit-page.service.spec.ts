import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { of, throwError } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftEditPageService } from './preliminary-draft-edit-page.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';

// 🔹 REFACTOR: Fábricas para generar datos limpios y tipados sin usar 'as unknown'
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  roles: [],
  ...overrides
} as User);

type ProposalData = NonNullable<PreliminaryDraft['proposalData']>;
const createMockProposalData = (overrides: Partial<ProposalData> = {}): ProposalData => ({
  id: 'prop-1',
  title: 'Test Title',
  director: createMockUser(),
  ...overrides
} as ProposalData);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => {
  const base: Partial<PreliminaryDraft> = {
    preliminaryDraftId: 'draft-123',
    state: stateList.EN_REVISION,
    proposalData: createMockProposalData(),
    ...overrides
  };
  return base as PreliminaryDraft;
};


describe('PreliminaryDraftEditPageService', () => {
  let service: PreliminaryDraftEditPageService;

  // 🔹 REFACTOR: Mocks tipados estructuralmente
  let mockRouteParamMapGet: jest.Mock;
  let mockRouter: { navigate: jest.Mock };
  let mockLocation: { back: jest.Mock };
  let mockPreliminaryDraftService: {
    getPreliminaryDraftById: jest.Mock;
    updatePreliminaryDraft: jest.Mock;
  };
  let mockNotificationService: { show: jest.Mock };
  let mockAuthService: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock;
  };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido en la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRouteParamMapGet = jest.fn().mockReturnValue('draft-123');
    const mockRoute = {
      snapshot: { paramMap: { get: mockRouteParamMapGet } }
    };

    mockRouter = { navigate: jest.fn() };
    mockLocation = { back: jest.fn() };

    mockPreliminaryDraftService = {
      getPreliminaryDraftById: jest.fn(),
      updatePreliminaryDraft: jest.fn()
    };

    mockNotificationService = { show: jest.fn() };

    mockAuthService = {
      currentUser: signal(createMockUser({ id: 'user-1' })),
      hasAnyRole: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftEditPageService,
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: Location, useValue: mockLocation },
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    service = TestBed.inject(PreliminaryDraftEditPageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar las implementaciones originales de la consola
  });

  describe('init y loadPreliminaryDraftData', () => {
    it('debería redirigir si no hay un ID en la ruta', () => {
      mockRouteParamMapGet.mockReturnValue(null);

      service.init();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería setear la data si el usuario es el dueño (Director)', () => {
      const mockDraft = createMockDraft({
        proposalData: createMockProposalData({ director: createMockUser({ id: 'user-1' }) })
      });

      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));
      mockAuthService.hasAnyRole.mockReturnValue(false); // No es admin

      service.init();

      expect(service.preliminaryDraftToEdit()).toEqual(mockDraft);
    });

    it('debería setear la data si el usuario es ADMIN (incluso si no es el dueño)', () => {
      const mockDraft = createMockDraft({
        proposalData: createMockProposalData({ director: createMockUser({ id: 'other-user' }) })
      });

      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));
      mockAuthService.hasAnyRole.mockReturnValue(true); // ES admin

      service.init();

      expect(service.preliminaryDraftToEdit()).toEqual(mockDraft);
    });

    it('debería redirigir y mostrar error si el usuario NO es dueño ni ADMIN', () => {
      const mockDraft = createMockDraft({
        proposalData: createMockProposalData({ director: createMockUser({ id: 'other-user' }) })
      });

      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));
      mockAuthService.hasAnyRole.mockReturnValue(false);

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería manejar el error de carga de API', () => {
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(throwError(() => new Error('Error')));

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de guardado' })
      );
    });
  });

  describe('Flujo de Actualización', () => {
    let mockDraft: PreliminaryDraft;

    beforeEach(() => {
      // 🔹 REFACTOR: En lugar de forzar '(service as any).preliminaryDraftToEdit = signal...'
      // Llenamos el estado ejecutando el flujo natural de inicialización del componente.
      mockDraft = createMockDraft({ preliminaryDraftId: 'draft-123' });

      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));
      mockAuthService.hasAnyRole.mockReturnValue(true); // Garantizamos permisos

      service.init(); // Esto puebla la señal `preliminaryDraftToEdit` correctamente
    });

    it('debería manejar el modal de confirmación', () => {
      const updatedData = createMockDraft({ preliminaryDraftId: 'draft-123', proposalId: '999' });

      service.handleUpdate(updatedData);

      expect(service.confirmState().isOpen).toBeTruthy();
      expect(service.confirmState().pendingData).toEqual(updatedData);

      service.cancelUpdate();

      expect(service.confirmState().isOpen).toBeFalsy();
    });

    it('debería procesar la actualización correctamente', () => {
      mockPreliminaryDraftService.updatePreliminaryDraft.mockReturnValue(of({}));
      service.handleUpdate(mockDraft);

      service.confirmUpdate();

      expect(mockPreliminaryDraftService.updatePreliminaryDraft).toHaveBeenCalledWith('draft-123', mockDraft);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
      expect(service.confirmState().isOpen).toBeFalsy();
    });

    it('debería manejar el error de actualización', () => {
      mockPreliminaryDraftService.updatePreliminaryDraft.mockReturnValue(throwError(() => new Error('Error')));
      service.handleUpdate(mockDraft);

      service.confirmUpdate();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
      expect(service.confirmState().isProcessing).toBeFalsy();
    });
  });

  describe('Navegación', () => {
    it('debería llamar a Location.back al ejecutar goBack', () => {
      service.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
