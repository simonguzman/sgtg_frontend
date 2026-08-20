import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ThesisWorkPageFacadeService } from './thesis-work-page-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisWorkPageMapperService } from './thesis-work-page-mapper.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { THESIS_WORK_HEADER_BUTTONS, ThesisWorkTableRow } from '../models/thesis-work-page.model';

describe('ThesisWorkPageFacadeService', () => {
  let service: ThesisWorkPageFacadeService;

  // Definición estricta de Mocks usando Partial para evitar 'any' y 'unknown'
  let thesisWorkMock: {
    thesisWorks: WritableSignal<Partial<ThesisWork>[]>;
    reactivateThesisWorkMock: jest.Mock;
  };

  let authMock: {
    currentUser: WritableSignal<{ id: string } | null>;
    hasAnyRole: jest.Mock;
  };

  let notificationMock: {
    show: jest.Mock;
  };

  let mapperMock: {
    mapThesisWorkToTable: jest.Mock;
  };

  beforeEach(() => {
    // 1. Inicializar Signals Reales para habilitar la reactividad en el computed()
    thesisWorkMock = {
      thesisWorks: signal([]),
      reactivateThesisWorkMock: jest.fn()
    };

    authMock = {
      currentUser: signal({ id: 'user-123' }),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    notificationMock = {
      show: jest.fn()
    };

    mapperMock = {
      mapThesisWorkToTable: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkPageFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkMock as Partial<ThesisWorkService> },
        { provide: AuthService, useValue: authMock as Partial<AuthService> },
        { provide: NotificationService, useValue: notificationMock as Partial<NotificationService> },
        { provide: ThesisWorkPageMapperService, useValue: mapperMock as Partial<ThesisWorkPageMapperService> }
      ]
    });

    service = TestBed.inject(ThesisWorkPageFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Propiedades y Estado Reactivo (Signals)', () => {
    it('debe exponer los botones de encabezado por defecto', () => {
      expect(service.headerButtons()).toEqual(THESIS_WORK_HEADER_BUTTONS);
    });

    it('debe filtrar trabajos archivados y mapear únicamente los activos en tableData', () => {
      // Arrange
      const mockActiveWork: Partial<ThesisWork> = { thesisWorkId: 'tw-1', isArchived: false };
      const mockArchivedWork: Partial<ThesisWork> = { thesisWorkId: 'tw-2', isArchived: true };
      const mockMappedRow: Partial<ThesisWorkTableRow> = { id: 'row-1', title: 'Tesis Mapeada' };

      // Alimentamos el Signal con los datos de prueba
      thesisWorkMock.thesisWorks.set([mockActiveWork, mockArchivedWork]);

      // Simulamos que el usuario tiene el rol de Administrador
      authMock.hasAnyRole.mockImplementation((roles: UserRoleType[]) => roles.includes(UserRoleType.ADMINISTRADOR));
      mapperMock.mapThesisWorkToTable.mockReturnValue(mockMappedRow);

      // Act
      const result = service.tableData();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockMappedRow);

      // Verificamos que el mapeo solo procesó el trabajo activo
      expect(mapperMock.mapThesisWorkToTable).toHaveBeenCalledTimes(1);
      expect(mapperMock.mapThesisWorkToTable).toHaveBeenCalledWith(
        mockActiveWork,
        true, // hasFullAccessRole -> true (Es Administrador)
        true, // isAdmin -> true (Es Administrador)
        'user-123' // ID del usuario actual
      );
    });
  });

  describe('Flujos de Acción (reactivateThesis)', () => {
    it('debe mostrar notificación de procesamiento, confirmación y ejecutar onSuccess si la API responde bien', () => {
      // Arrange
      thesisWorkMock.reactivateThesisWorkMock.mockReturnValue(of(undefined));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      // Act
      service.reactivateThesis('tw-1', successCb, errorCb);

      // Assert
      expect(thesisWorkMock.reactivateThesisWorkMock).toHaveBeenCalledWith('tw-1');
      expect(successCb).toHaveBeenCalledTimes(1);
      expect(errorCb).not.toHaveBeenCalled();

      // Se debieron lanzar 2 notificaciones: Informativa (Iniciando) y Confirmación (Éxito)
      expect(notificationMock.show).toHaveBeenCalledTimes(2);
      expect(notificationMock.show).toHaveBeenNthCalledWith(1, {
        title: 'Reactivando trabajo',
        message: 'Procesando la solicitud...',
        type: NotificationType.INFO
      });
      expect(notificationMock.show).toHaveBeenNthCalledWith(2, {
        title: 'Trabajo Reactivado',
        message: 'El trabajo ha sido reactivado correctamente.',
        type: NotificationType.CONFIRMATION
      });
    });

    it('debe mostrar notificación de error y ejecutar onError si la reactivación falla', () => {
      // Arrange
      thesisWorkMock.reactivateThesisWorkMock.mockReturnValue(throwError(() => new Error('Error de conexión')));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      // Act
      service.reactivateThesis('tw-1', successCb, errorCb);

      // Assert
      expect(errorCb).toHaveBeenCalledTimes(1);
      expect(successCb).not.toHaveBeenCalled();

      // Se debieron lanzar 2 notificaciones: Informativa (Iniciando) y Error (Fallo)
      expect(notificationMock.show).toHaveBeenCalledTimes(2);
      expect(notificationMock.show).toHaveBeenNthCalledWith(2, {
        title: 'Error',
        message: 'Hubo un error al reactivar el trabajo.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Notificaciones Utilitarias', () => {
    it('debe mostrar alerta estándar de restricción de acceso (showRestrictedAccessNotification)', () => {
      // Act
      service.showRestrictedAccessNotification();

      // Assert
      expect(notificationMock.show).toHaveBeenCalledTimes(1);
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Acceso denegado',
        message: 'No tienes permisos para realizar esta acción o interactuar con este registro.',
        type: NotificationType.ERROR
      });
    });
  });
});
