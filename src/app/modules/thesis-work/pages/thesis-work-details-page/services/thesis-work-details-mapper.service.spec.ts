import { TestBed } from '@angular/core/testing';
import { ThesisWorkDetailsMapperService } from './thesis-work-details-mapper.service';
import { UserService } from '../../../../users/services/user.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

describe('ThesisWorkDetailsMapperService', () => {
  let service: ThesisWorkDetailsMapperService;
  let userServiceSpy: jest.Mocked<UserService>;

  beforeEach(() => {
    const spy = {
      getAuthorsNames: jest.fn(),
      getUserFullName: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkDetailsMapperService,
        { provide: UserService, useValue: spy }
      ]
    });

    service = TestBed.inject(ThesisWorkDetailsMapperService);
    userServiceSpy = TestBed.inject(UserService) as jest.Mocked<UserService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mapToView() - Mapeo general', () => {
    it('debe mapear correctamente un trabajo de grado con datos completos', () => {
      // Arrange
      userServiceSpy.getAuthorsNames.mockReturnValue('Autor Mokeado');
      userServiceSpy.getUserFullName
        .mockReturnValueOnce('Director Mokeado')
        .mockReturnValueOnce('Codirector Mokeado')
        .mockReturnValueOnce('Asesor Mokeado');

      // Se usa 'as unknown as ThesisWork' en la raíz para evitar tener que llenar
      // todos los campos obligatorios anidados (como createdAt, evaluations, etc.)
      // que no influyen en esta prueba específica. Cero "any".
      const mockWork = {
        thesisWorkId: 'tw-1',
        state: 'EN_PROGRESO',
        preliminaryDraftData: {
          proposalData: {
            title: 'Tesis IA',
            description: 'Uso de IA',
            modality: Modality.TI,
            authors: [{ id: 'a1' }],
            director: { id: 'd1' },
            codirector: { id: 'cd1' },
            advisor: { id: 'ad1' }
          }
        }
      } as unknown as ThesisWork;

      // Act
      const result = service.mapToView(mockWork);

      // Assert
      expect(result.id).toBe('tw-1');
      expect(result.title).toBe('Tesis IA');
      expect(result.state).toBe('EN_PROGRESO');
      expect(result.participants.authors).toBe('Autor Mokeado');
      expect(userServiceSpy.getUserFullName).toHaveBeenCalledTimes(3);
      expect(result.participants.director).toBe('Director Mokeado');
      expect(result.participants.codirector).toBe('Codirector Mokeado');
      expect(result.participants.advisor).toBe('Asesor Mokeado');
    });

    it('debe usar valores por defecto cuando faltan datos (Null Object Pattern behavior)', () => {
      // Arrange
      const emptyWork = {} as unknown as ThesisWork;

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
      const mockWork = {
        preliminaryDraftData: {
          evaluations: [
            {
              evaluatorRole: 'CONSEJO_FACULTAD',
              signedDocuments: [
                { name: 'resolucion_consejo.pdf', url: 'http://url.com/res.pdf' }
              ]
            }
          ],
          documents: [
            { type: DocumentType.RESOLUCION, url: 'http://url.com/falso.pdf', name: 'Ignorado' }
          ]
        }
      } as unknown as ThesisWork;

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
      const mockWork = {
        preliminaryDraftData: {
          evaluations: [
            { evaluatorRole: 'OTRO_ROL', signedDocuments: [] }
          ],
          documents: [
            { type: DocumentType.RESOLUCION, url: 'http://url.com/anteproyecto.pdf', name: 'Res Anteproyecto' }
          ]
        }
      } as unknown as ThesisWork;

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
      const mockWork = {
        preliminaryDraftData: {
          evaluations: [],
          documents: []
        },
        documents: [
          { type: DocumentType.RESOLUCION, url: 'http://url.com/trabajo.pdf', name: 'Res Trabajo' }
        ]
      } as unknown as ThesisWork;

      // Act
      const result = service.mapToView(mockWork);

      // Assert
      expect(result.mainDocument).toEqual({
        name: 'Res Trabajo',
        url: 'http://url.com/trabajo.pdf',
        description: defaultDescription
      });
    });

    it('debe devolver null si no se encuentra ningún documento de resolución', () => {
      // Arrange
      // Para simular un tipo de documento distinto sin usar 'any' ni inventar propiedades
      // en el enum, forzamos un string a actuar como el tipo DocumentType
      const mockWork = {
        preliminaryDraftData: {
          evaluations: [],
          documents: [
            { type: 'OTRO_TIPO_INVALIDO' as unknown as DocumentType, url: 'http://url.com/otro.pdf', name: 'Otro Documento' }
          ]
        },
        documents: []
      } as unknown as ThesisWork;

      // Act
      const result = service.mapToView(mockWork);

      // Assert
      expect(result.mainDocument).toBeNull();
    });
  });
});
