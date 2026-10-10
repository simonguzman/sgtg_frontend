import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { proposalOwnershipGuard } from '../../../core/guards/proposal-ownership.guard';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
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

const buildRoute = (id: string): ActivatedRouteSnapshot => ({
  paramMap: { get: (key: string) => (key === 'id' ? id : null), has: () => true, getAll: () => [], keys: [] }
} as unknown as ActivatedRouteSnapshot);

const routerState = { url: '/dummy-url' } as RouterStateSnapshot;

describe('Integración [Proposal]: Guard de pertenencia contra los trabajos del backend', () => {
  let routerMock: { createUrlTree: jest.Mock<UrlTree, [string[]]> };
  let notificationMock: { show: jest.Mock };
  let injector: Injector;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    routerMock = { createUrlTree: jest.fn((commands: string[]) => ({ fragment: commands.join('/') }) as UrlTree) };
    notificationMock = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    });
    injector = TestBed.inject(Injector);
  });

  afterEach(() => jest.restoreAllMocks());

  const activar = (id: string) => runInInjectionContext(injector, () => proposalOwnershipGuard(buildRoute(id), routerState));

  it('permite el paso al director real de la propuesta', async () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoDePrueba()]);
    expect(await activar('15')).toBe(true);
  });

  it('bloquea y redirige a un usuario sin relación con la propuesta', async () => {
    iniciarSesionConTrabajos(usuario('99', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]), [crearTrabajoDePrueba()]);

    const resultado = await activar('15');

    expect(resultado).not.toBe(true);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/proposal']);
    expect(notificationMock.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acceso restringido' }));
  });

  it('permite el paso a un rol privilegiado (Comité) aunque no participe', async () => {
    iniciarSesionConTrabajos(usuario('99', [UserRoleType.DOCENTE, UserRoleType.COMITE]), [crearTrabajoDePrueba()]);
    expect(await activar('15')).toBe(true);
  });

  it('deja pasar si el id no existe', async () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoDePrueba()]);
    expect(await activar('id-inexistente')).toBe(true);
  });
});
