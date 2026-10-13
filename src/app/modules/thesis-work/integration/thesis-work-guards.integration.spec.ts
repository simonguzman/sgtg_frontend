import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { thesisWorkOwnershipGuard } from '../../../core/guards/thesis-work-ownership.guard';
import { thesisCanceledGuard, thesisRestrictedStatusGuard } from '../../../core/guards/thesis-status.guard';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoEnCurso } from '../../../testing/trabajo-grado-de-prueba';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: 1234567890, email: 'test@test.com', state: UserState.active, roles
});

const directora = usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]);

const buildRoute = (id: string): ActivatedRouteSnapshot => ({
  paramMap: { get: (key: string) => (key === 'id' ? id : null), has: () => true, getAll: () => [], keys: [] }
} as unknown as ActivatedRouteSnapshot);

const routerState = { url: '/dummy-url' } as RouterStateSnapshot;

describe('Integración [Trabajo de Grado]: Guards contra los trabajos del backend', () => {
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

  const activar = (guard: CanActivateFn, id = '15') =>
    runInInjectionContext(injector, () => guard(buildRoute(id), routerState));

  describe('thesisWorkOwnershipGuard', () => {
    it('permite el paso a la directora del trabajo', async () => {
      iniciarSesionConTrabajos(directora, [crearTrabajoEnCurso()]);
      expect(await activar(thesisWorkOwnershipGuard)).toBe(true);
    });

    it('permite el paso a la estudiante del trabajo', async () => {
      iniciarSesionConTrabajos(usuario('10', [UserRoleType.ESTUDIANTE]), [crearTrabajoEnCurso()]);
      expect(await activar(thesisWorkOwnershipGuard)).toBe(true);
    });

    it('bloquea y redirige a un usuario sin relación con el trabajo', async () => {
      iniciarSesionConTrabajos(usuario('99', [UserRoleType.DOCENTE]), [crearTrabajoEnCurso()]);

      expect(await activar(thesisWorkOwnershipGuard)).not.toBe(true);
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/thesis-work']);
      expect(notificationMock.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acceso restringido' }));
    });

    it('permite el paso al Consejo aunque no participe', async () => {
      iniciarSesionConTrabajos(usuario('50', [UserRoleType.CONSEJO]), [crearTrabajoEnCurso()]);
      expect(await activar(thesisWorkOwnershipGuard)).toBe(true);
    });

    it('deja pasar si el trabajo no existe (la página muestra "no encontrado")', async () => {
      iniciarSesionConTrabajos(directora, [crearTrabajoEnCurso()]);
      expect(await activar(thesisWorkOwnershipGuard, '99')).toBe(true);
    });
  });

  describe('thesisRestrictedStatusGuard (acciones del trabajo)', () => {
    it('bloquea las acciones si el trabajo está suspendido', async () => {
      iniciarSesionConTrabajos(directora, [crearTrabajoEnCurso({ etapa: 'SUSPENDIDO' })]);

      expect(await activar(thesisRestrictedStatusGuard)).not.toBe(true);
      expect(notificationMock.show).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Suspendido')
      }));
    });

    it('bloquea las acciones si el trabajo está cancelado (aunque esté fuera de la lista activa)', async () => {
      iniciarSesionConTrabajos(directora, [crearTrabajoEnCurso({ etapa: 'CANCELADO' })]);
      expect(await activar(thesisRestrictedStatusGuard)).not.toBe(true);
    });

    it('permite las acciones en curso', async () => {
      iniciarSesionConTrabajos(directora, [crearTrabajoEnCurso()]);
      expect(await activar(thesisRestrictedStatusGuard)).toBe(true);
    });
  });

  describe('thesisCanceledGuard (registro de solicitudes)', () => {
    it('permite registrar la reanudación de un trabajo suspendido', async () => {
      iniciarSesionConTrabajos(directora, [crearTrabajoEnCurso({ etapa: 'SUSPENDIDO' })]);
      expect(await activar(thesisCanceledGuard)).toBe(true);
    });

    it('bloquea si el trabajo está cancelado', async () => {
      iniciarSesionConTrabajos(directora, [crearTrabajoEnCurso({ etapa: 'CANCELADO' })]);

      expect(await activar(thesisCanceledGuard)).not.toBe(true);
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/thesis-work']);
    });
  });
});
