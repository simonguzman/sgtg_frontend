import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

// Servicios reales a evaluar
import { ProposalRulesService } from '../services/proposal-rules.service';
import { ProposalStorageService } from '../services/proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';

// Modelos y Enums
import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';
import { stateList } from '../../../core/enums/state.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

describe('Integración [Proposal]: Reglas de Negocio y Límite de Estudiantes', () => {
  let rulesService: ProposalRulesService;
  let proposalStorage: ProposalStorageService;
  let userStorage: UserStorageService;
  let injector: Injector;

  beforeEach(async () => {
    // Silenciamos los logs de error previstos para no ensuciar la consola
    jest.spyOn(console, 'error').mockImplementation((msg) => {
      if (typeof msg === 'string' && msg.includes('Error leyendo propuestas')) return;
      if (typeof msg === 'string' && msg.includes('Error construyendo datos iniciales')) return;
    });

    TestBed.configureTestingModule({
      providers: [
        ProposalRulesService,
        ProposalStorageService,
        UserService,
        UserStorageService
      ]
    });

    rulesService = TestBed.inject(ProposalRulesService);
    proposalStorage = TestBed.inject(ProposalStorageService);
    userStorage = TestBed.inject(UserStorageService);
    injector = TestBed.inject(Injector);

    // 🔥 FIX DE HIDRATACIÓN: Esperamos a que la base de datos asíncrona termine de montar
    if (!proposalStorage.isHydrated()) {
      await firstValueFrom(
        toObservable(proposalStorage.isHydrated, { injector }).pipe(filter(v => v), take(1))
      );
    }

    // Sembramos datos básicos para evitar errores de referencias faltantes
    const defaultMockUser = createMockUser({ id: 'user-001', firstName: 'Estudiante', lastName: 'Base' });
    userStorage.updateUsersList(() => [defaultMockUser]);
    proposalStorage.updateProposals(() => []);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe bloquear una propuesta si un docente es Director y Codirector simultáneamente', () => {
    // Arrange
    const sameTeacher = createMockUser({ id: 'doc-100', firstName: 'Carlos', lastName: 'Gomez' });

    const invalidProposal: Partial<Proposal> = {
      title: 'Propuesta Inválida',
      director: sameTeacher,
      codirector: sameTeacher
    };

    // Act
    const errorMsg = rulesService.validateProposalRules(invalidProposal);

    // Assert
    expect(errorMsg).toBe('Un docente no puede ser Director y Codirector simultáneamente.');
  });

  it('debe bloquear el registro si un estudiante ya alcanzó el límite de 2 propuestas activas', () => {
    // Arrange: Creamos un estudiante y dos directores
    const student = createMockUser({ id: 'student-001', firstName: 'Ana', lastName: 'Perez' });
    const director1 = createMockUser({ id: 'doc-dir-1', firstName: 'Director', lastName: 'Uno' });
    const director2 = createMockUser({ id: 'doc-dir-2', firstName: 'Director', lastName: 'Dos' });

    const existingProposals: Proposal[] = [
      {
        id: 'prop-prev-1',
        title: 'Propuesta Uno',
        description: 'Desc 1',
        modality: Modality.TI,
        authors: [student],
        director: director1,
        state: stateList.EN_REVISION,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      },
      {
        id: 'prop-prev-2',
        title: 'Propuesta Dos',
        description: 'Desc 2',
        modality: Modality.PP,
        authors: [student],
        director: director2,
        state: stateList.APROBADO_CON_OBSERVACIONES,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    ];

    proposalStorage.updateProposals(() => existingProposals);
    userStorage.updateUsersList(() => [student, director1, director2]);

    // Act: Intentamos registrar la TERCERA propuesta
    const thirdProposal: Partial<Proposal> = {
      id: 'prop-new',
      title: 'Propuesta Tres',
      authors: [student]
    };
    const errorMsg = rulesService.validateProposalRules(thirdProposal);

    // Assert
    expect(errorMsg).toContain('El estudiante Ana Perez ya tiene 2 propuestas registradas');
  });
});
