import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProposalRulesService } from '../services/proposal-rules.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoDePrueba } from '../../../testing/trabajo-grado-de-prueba';

const usuario = (overrides: Partial<User>): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Juan', lastName: 'Perez',
  secondLastName: '', codeNumber: 1234567890, email: 'juan@test.com', state: UserState.active, roles: [], ...overrides
});

describe('Integración [Proposal]: Reglas de Negocio y Límite de Estudiantes', () => {
  let rulesService: ProposalRulesService;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    rulesService = TestBed.inject(ProposalRulesService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('debe bloquear una propuesta si un docente es Director y Codirector simultáneamente', () => {
    const docente = usuario({ id: 'doc-100' });
    const errorMsg = rulesService.validateProposalRules({ director: docente, codirector: docente } as Proposal);

    expect(errorMsg).toBe('Un docente no puede ser Director y Codirector simultáneamente.');
  });

  it('debe bloquear el registro si un estudiante ya tiene 2 trabajos de grado en el backend', () => {
    // La estudiante 10 (Eva) participa en los trabajos 15 y 16
    iniciarSesionConTrabajos(usuario({ id: '99', roles: [UserRoleType.COMITE] }),
      [crearTrabajoDePrueba(), crearTrabajoDePrueba({ id: 16 })]);
    TestBed.inject(UserStorageService).updateUsersList(() => [usuario({ id: '10', firstName: 'Eva', lastName: 'Estudiante' })]);

    const errorMsg = rulesService.validateProposalRules({ title: 'Tercera', authors: [usuario({ id: '10' })] } as Proposal);

    expect(errorMsg).toContain('El estudiante Eva Estudiante ya tiene 2 propuestas registradas');
  });

  it('no cuenta la propuesta que se está editando', () => {
    iniciarSesionConTrabajos(usuario({ id: '99', roles: [UserRoleType.COMITE] }),
      [crearTrabajoDePrueba(), crearTrabajoDePrueba({ id: 16 })]);

    const errorMsg = rulesService.validateProposalRules({ id: '15', authors: [usuario({ id: '10' })] } as Proposal);

    expect(errorMsg).toBeNull();
  });
});
