import { TestBed } from '@angular/core/testing';
import { ThesisWorkPageMapperService } from './thesis-work-page-mapper.service';
import { UserService } from '../../../../users/services/user.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { Modality } from '../../../../proposal/enums/modality.enum';

describe('ThesisWorkPageMapperService', () => {
  let service: ThesisWorkPageMapperService;
  let userServiceMock: jest.Mocked<Partial<UserService>>;

  const mockUser: Partial<User> = {
    id: 'u-1',
    firstName: 'Juan',
    secondName: 'Carlos',
    lastName: 'Perez',
    secondLastName: 'Gomez'
  };

  const mockUser2: Partial<User> = {
    id: 'u-2',
    firstName: 'Maria',
    lastName: 'Lopez'
  };

  beforeEach(() => {
    userServiceMock = {
      formatFullName: jest.fn().mockImplementation((user: Partial<User>) => {
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
  });

  describe('Mapeo principal de ThesisWork a TableRow', () => {
    it('debe mapear un ThesisWork completo a ThesisWorkTableRow correctamente', () => {
      // Arrange
      const mockThesisWork: Partial<ThesisWork> = {
        thesisWorkId: 'tw-1',
        state: stateList.EN_DESARROLLO,
        preliminaryDraftData: {
          maximumDeliveryDate: new Date('2026-12-31T00:00:00'),
          proposalData: {
            title: 'Tesis IA',
            modality: Modality.TI,
            description: 'Descripción corta',
            director: mockUser as User,
            authors: [mockUser as User, mockUser2 as User]
          }
        } as ThesisWork['preliminaryDraftData'],
        sustentations: [{ assignedJurors: [mockUser2 as User] }] as ThesisWork['sustentations']
      };

      // Act
      const result = service.mapThesisWorkToTable(
        mockThesisWork as ThesisWork,
        false,
        false,
        'u-1'
      );

      // Assert
      expect(result.id).toBe('tw-1');
      expect(result.title).toBe('Tesis IA');
      expect(result.modality).toBe('Trabajo de investigación');
      expect(result.description).toBe('Descripción corta');
      expect(result.state).toBe(stateList.EN_DESARROLLO);
      expect(result.maxDeliveryDate).toContain('2026');
      expect(userServiceMock.formatFullName).toHaveBeenCalled();
      expect(result.hiddenParticipants).toContain('Juan Carlos Perez Gomez');
      expect(result.hiddenParticipants).toContain('Maria Lopez');
    });

    it('debe retornar "No asignada" y valores por defecto si faltan datos o el estado es EN_REVISION', () => {
      // Arrange
      const emptyWork: Partial<ThesisWork> = {
        thesisWorkId: 'tw-empty',
        state: stateList.EN_REVISION,
        preliminaryDraftData: undefined
      };

      // Act
      const result = service.mapThesisWorkToTable(emptyWork as ThesisWork, false, false, 'u-1');

      // Assert
      expect(result.title).toBe('Sin título');
      expect(result.modality).toBe('No definida');
      expect(result.maxDeliveryDate).toBe('No asignada');
      expect(result.hiddenParticipants).toBe('');
      expect(result.state).toBe(stateList.EN_REVISION);
    });

    it('debe retornar "No asignada" si la fecha máxima es inválida (string corrupto)', () => {
      // Arrange
      const invalidDateWork: Partial<ThesisWork> = {
        preliminaryDraftData: { maximumDeliveryDate: 'fecha-invalida' } as unknown as ThesisWork['preliminaryDraftData']
      };

      // Act
      const result = service.mapThesisWorkToTable(invalidDateWork as ThesisWork, false, false, 'u-1');

      // Assert
      expect(result.maxDeliveryDate).toBe('No asignada');
    });
  });

  describe('Cálculo de acciones permitidas (RBAC)', () => {
    let baseWork: Partial<ThesisWork>;

    beforeEach(() => {
      baseWork = {
        thesisWorkId: 'tw-rbac',
        state: stateList.EN_DESARROLLO,
        preliminaryDraftData: {
          proposalData: {
            director: { id: 'director-id' } as User,
            authors: [{ id: 'student-id' } as User]
          }
        } as ThesisWork['preliminaryDraftData']
      };
    });

    it('debe devolver solo "ver descripción" si no hay usuario logueado', () => {
      const result = service.mapThesisWorkToTable(baseWork as ThesisWork, false, false, undefined);
      expect(result.allowedActions).toEqual(['ver descripción']);
    });

    it('debe permitir "ver" y "editar" si el usuario actual es el director', () => {
      const result = service.mapThesisWorkToTable(baseWork as ThesisWork, false, false, 'director-id');
      expect(result.allowedActions).toEqual(['ver descripción', 'ver', 'editar']);
    });

    it('debe permitir solo "ver descripción" y "ver" si el usuario es un estudiante autor', () => {
      const result = service.mapThesisWorkToTable(baseWork as ThesisWork, false, false, 'student-id');
      expect(result.allowedActions).toEqual(['ver descripción', 'ver']);
    });

    it('debe permitir "ver" y "editar" si el usuario tiene rol de acceso total (Admin) aunque no pertenezca a la tesis', () => {
      const result = service.mapThesisWorkToTable(baseWork as ThesisWork, true, true, 'admin-id');
      expect(result.allowedActions).toEqual(['ver descripción', 'ver', 'editar']);
    });

    it('debe incluir "reactivar" si la tesis está suspendida y el usuario es admin', () => {
      baseWork.state = stateList.SUSPENDIDO;

      const result = service.mapThesisWorkToTable(baseWork as ThesisWork, true, true, 'admin-id');

      expect(result.allowedActions).toContain('reactivar');
      expect(result.allowedActions).toContain('editar');
      expect(result.allowedActions).toContain('ver');
    });

    it('NO debe incluir "reactivar" si la tesis está suspendida pero el usuario NO es admin', () => {
      baseWork.state = stateList.SUSPENDIDO;

      const result = service.mapThesisWorkToTable(baseWork as ThesisWork, false, false, 'director-id');

      expect(result.allowedActions).not.toContain('reactivar');
      expect(result.allowedActions).toContain('editar');
    });
  });
});
