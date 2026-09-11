import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { PreliminaryDraftFacadeService } from './preliminary-draft-facade.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PreliminaryDraftMapperService } from './preliminary-draft-mapper.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { PreliminaryDraftTableRow } from '../models/preliminary-draft-page.model';

// 🔹 REFACTOR: Fábricas para generar datos limpios y tipados
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  roles: [],
  ...overrides
} as User);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: '1',
  isArchived: false,
  // Tipado estricto accediendo a la propiedad real de la interfaz
  proposalData: { createdAt: new Date() } as PreliminaryDraft['proposalData'],
  ...overrides
} as PreliminaryDraft);

const createMockTableRow = (overrides: Partial<PreliminaryDraftTableRow> = {}): PreliminaryDraftTableRow => ({
  id: '1',
  title: 'Mapped',
  status: 'En revisión',
  authors: 'Autor',
  director: 'Director',
  date: '2026-08-21',
  actions: [],
  ...overrides
} as PreliminaryDraftTableRow);

describe('PreliminaryDraftFacadeService', () => {
  let service: PreliminaryDraftFacadeService;

  // 🔹 REFACTOR: Tipados estrictos estructurales sin 'Partial'
  let mockPreliminaryDraftService: {
    preliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
    deleteDraft: jest.Mock;
  };

  let mockAuthService: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock;
  };

  let mockNotificationService: {
    show: jest.Mock;
  };

  let mockMapperService: {
    mapPreliminaryDraftToTable: jest.Mock;
  };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para evitar ruido en la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockPreliminaryDraftService = {
      preliminaryDrafts: signal([createMockDraft()]),
      deleteDraft: jest.fn()
    };

    mockAuthService = {
      currentUser: signal(createMockUser()),
      hasAnyRole: jest.fn()
    };

    mockNotificationService = {
      show: jest.fn()
    };

    mockMapperService = {
      mapPreliminaryDraftToTable: jest.fn().mockReturnValue(createMockTableRow())
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftFacadeService,
        // Asignación limpia sin usar 'as unknown as Type'
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PreliminaryDraftMapperService, useValue: mockMapperService }
      ]
    });

    service = TestBed.inject(PreliminaryDraftFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar las implementaciones originales de la consola
  });

  describe('Señal Computada: tableData', () => {
    it('debería retornar datos filtrados por isArchived = false y mapeados', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true);

      const data = service.tableData();

      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Mapped');
      expect(mockMapperService.mapPreliminaryDraftToTable).toHaveBeenCalled();
    });
  });

  describe('Señal Computada: headerButtons', () => {
    it('debería incluir "Registrar anteproyecto" si el usuario tiene rol adecuado', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true);

      const buttons = service.headerButtons();
      const hasRegisterBtn = buttons.some(b => b.label === 'Registrar anteproyecto');

      expect(hasRegisterBtn).toBe(true);
    });

    it('no debería incluir "Registrar anteproyecto" si el usuario NO tiene rol', () => {
      mockAuthService.hasAnyRole.mockReturnValue(false);

      const buttons = service.headerButtons();
      const hasRegisterBtn = buttons.some(b => b.label === 'Registrar anteproyecto');

      expect(hasRegisterBtn).toBe(false);
    });
  });

  describe('Acciones', () => {
    it('debería ejecutar deleteDraft con éxito y notificar', () => {
      mockPreliminaryDraftService.deleteDraft.mockReturnValue(of(null));
      const onSuccess = jest.fn();
      const onError = jest.fn();

      service.deleteDraft('1', onSuccess, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.INFO }));
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.CONFIRMATION }));
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('debería manejar error en deleteDraft y notificar', () => {
      mockPreliminaryDraftService.deleteDraft.mockReturnValue(throwError(() => new Error('Error')));
      const onSuccess = jest.fn();
      const onError = jest.fn();

      service.deleteDraft('1', onSuccess, onError);

      // Verificamos que se haya notificado el error
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
      expect(onError).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('debería mostrar notificación de acceso restringido', () => {
      service.showRestrictedAccessNotification();

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Acceso denegado',
        type: NotificationType.ERROR
      }));
    });
  });
});
