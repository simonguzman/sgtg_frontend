import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProposalStorageService } from '../services/proposal-storage.service';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoDePrueba } from '../../../testing/trabajo-grado-de-prueba';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: 1234567890, email: 'test@test.com', state: UserState.active, roles
});

/** Trabajo con otro director (usuario 2) */
const trabajoAjeno = crearTrabajoDePrueba({
  id: 16,
  director: { ...crearTrabajoDePrueba().director, usuarioId: 2, nombreCompleto: 'Otro Director' }
});

describe('Integración [Proposal]: Visibilidad por rol — señal proposals() filtrada', () => {
  let proposalStorage: ProposalStorageService;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    proposalStorage = TestBed.inject(ProposalStorageService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('un rol privilegiado (Comité) ve TODAS las propuestas activas, sin importar participación', () => {
    iniciarSesionConTrabajos(usuario('99', [UserRoleType.DOCENTE, UserRoleType.COMITE]),
      [crearTrabajoDePrueba(), trabajoAjeno]);

    expect(proposalStorage.proposals().map(p => p.id)).toEqual(['15', '16']);
  });

  it('un usuario sin rol privilegiado solo ve las propuestas donde tiene relación real', () => {
    // El Jefe de departamento recibe todos los trabajos, pero la vista de propuestas filtra por participación
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]),
      [crearTrabajoDePrueba(), trabajoAjeno]);

    const visibles = proposalStorage.proposals().map(p => p.id);
    expect(visibles).toContain('15');
    expect(visibles).not.toContain('16');
  });

  it('las propuestas de trabajos cerrados quedan excluidas incluso para un rol privilegiado', () => {
    iniciarSesionConTrabajos(usuario('99', [UserRoleType.ADMINISTRADOR]),
      [crearTrabajoDePrueba({ etapa: 'CANCELADO', motivoCierre: 'CANCELACION_DIRECTOR' })]);

    expect(proposalStorage.proposals()).toEqual([]);
    expect(proposalStorage.allProposals().map(p => p.isArchived)).toEqual([true]);
  });
});
