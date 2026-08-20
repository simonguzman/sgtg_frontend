import { TestBed } from '@angular/core/testing';
import { ThesisParticipantsFormatterService } from './thesis-participants-formatter.service';
import { UserService } from '../../users/services/user.service';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../interfaces/sustentation-registry.interface';
import { User } from '../../users/interfaces/user.interface';

describe('ThesisParticipantsFormatterService', () => {
  let service: ThesisParticipantsFormatterService;

  // Tipado explícito de los mocks para evitar el error TS(2339) y mantener 0 'any'
  let userServiceSpy: {
    getAuthorsNames: jest.Mock;
    getUserFullName: jest.Mock;
  };

  // Mocks de datos estructurados rígidamente
  const mockAuthors = [
    { id: 'author-1' } as Partial<User> as User,
    { id: 'author-2' } as Partial<User> as User,
  ];

  // Patrón 'Partial<T> as T' para simular estructuras profundas
  const mockThesisWork = {
    preliminaryDraftData: {
      proposalData: {
        authors: mockAuthors,
        director: { id: 'dir-1' } as Partial<User> as User,
        codirector: { id: 'codir-1' } as Partial<User> as User,
        advisor: { id: 'adv-1' } as Partial<User> as User,
      },
    },
  } as Partial<ThesisWork> as ThesisWork;

  beforeEach(() => {
    // Inicializamos las funciones simuladas
    userServiceSpy = {
      getAuthorsNames: jest.fn(),
      getUserFullName: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisParticipantsFormatterService,
        { provide: UserService, useValue: userServiceSpy },
      ],
    });

    service = TestBed.inject(ThesisParticipantsFormatterService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('getStudentNames', () => {
    it('debe llamar a UserService.getAuthorsNames con los autores si existen', () => {
      userServiceSpy.getAuthorsNames.mockReturnValue('Autor Uno y Autor Dos');

      const result = service.getStudentNames(mockThesisWork);

      expect(userServiceSpy.getAuthorsNames).toHaveBeenCalledWith(mockAuthors);
      expect(result).toBe('Autor Uno y Autor Dos');
    });

    it('debe manejar adecuadamente un thesisWork nulo o indefinido', () => {
      userServiceSpy.getAuthorsNames.mockReturnValue('');

      const resultNull = service.getStudentNames(null);
      const resultUndefined = service.getStudentNames(undefined);

      expect(userServiceSpy.getAuthorsNames).toHaveBeenCalledWith(undefined);
      expect(resultNull).toBe('');
      expect(resultUndefined).toBe('');
    });
  });

  describe('getDirectorName', () => {
    it('debe retornar el nombre completo del director si tiene un ID asignado', () => {
      userServiceSpy.getUserFullName.mockReturnValue('Dr. Director');

      const result = service.getDirectorName(mockThesisWork);

      expect(userServiceSpy.getUserFullName).toHaveBeenCalledWith('dir-1');
      expect(result).toBe('Dr. Director');
    });

    it('debe retornar "No asignado" si no hay director o el thesisWork es nulo', () => {
      const emptyThesis = {} as Partial<ThesisWork> as ThesisWork;

      expect(service.getDirectorName(emptyThesis)).toBe('No asignado');
      expect(service.getDirectorName(null)).toBe('No asignado');
      expect(userServiceSpy.getUserFullName).not.toHaveBeenCalled();
    });
  });

  describe('getCodirectorName & getAdvisorName', () => {
    it('debe retornar el nombre del codirector si existe', () => {
      userServiceSpy.getUserFullName.mockReturnValue('Dr. Codirector');

      const result = service.getCodirectorName(mockThesisWork);

      expect(userServiceSpy.getUserFullName).toHaveBeenCalledWith('codir-1');
      expect(result).toBe('Dr. Codirector');
    });

    it('debe retornar el nombre del asesor si existe', () => {
      userServiceSpy.getUserFullName.mockReturnValue('Mg. Asesor');

      const result = service.getAdvisorName(mockThesisWork);

      expect(userServiceSpy.getUserFullName).toHaveBeenCalledWith('adv-1');
      expect(result).toBe('Mg. Asesor');
    });

    it('debe retornar una cadena vacía si no existen o la tesis es nula', () => {
      expect(service.getCodirectorName(null)).toBe('');
      expect(service.getAdvisorName(null)).toBe('');
    });
  });

  describe('getMemberName', () => {
    it('debe retornar el nombre completo si se provee un ID válido', () => {
      userServiceSpy.getUserFullName.mockReturnValue('Miembro Mock');

      const result = service.getMemberName('member-1');

      expect(userServiceSpy.getUserFullName).toHaveBeenCalledWith('member-1');
      expect(result).toBe('Miembro Mock');
    });

    it('debe retornar una cadena vacía si el ID es undefined', () => {
      expect(service.getMemberName(undefined)).toBe('');
    });
  });

  describe('getAssignedJurors', () => {
    it('debe retornar "No asignados" si el registro de sustentación es nulo o no tiene jurados', () => {
      const emptySustentation = { assignedJurors: [] } as Partial<SustentationRegistry> as SustentationRegistry;

      expect(service.getAssignedJurors(null)).toBe('No asignados');
      expect(service.getAssignedJurors(emptySustentation)).toBe('No asignados');
    });

    it('debe retornar los nombres de los jurados separados por " y " si existen', () => {
      const mockSustentation = {
        assignedJurors: [
          { id: 'juror-1' } as Partial<User> as User,
          { id: 'juror-2' } as Partial<User> as User,
        ],
      } as Partial<SustentationRegistry> as SustentationRegistry;

      // Mockeamos la implementación para que responda dinámicamente según el ID
      userServiceSpy.getUserFullName.mockImplementation((id: string) => {
        if (id === 'juror-1') return 'Jurado Uno';
        if (id === 'juror-2') return 'Jurado Dos';
        return '';
      });

      const result = service.getAssignedJurors(mockSustentation);

      expect(userServiceSpy.getUserFullName).toHaveBeenCalledTimes(2);
      expect(userServiceSpy.getUserFullName).toHaveBeenCalledWith('juror-1');
      expect(userServiceSpy.getUserFullName).toHaveBeenCalledWith('juror-2');
      expect(result).toBe('Jurado Uno y Jurado Dos');
    });
  });
});
