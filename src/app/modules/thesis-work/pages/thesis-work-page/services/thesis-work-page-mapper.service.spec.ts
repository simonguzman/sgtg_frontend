import { TestBed } from '@angular/core/testing';
import { ThesisWorkPageMapperService } from './thesis-work-page-mapper.service';
import { UserService } from '../../../../users/services/user.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';

interface MockUserService {
  formatFullName: jest.Mock<string, [User]>;
}

const createMockUser = (overrides: Partial<User> = {}): User => {
  const base: Partial<User> = {
    id: 'u-1',
    idType: IdentificationType.CC,
    idNumber: 123456789,
    firstName: 'Juan',
    secondName: 'Carlos',
    lastName: 'Perez',
    secondLastName: 'Gomez',
    codeNumber: 1234567890,
    email: 'juan@test.com',
    password: 'hash',
    state: UserState.active,
    roles: [],
    ...overrides
  };
  return base as User;
};

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
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
      evaluators: [],
      evaluations: [],
      documents: [],
      maximumDeliveryDate: new Date('2026-12-31T00:00:00'),
      proposalData: {
        id: 'prop-1',
        title: 'Tesis IA',
        description: 'Descripción corta',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    } as any
  };
  return { ...baseThesis, ...overrides } as ThesisWork;
};

describe('ThesisWorkPageMapperService', () => {
  let service: ThesisWorkPageMapperService;
  let userServiceMock: MockUserService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    userServiceMock = {
      formatFullName: jest.fn().mockImplementation((user: User) => {
        return [user.firstName, user.secondName, user.lastName, user.secondLastName]
          .filter(Boolean)
          .join(' ');
      })
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkPageMapperService,
        { provide: UserService, useValue: userServiceMock }
      ]
    });

    service = TestBed.inject(ThesisWorkPageMapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Mapeo principal de ThesisWork a TableRow', () => {
    it('debe mapear un ThesisWork completo a ThesisWorkTableRow correctamente', () => {
      const author1 = createMockUser();
      const author2 = createMockUser({ id: 'u-2', firstName: 'Maria', secondName: '', lastName: 'Lopez', secondLastName: '' });

      const mockThesisWork = createMockThesisWork({
        preliminaryDraftData: {
          ...createMockThesisWork().preliminaryDraftData!,
          proposalData: {
            ...createMockThesisWork().preliminaryDraftData!.proposalData,
            authors: [author1, author2]
          }
        },
        sustentations: [{
          id: 'sust-1',
          sustentationDate: new Date(),
          location: 'Aula',
          verdicts: [],
          assignedJurors: [author2]
        }]
      });

      const result = service.mapThesisWorkToTable(mockThesisWork, false, false, false, 'u-1');

      expect(result.id).toBe('tw-1');
      expect(result.title).toBe('Tesis IA');
      expect(result.modality).toBe(Modality.TI);
      expect(result.description).toBe('Descripción corta');
      expect(result.state).toBe(stateList.EN_DESARROLLO);
      expect(result.maxDeliveryDate).toContain('2026');

      expect(userServiceMock.formatFullName).toHaveBeenCalled();
      expect(result.hiddenParticipants).toContain('Juan Carlos Perez Gomez');
      expect(result.hiddenParticipants).toContain('Maria Lopez');
    });

    it('debe retornar "No asignada" y valores por defecto si faltan datos de la propuesta', () => {
      const emptyWork = createMockThesisWork({
        thesisWorkId: 'tw-empty',
        state: stateList.EN_REVISION,
        preliminaryDraftData: undefined
      });

      const result = service.mapThesisWorkToTable(emptyWork, false, false, false, 'u-1');

      expect(result.title).toBe('Sin título');
      expect(result.modality).toBe('No definida');
      expect(result.maxDeliveryDate).toBe('No asignada');
      expect(result.hiddenParticipants).toBe('');
      expect(result.state).toBe(stateList.EN_REVISION);
    });

    it('debe retornar "No asignada" si la fecha máxima es inválida (string corrupto)', () => {
      const invalidDateWork = createMockThesisWork();
      invalidDateWork.preliminaryDraftData!.maximumDeliveryDate = 'fecha-invalida' as any;

      const result = service.mapThesisWorkToTable(invalidDateWork, false, false, false, 'u-1');

      expect(result.maxDeliveryDate).toBe('No asignada');
    });
  });

  describe('Cálculo de acciones permitidas (RBAC) - Reglas de Suspensión', () => {
    let baseWork: ThesisWork;

    beforeEach(() => {
      const director = createMockUser({ id: 'director-id' });
      const student = createMockUser({ id: 'student-id' });

      baseWork = createMockThesisWork({
        thesisWorkId: 'tw-rbac',
        state: stateList.EN_DESARROLLO
      });

      baseWork.preliminaryDraftData!.proposalData.director = director;
      baseWork.preliminaryDraftData!.proposalData.authors = [student];
    });

    it('debe devolver solo "ver descripción" si no hay usuario logueado (currentUserId: undefined)', () => {
      const result = service.mapThesisWorkToTable(baseWork, false, false, false, undefined);
      expect(result.allowedActions).toEqual(['ver descripción']);
    });

    it('debe permitir "ver" y "editar" si el usuario actual es el director en estado normal', () => {
      const result = service.mapThesisWorkToTable(baseWork, false, false, false, 'director-id');
      expect(result.allowedActions).toEqual(['ver descripción', 'ver', 'editar']);
    });

    it('debe permitir solo "ver descripción" y "ver" si el usuario es un estudiante autor', () => {
      const result = service.mapThesisWorkToTable(baseWork, false, false, false, 'student-id');
      expect(result.allowedActions).toEqual(['ver descripción', 'ver']);
    });

    it('debe OCULTAR "ver" pero mantener "editar" y agregar "reactivar" para el Administrador si está suspendido', () => {
      baseWork.state = stateList.SUSPENDIDO;

      const result = service.mapThesisWorkToTable(baseWork, true, true, false, 'admin-id');

      expect(result.allowedActions).toContain('ver descripción');
      expect(result.allowedActions).toContain('editar');
      expect(result.allowedActions).toContain('reactivar');
      expect(result.allowedActions).not.toContain('ver');
    });

    it('debe OCULTAR "ver" y agregar "reactivar" para el Consejo (no es owner ni admin) si está suspendido', () => {
      baseWork.state = stateList.SUSPENDIDO;

      const result = service.mapThesisWorkToTable(baseWork, true, false, true, 'consejo-id');

      expect(result.allowedActions).toContain('ver descripción');
      expect(result.allowedActions).toContain('reactivar');
      expect(result.allowedActions).not.toContain('ver');
      expect(result.allowedActions).not.toContain('editar');
    });

    it('debe OCULTAR "ver" al propio director y NO agregar "reactivar" si está suspendido', () => {
      baseWork.state = stateList.SUSPENDIDO;

      const result = service.mapThesisWorkToTable(baseWork, false, false, false, 'director-id');

      expect(result.allowedActions).toContain('ver descripción');
      expect(result.allowedActions).toContain('editar');
      expect(result.allowedActions).not.toContain('ver');
      expect(result.allowedActions).not.toContain('reactivar');
    });
  });
});
