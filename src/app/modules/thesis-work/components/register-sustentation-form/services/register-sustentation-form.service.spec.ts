// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';

// 2. Servicio a probar
import { RegisterSustentationFormService } from './register-sustentation-form.service';

// 3. Dependencias (Servicios)
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'Partial') ──────────

interface MockUserService {
  users: jest.Mock<User[], []>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockParticipantsFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
}

interface MockDocumentResolverService {
  resolveLatestPazYSalvoDocument: jest.Mock<FileDocument | null, [ThesisWork]>;
  resolveLatestFinalDeliveryDocument: jest.Mock<FileDocument | null, [ThesisWork, string]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-default',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();

  // Usamos una estructura base completa para evitar errores de undefined en los tests
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'p-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Título Mock',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    }
  };
  return { ...baseThesis, ...overrides };
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterSustentationFormService', () => {
  let service: RegisterSustentationFormService;

  // Mocks tipados estrictamente
  let userServiceMock: MockUserService;
  let notificationMock: MockNotificationService;
  let participantsFormatterMock: MockParticipantsFormatterService;
  let documentResolverMock: MockDocumentResolverService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

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
    jest.restoreAllMocks(); // 🧹 Restaurar consola
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

  describe('Cálculo de Jurados Elegibles (getEligibleJurors)', () => {
    // Generamos usuarios reales (legales para TS) mediante la fábrica
    const mockUsers: User[] = [
      createMockUser({ id: 'valid1', roles: [UserRoleType.DOCENTE] }),
      createMockUser({ id: 'valid2', roles: [UserRoleType.DOCENTE] }),
      createMockUser({ id: 'director1', roles: [UserRoleType.DOCENTE] }), // Excluido: director
      createMockUser({ id: 'evaluator1', roles: [UserRoleType.DOCENTE] }), // Excluido: evaluador
      createMockUser({ id: 'student1', roles: [UserRoleType.ESTUDIANTE] }), // Excluido: no es docente
      createMockUser({ id: 'student2', roles: [UserRoleType.DOCENTE] }), // Excluido: autor
      createMockUser({ id: 'conflict1', roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP] }) // Excluido: rol conflictivo
    ];

    it('debería retornar un array vacío si no hay datos del anteproyecto o propuesta', () => {
      userServiceMock.users.mockReturnValue(mockUsers);

      // Creamos una tesis vaciando explícitamente sus datos con casteo seguro a undefined
      const incompleteThesis = createMockThesisWork();
      incompleteThesis.preliminaryDraftData.proposalData = undefined as any;

      const result = service.getEligibleJurors(incompleteThesis);
      expect(result).toEqual([]);
    });

    it('debería filtrar correctamente los usuarios aptos para ser jurados basándose en los conflictos', () => {
      userServiceMock.users.mockReturnValue(mockUsers);

      // Construimos una tesis con el escenario completo de conflictos
      const thesisWithConflicts = createMockThesisWork();
      thesisWithConflicts.preliminaryDraftData.proposalData.director = createMockUser({ id: 'director1' });
      thesisWithConflicts.preliminaryDraftData.proposalData.codirector = createMockUser({ id: 'codirector1' });
      thesisWithConflicts.preliminaryDraftData.proposalData.advisor = createMockUser({ id: 'advisor1' });

      // 🔥 FIX: Pasamos estrictamente objetos User válidos para cumplir con User[]
      thesisWithConflicts.preliminaryDraftData.proposalData.authors = [
        createMockUser({ id: 'student1' }),
        createMockUser({ id: 'student2' })
      ];

      // Evaluaciones previas (Solo requiere el evaluatorId)
      thesisWithConflicts.preliminaryDraftData.evaluations = [
        { evaluatorId: 'evaluator1' } as any
      ];

      const result = service.getEligibleJurors(thesisWithConflicts);

      // Solo valid1 y valid2 deberían pasar todos los filtros
      expect(result).toHaveLength(2);
      expect(result.map(u => u.id)).toEqual(['valid1', 'valid2']);
    });
  });

  describe('Formateo de nombres (getMemberFullName)', () => {
    it('debería concatenar correctamente los nombres ignorando nulos o vacíos', () => {
      const user = createMockUser({ firstName: 'Juan', secondName: '', lastName: 'Perez', secondLastName: '' });
      expect(service.getMemberFullName(user)).toBe('Juan Perez');

      const fullUser = createMockUser({ firstName: 'Ana', secondName: 'Maria', lastName: 'Lopez', secondLastName: 'Cruz' });
      expect(service.getMemberFullName(fullUser)).toBe('Ana Maria Lopez Cruz');
    });

    it('debería retornar "No asignado" si el usuario es undefined', () => {
      expect(service.getMemberFullName(undefined)).toBe('No asignado');
    });
  });

  describe('Delegaciones al ParticipantsFormatter', () => {
    const mockWork = createMockThesisWork();

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
    const mockWork = createMockThesisWork();

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
