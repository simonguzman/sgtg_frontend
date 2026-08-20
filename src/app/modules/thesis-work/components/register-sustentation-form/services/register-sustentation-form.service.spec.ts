import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { RegisterSustentationFormService } from './register-sustentation-form.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

// Tipado estricto parcial para evitar 'any' o casteos excesivos con 'unknown'
type MockUserService = { users: jest.Mock };

describe('RegisterSustentationFormService', () => {
  let service: RegisterSustentationFormService;
  let userServiceMock: MockUserService;
  let notificationMock: jest.Mocked<Partial<NotificationService>>;
  let participantsFormatterMock: jest.Mocked<Partial<ThesisParticipantsFormatterService>>;
  let documentResolverMock: jest.Mocked<Partial<ThesisFinalDeliveryDocumentResolverService>>;

  beforeEach(() => {
    userServiceMock = {
      users: jest.fn()
    };

    notificationMock = {
      show: jest.fn()
    };

    participantsFormatterMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn()
    };

    documentResolverMock = {
      resolveLatestPazYSalvoDocument: jest.fn(),
      resolveLatestFinalDeliveryDocument: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterSustentationFormService,
        FormBuilder,
        { provide: UserService, useValue: userServiceMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock },
        { provide: ThesisFinalDeliveryDocumentResolverService, useValue: documentResolverMock }
      ]
    });

    service = TestBed.inject(RegisterSustentationFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización del Formulario', () => {
    it('debería inicializar el formulario con los campos requeridos y estado inválido', () => {
      expect(service.form.contains('sustentationDate')).toBeTruthy();
      expect(service.form.contains('location')).toBeTruthy();
      expect(service.form.contains('juror1')).toBeTruthy();
      expect(service.form.contains('juror2')).toBeTruthy();
      expect(service.form.valid).toBeFalsy();
    });
  });

  describe('getEligibleJurors', () => {
    const mockThesisWork = {
      preliminaryDraftData: {
        proposalData: {
          director: { id: 'director1' },
          codirector: { id: 'codirector1' },
          advisor: { id: 'advisor1' },
          // Probamos ambas ramas lógicas: string y objeto User
          authors: ['student1', { id: 'student2' } as User]
        },
        evaluations: [{ evaluatorId: 'evaluator1' }]
      }
    } as ThesisWork;

    const mockUsers: Partial<User>[] = [
      { id: 'valid1', roles: [UserRoleType.DOCENTE] },
      { id: 'valid2', roles: [UserRoleType.DOCENTE] },
      { id: 'director1', roles: [UserRoleType.DOCENTE] }, // Excluido: director
      { id: 'evaluator1', roles: [UserRoleType.DOCENTE] }, // Excluido: evaluador
      { id: 'student1', roles: [UserRoleType.ESTUDIANTE] }, // Excluido: autor (string) y no es docente
      { id: 'student2', roles: [UserRoleType.DOCENTE] }, // Excluido: autor (objeto)
      { id: 'conflict1', roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP] } // Excluido: rol conflictivo
    ];

    it('debería retornar un array vacío si no hay datos del anteproyecto', () => {
      userServiceMock.users.mockReturnValue(mockUsers as User[]);
      const result = service.getEligibleJurors({} as ThesisWork);
      expect(result).toEqual([]);
    });

    it('debería filtrar correctamente los usuarios aptos para ser jurados', () => {
      userServiceMock.users.mockReturnValue(mockUsers as User[]);
      const result = service.getEligibleJurors(mockThesisWork);

      // Solo valid1 y valid2 deberían pasar todos los filtros
      expect(result).toHaveLength(2);
      expect(result.map(u => u.id)).toEqual(['valid1', 'valid2']);
    });
  });

  describe('Formateo de nombres (getMemberFullName)', () => {
    it('debería concatenar correctamente los nombres ignorando nulos o vacíos', () => {
      const user = { firstName: 'Juan', lastName: 'Perez' } as User;
      expect(service.getMemberFullName(user)).toBe('Juan Perez');

      const fullUser = { firstName: 'Ana', secondName: 'Maria', lastName: 'Lopez', secondLastName: 'Cruz' } as User;
      expect(service.getMemberFullName(fullUser)).toBe('Ana Maria Lopez Cruz');
    });

    it('debería retornar "No asignado" si el usuario es undefined', () => {
      expect(service.getMemberFullName(undefined)).toBe('No asignado');
    });
  });

  describe('Delegaciones al ParticipantsFormatter', () => {
    const mockWork = {} as ThesisWork;

    it('debería delegar getStudentNames', () => {
      service.getStudentNames(mockWork);
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockWork);
    });

    it('debería delegar getDirectorName', () => {
      service.getDirectorName(mockWork);
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockWork);
    });

    it('debería delegar getCodirectorName', () => {
      service.getCodirectorName(mockWork);
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockWork);
    });

    it('debería delegar getAdvisorName', () => {
      service.getAdvisorName(mockWork);
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockWork);
    });
  });

  describe('Resolución de Documentos (getExistingDocument)', () => {
    const mockWork = {} as ThesisWork;

    it('debería resolver el documento FORMATO_G desde Paz y Salvo', () => {
      service.getExistingDocument(mockWork, 'FORMATO_G');
      expect(documentResolverMock.resolveLatestPazYSalvoDocument).toHaveBeenCalledWith(mockWork);
    });

    it('debería normalizar "FORMATO" a "FORMATO_E" y resolverlo desde Final Delivery', () => {
      service.getExistingDocument(mockWork, 'FORMATO ');
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockWork, 'FORMATO_E');
    });

    it('debería resolver MONOGRAFIA y ANEXOS desde Final Delivery', () => {
      service.getExistingDocument(mockWork, 'MONOGRAFIA');
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockWork, 'MONOGRAFIA');

      service.getExistingDocument(mockWork, 'ANEXOS');
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockWork, 'ANEXOS');
    });

    it('debería retornar null si el tipo de documento no coincide con los esperados', () => {
      const result = service.getExistingDocument(mockWork, 'OTRO_TIPO_INVALIDO');
      expect(result).toBeNull();
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).not.toHaveBeenCalled();
      expect(documentResolverMock.resolveLatestPazYSalvoDocument).not.toHaveBeenCalled();
    });
  });

  describe('Notificaciones', () => {
    it('notifyIncompleteForm debería mostrar notificación de error con los datos correctos', () => {
      service.notifyIncompleteForm();
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Formulario incompleto',
        message: 'Debe diligenciar todos los campos y adjuntar el Formato_E.',
        type: NotificationType.ERROR
      });
    });
  });
});
