import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { PreliminaryDraftEditPageService } from './preliminary-draft-edit-page.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../../users/interfaces/user.interface';

describe('PreliminaryDraftEditPageService', () => {
  let service: PreliminaryDraftEditPageService;

  let mockRoute: Partial<ActivatedRoute>;
  let mockRouter: jest.Mocked<Partial<Router>>;
  let mockLocation: jest.Mocked<Partial<Location>>;
  let mockPreliminaryDraftService: jest.Mocked<Partial<PreliminaryDraftService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;

  beforeEach(() => {
    mockRoute = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('draft-123') } } as any
    };
    mockRouter = { navigate: jest.fn() };
    mockLocation = { back: jest.fn() };
    mockPreliminaryDraftService = {
      getPreliminaryDraftById: jest.fn(),
      updatePreliminaryDraft: jest.fn()
    };
    mockNotificationService = { show: jest.fn() };
    mockAuthService = {
      currentUser: signal({ id: 'user-1' } as User),
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

  describe('init y loadPreliminaryDraftData', () => {
    it('debería redirigir si no hay un ID en la ruta', () => {
      (mockRoute.snapshot!.paramMap.get as jest.Mock).mockReturnValue(null);

      service.init();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería setear la data si el usuario es el dueño (Director)', () => {
      const mockDraft = {
        preliminaryDraftId: 'draft-123',
        proposalData: { director: { id: 'user-1' } }
      } as unknown as PreliminaryDraft;

      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(of(mockDraft));
      (mockAuthService.hasAnyRole as jest.Mock).mockReturnValue(false); // No es admin

      service.init();

      expect(service.preliminaryDraftToEdit()).toEqual(mockDraft);
    });

    it('debería setear la data si el usuario es ADMIN (incluso si no es el dueño)', () => {
      const mockDraft = {
        preliminaryDraftId: 'draft-123',
        proposalData: { director: { id: 'other-user' } }
      } as unknown as PreliminaryDraft;

      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(of(mockDraft));
      (mockAuthService.hasAnyRole as jest.Mock).mockReturnValue(true); // ES admin

      service.init();

      expect(service.preliminaryDraftToEdit()).toEqual(mockDraft);
    });

    it('debería redirigir y mostrar error si el usuario NO es dueño ni ADMIN', () => {
      const mockDraft = {
        proposalData: { director: { id: 'other-user' } }
      } as unknown as PreliminaryDraft;

      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(of(mockDraft));
      (mockAuthService.hasAnyRole as jest.Mock).mockReturnValue(false);

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería manejar el error de carga de API', () => {
      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(throwError(() => new Error('Error')));

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de guardado' })
      );
    });
  });

  describe('Flujo de Actualización', () => {
    const mockDraft = { preliminaryDraftId: 'draft-123' } as unknown as PreliminaryDraft;

    beforeEach(() => {
      // Forzamos el signal de lectura para las pruebas de actualización
      (service as any).preliminaryDraftToEdit = signal(mockDraft);
    });

    it('debería manejar el modal de confirmación', () => {
      const updatedData = { ...mockDraft, proposalId: '999' } as unknown as PreliminaryDraft;

      service.handleUpdate(updatedData);

      expect(service.confirmState().isOpen).toBeTruthy();
      expect(service.confirmState().pendingData).toEqual(updatedData);

      service.cancelUpdate();

      expect(service.confirmState().isOpen).toBeFalsy();
    });

    it('debería procesar la actualización correctamente', () => {
      (mockPreliminaryDraftService.updatePreliminaryDraft as jest.Mock).mockReturnValue(of({}));
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
      (mockPreliminaryDraftService.updatePreliminaryDraft as jest.Mock).mockReturnValue(throwError(() => new Error('Error')));
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
