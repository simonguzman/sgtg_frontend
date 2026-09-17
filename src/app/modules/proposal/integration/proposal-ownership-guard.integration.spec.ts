// src/app/modules/proposal/integration/proposal-ownership-guard.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { proposalOwnershipGuard } from '../../../core/guards/proposal-ownership.guard';
import { ProposalStorageService } from '../services/proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';

import { Proposal } from '../interfaces/proposal.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { Modality } from '../enums/modality.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Proposal]: Guard de pertenencia contra storage real', () => {
  let proposalStorage: ProposalStorageService;
  let routerMock: { createUrlTree: jest.Mock };
  let notificationMock: { show: jest.Mock };
  let authMock: { currentUser: jest.Mock; hasAnyRole: jest.Mock }; // <-- Mock mutable
  let injector: Injector;

  const proposalId = 'prop-guard-1';
  const directorId = 'dir-guard-1';
  const outsiderId = 'outsider-guard-1';

  const buildRoute = (id: string): ActivatedRouteSnapshot =>
    ({ paramMap: { get: (key: string) => key === 'id' ? id : null } } as unknown as ActivatedRouteSnapshot);

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    routerMock = { createUrlTree: jest.fn((commands: string[]) => ({ __urlTree: true, commands }) as unknown as UrlTree) };
    notificationMock = { show: jest.fn() };

    // Inicializamos el mock con los valores por defecto
    authMock = {
      currentUser: jest.fn().mockReturnValue({ id: outsiderId }),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        ProposalStorageService, UserService, UserStorageService,
        { provide: Router, useValue: routerMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: AuthService, useValue: authMock } // Inyectamos el mock directamente
      ]
    });

    proposalStorage = TestBed.inject(ProposalStorageService);
    injector = TestBed.inject(Injector);
    await waitForHydration(proposalStorage.isHydrated, injector);

    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const proposal: Proposal = {
      id: proposalId, title: 'Propuesta protegida', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.EN_REVISION, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    proposalStorage.updateProposals(() => [proposal]);
  });

  it('permite el paso al director real de la propuesta', async () => {
    // Cambiamos el valor sin usar overrideProvider
    authMock.currentUser.mockReturnValue({ id: directorId });
    authMock.hasAnyRole.mockReturnValue(false);

    const result = await runInInjectionContext(injector, () =>
      proposalOwnershipGuard(buildRoute(proposalId), {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('bloquea y redirige a un usuario sin relación con la propuesta', async () => {
    // Usa los valores por defecto de outsiderId
    const result = await runInInjectionContext(injector, () =>
      proposalOwnershipGuard(buildRoute(proposalId), {} as RouterStateSnapshot)
    );
    expect(result).not.toBe(true);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/proposal']);
    expect(notificationMock.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acceso restringido' }));
  });

  it('permite el paso a un rol privilegiado (Comité) aunque no participe', async () => {
    // Simulamos un miembro del comité
    authMock.currentUser.mockReturnValue({ id: 'comite-x' });
    authMock.hasAnyRole.mockReturnValue(true);

    const result = await runInInjectionContext(injector, () =>
      proposalOwnershipGuard(buildRoute(proposalId), {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('deja pasar si el id no existe', async () => {
    const result = await runInInjectionContext(injector, () =>
      proposalOwnershipGuard(buildRoute('id-inexistente'), {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });
});
