// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { ThesisWorkDetailsMapperService } from './thesis-work-details-mapper.service';

// 3. Dependencias
import { UserService } from '../../../../users/services/user.service';

// 4. Interfaces, Enums y Modelos
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { stateList } from '../../../../../core/enums/state.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown' ni casteos dobles) ──

interface MockUserService {
  getAuthorsNames: jest.Mock<string, [User[] | undefined]>;
  getUserFullName: jest.Mock<string, [string | undefined]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
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
  const baseThesis: ThesisWork = {
    thesisWorkId: 'tw-1',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      maximumDeliveryDate: new Date(),
      proposalData: {
        id: 'prop-1',
        title: 'Tesis IA',
        description: 'Uso de IA',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    },
    sustentations: []
  };
  return { ...baseThesis, ...overrides };
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ThesisWorkDetailsMapperService', () => {
  let service: ThesisWorkDetailsMapperService;

  // Interface Mock estricta
  let userServiceSpy: MockUserService;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización del mock respetando firmas estrictas
    userServiceSpy = {
      getAuthorsNames: jest.fn(),
      getUserFullName: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkDetailsMapperService,
        { provide: UserService, useValue: userServiceSpy }
      ]
    });

    service = TestBed.inject(ThesisWorkDetailsMapperService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpia los espías
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('mapToView() - Mapeo general', () => {
    it('debe mapear correctamente un trabajo de grado con datos completos', () => {
      // Arrange
      userServiceSpy.getAuthorsNames.mockReturnValue('Autor Mokeado');
      userServiceSpy.getUserFullName
        .mockReturnValueOnce('Director Mokeado')
        .mockReturnValueOnce('Codirector Mokeado')
        .mockReturnValueOnce('Asesor Mokeado');

      // Usamos la fábrica y sobrescribimos solo lo necesario
      const mockWork = createMockThesisWork();
      mockWork.state = stateList.EN_DESARROLLO;
      mockWork.preliminaryDraftData!.proposalData.codirector = createMockUser({ id: 'cd1' });
      mockWork.preliminaryDraftData!.proposalData.advisor = createMockUser({ id: 'ad1' });

      // Act
      const result = service.mapToView(mockWork);

      // Assert
      expect(result.id).toBe('tw-1');
      expect(result.title).toBe('Tesis IA');
      expect(result.state).toBe(stateList.EN_DESARROLLO);
      expect(result.participants.authors).toBe('Autor Mokeado');
      expect(userServiceSpy.getUserFullName).toHaveBeenCalledTimes(3);
      expect(result.participants.director).toBe('Director Mokeado');
      expect(result.participants.codirector).toBe('Codirector Mokeado');
      expect(result.participants.advisor).toBe('Asesor Mokeado');
    });

    it('debe usar valores por defecto cuando faltan datos (Null Object Pattern behavior)', () => {
      // Arrange
      const emptyWork = createMockThesisWork({
        thesisWorkId: '',
        preliminaryDraftData: undefined
      });

      // Act
      const result = service.mapToView(emptyWork);

      // Assert
      expect(result.id).toBe('');
      expect(result.title).toBe('Sin título');
      expect(result.description).toBe('Sin descripción disponible.');
      expect(result.modality).toBe('No definida');
      expect(result.mainDocument).toBeNull();
    });
  });

  describe('mapToView() - Extracción de Documento Principal (extractMainDocument)', () => {
    const defaultDescription = 'Resolución original del anteproyecto aprobado';

    it('debe extraer el documento de las evaluaciones del consejo (Prioridad 1)', () => {
      // Arrange
      const mockWork = createMockThesisWork();

      // Evaluation con todas las propiedades requeridas
      mockWork.preliminaryDraftData!.evaluations = [
        {
          id: 'eval-1',
          proposalId: 'prop-1',
          evaluatorId: 'consejo-1',
          evaluatorName: 'Consejo de Facultad',
          evaluatorRole: 'CONSEJO_FACULTAD',
          date: new Date(),
          veredict: stateList.APROBADO,
          observations: 'Aprobado sin novedades',
          signedDocuments: [
            { name: 'resolucion_consejo.pdf', url: 'http://url.com/res.pdf' }
          ]
        }
      ];

      mockWork.preliminaryDraftData!.documents = [
        {
          id: 'doc-1',
          name: 'Ignorado.pdf',
          url: 'http://url.com/falso.pdf',
          type: DocumentType.RESOLUCION,
          uploadDate: new Date()
        }
      ];

      // Act
      const result = service.mapToView(mockWork);

      // Assert
      expect(result.mainDocument).toEqual({
        name: 'resolucion_consejo.pdf',
        url: 'http://url.com/res.pdf',
        description: defaultDescription
      });
    });

    it('debe extraer el documento desde los documentos del anteproyecto (Prioridad 2)', () => {
      // Arrange
      const mockWork = createMockThesisWork();

      // Evaluation con todas las propiedades requeridas
      mockWork.preliminaryDraftData!.evaluations = [
        {
          id: 'eval-1',
          proposalId: 'prop-1',
          evaluatorId: 'jurado-1',
          evaluatorName: 'Jurado',
          evaluatorRole: 'OTRO_ROL',
          date: new Date(),
          veredict: stateList.APROBADO,
          observations: 'Sin observaciones',
          signedDocuments: []
        }
      ];

      mockWork.preliminaryDraftData!.documents = [
        {
          id: 'doc-2',
          name: 'Res Anteproyecto',
          url: 'http://url.com/anteproyecto.pdf',
          type: DocumentType.RESOLUCION,
          uploadDate: new Date()
        }
      ];

      // Act
      const result = service.mapToView(mockWork);

      // Assert
      expect(result.mainDocument).toEqual({
        name: 'Res Anteproyecto',
        url: 'http://url.com/anteproyecto.pdf',
        description: defaultDescription
      });
    });

    it('debe extraer el documento desde los documentos directos del trabajo (Prioridad 3)', () => {
      // Arrange
      const mockWork = createMockThesisWork();

      mockWork.preliminaryDraftData!.evaluations = [];
      mockWork.preliminaryDraftData!.documents = [];

      mockWork.documents = [
        {
          id: 'doc-3',
          name: 'Res Trabajo',
          url: 'http://url.com/trabajo.pdf',
          type: DocumentType.RESOLUCION,
          uploadDate: new Date()
        }
      ];

      // Act
      const result = service.mapToView(mockWork);

      // Assert
      expect(result.mainDocument).toEqual({
        name: 'Res Trabajo',
        url: 'http://url.com/trabajo.pdf',
        description: defaultDescription
      });
    });

    it('debe devolver null si no se encuentra ningún documento de resolución en ninguna parte', () => {
      // Arrange
      const mockWork = createMockThesisWork();

      mockWork.preliminaryDraftData!.evaluations = [];
      mockWork.preliminaryDraftData!.documents = [];
      mockWork.documents = [];

      // Act
      const result = service.mapToView(mockWork);

      // Assert
      expect(result.mainDocument).toBeNull();
    });
  });
});
