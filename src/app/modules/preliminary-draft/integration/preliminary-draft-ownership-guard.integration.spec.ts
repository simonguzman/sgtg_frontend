// src/app/modules/preliminary-draft/integration/preliminary-draft-ownership-guard.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { preliminaryDraftOwnershipGuard } from '../../../core/guards/preliminary-draft-ownership.guard';
import { PreliminaryDraftStorageService } from '../services/preliminary-draft-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Anteproyectos]: Guard de pertenencia contra storage real', () => {
  let draftStorage: PreliminaryDraftStorageService;
  let routerMock: { createUrlTree: jest.Mock };
  let notificationMock: { show: jest.Mock };
  let authMock: { currentUser: jest.Mock; hasAnyRole: jest.Mock }; // <-- FIX: Creamos el mock mutable aquí
  let injector: Injector;

  const draftId = 'draft-guard-1';
  const directorId = 'dir-guard-1';
  const outsiderId = 'outsider-guard-1';

  const buildRoute = (id: string): ActivatedRouteSnapshot =>
    ({ paramMap: { get: (key: string) => key === 'id' ? id : null } } as unknown as ActivatedRouteSnapshot);

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    routerMock = { createUrlTree: jest.fn((commands: string[]) => ({ __urlTree: true, commands }) as unknown as UrlTree) };
    notificationMock = { show: jest.fn() };

    // Inicializamos el mock con los valores por defecto (el forastero)
    authMock = {
      currentUser: jest.fn().mockReturnValue({ id: outsiderId }),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: Router, useValue: routerMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: AuthService, useValue: authMock } // Inyectamos el mock directamente
      ]
    });

    draftStorage = TestBed.inject(PreliminaryDraftStorageService);
    injector = TestBed.inject(Injector);
    await waitForHydration(draftStorage.isHydrated, injector);

    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const proposal: Proposal = {
      id: 'prop-guard-1', title: 'Anteproyecto protegido', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.EN_REVISION, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const draft: PreliminaryDraft = {
      preliminaryDraftId: draftId, proposalId: proposal.id!, proposalData: proposal,
      evaluators: [], evaluations: [], documents: [],
      state: stateList.EN_REVISION, createdData: new Date(), isArchived: false
    };
    draftStorage.addDraft(draft);
  });

  it('permite el paso al director real del anteproyecto', async () => {
    // <-- FIX: Modificamos el valor de retorno del mock sin usar overrideProvider
    authMock.currentUser.mockReturnValue({ id: directorId });
    authMock.hasAnyRole.mockReturnValue(false);

    const result = await runInInjectionContext(injector, () =>
      preliminaryDraftOwnershipGuard(buildRoute(draftId), {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('bloquea y redirige a un usuario sin relación con el anteproyecto', async () => {
    // No cambiamos el authMock, por lo que usará a "outsiderId" (el default del beforeEach)
    const result = await runInInjectionContext(injector, () =>
      preliminaryDraftOwnershipGuard(buildRoute(draftId), {} as RouterStateSnapshot)
    );
    expect(result).not.toBe(true);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/preliminary-draft']);
    expect(notificationMock.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acceso restringido' }));
  });

  it('permite el paso a un rol privilegiado (Jefe de Departamento) aunque no participe', async () => {
    // <-- FIX: Modificamos el valor de retorno del mock para simular a un jefe
    authMock.currentUser.mockReturnValue({ id: 'jefe-x' });
    authMock.hasAnyRole.mockReturnValue(true);

    const result = await runInInjectionContext(injector, () =>
      preliminaryDraftOwnershipGuard(buildRoute(draftId), {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('deja pasar si el id no existe — el componente maneja "no encontrado"', async () => {
    const result = await runInInjectionContext(injector, () =>
      preliminaryDraftOwnershipGuard(buildRoute('id-inexistente'), {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });
});
