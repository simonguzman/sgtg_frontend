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

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '', secondName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);

describe('Integración [Anteproyectos]: Guard de pertenencia contra storage real', () => {
  let draftStorage: PreliminaryDraftStorageService;

  let routerMock: { createUrlTree: jest.Mock<UrlTree, [string[]]> };
  let notificationMock: { show: jest.Mock };
  let authMock: { currentUser: jest.Mock; hasAnyRole: jest.Mock };
  let injector: Injector;

  const draftId = 'draft-guard-1';
  const directorId = 'dir-guard-1';
  const outsiderId = 'outsider-guard-1';

  const buildRoute = (id: string): ActivatedRouteSnapshot => {
    const mockRoute: Partial<ActivatedRouteSnapshot> = {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
        has: () => true,
        getAll: () => [],
        keys: []
      }
    };
    return mockRoute as ActivatedRouteSnapshot;
  };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    routerMock = {
      createUrlTree: jest.fn((commands: string[]) => {
        const mockTree: Partial<UrlTree> = { fragment: commands.join('/') };
        return mockTree as UrlTree;
      })
    };

    notificationMock = { show: jest.fn() };

    authMock = {
      currentUser: jest.fn().mockReturnValue({ id: outsiderId }),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: Router, useValue: routerMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: AuthService, useValue: authMock }
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
    authMock.currentUser.mockReturnValue({ id: directorId });
    authMock.hasAnyRole.mockReturnValue(false);

    const result = await runInInjectionContext(injector, () =>
      preliminaryDraftOwnershipGuard(buildRoute(draftId), {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
  });

  it('bloquea y redirige a un usuario sin relación con el anteproyecto', async () => {
    const result = await runInInjectionContext(injector, () =>
      preliminaryDraftOwnershipGuard(buildRoute(draftId), {} as RouterStateSnapshot)
    );
    expect(result).not.toBe(true);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/preliminary-draft']);
    expect(notificationMock.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acceso restringido' }));
  });

  it('permite el paso a un rol privilegiado (Jefe de Departamento) aunque no participe', async () => {
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
