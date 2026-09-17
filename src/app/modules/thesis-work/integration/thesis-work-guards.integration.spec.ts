// src/app/modules/thesis-work/integration/thesis-work-guards.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { thesisWorkOwnershipGuard } from '../../../core/guards/thesis-work-ownership.guard';
import { thesisRestrictedStatusGuard, thesisSuspendedViewGuard } from '../../../core/guards/thesis-status.guard';
import { ThesisWorkStorageService } from '../services/thesis-work-storage.service';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { PreliminaryDraftApiService } from '../../preliminary-draft/services/preliminary-draft-api.service';
import { PreliminaryDraftAssignmentService } from '../../preliminary-draft/services/preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService } from '../../preliminary-draft/services/preliminary-draft-document.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';

import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Trabajo de Grado]: Guards de pertenencia y estado contra storage real', () => {
  let thesisStorage: ThesisWorkStorageService;
  let injector: Injector;
  let routerMock: { createUrlTree: jest.Mock };
  let notificationMock: { show: jest.Mock };
  let authServiceMock: { currentUser: jest.Mock; hasAnyRole: jest.Mock }; // Agregado objeto mutable

  const thesisId = 'thesis-guard-1';
  const directorId = 'dir-1';
  const outsiderId = 'outsider-1';

  const buildRoute = (id: string): ActivatedRouteSnapshot =>
    ({ paramMap: { get: (key: string) => key === 'id' ? id : null }, parent: null } as unknown as ActivatedRouteSnapshot);

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    routerMock = {
      createUrlTree: jest.fn((commands: string[]) => ({ __urlTree: true, commands }) as unknown as UrlTree)
    };
    notificationMock = { show: jest.fn() };

    // Objeto mock que podemos modificar libremente sin usar overrideProvider
    authServiceMock = {
      currentUser: jest.fn().mockReturnValue({ id: outsiderId }),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkStorageService,
        PreliminaryDraftStorageService, PreliminaryDraftService, PreliminaryDraftApiService,
        PreliminaryDraftAssignmentService, PreliminaryDraftDocumentService,
        ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        { provide: Router, useValue: routerMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: AuthService, useValue: authServiceMock } // Inyectamos el mock mutable
      ]
    });

    thesisStorage = TestBed.inject(ThesisWorkStorageService);
    injector = TestBed.inject(Injector);
    await waitForHydration(thesisStorage.isHydrated, injector);

    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const proposal: Proposal = {
      id: 'prop-guard-1', title: 'Tesis protegida', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const draft: PreliminaryDraft = {
      preliminaryDraftId: 'draft-guard-1', proposalId: proposal.id!, proposalData: proposal,
      evaluators: [], evaluations: [], documents: [],
      state: stateList.APROBADO, createdData: new Date(), isArchived: false
    };
    const thesisWork: ThesisWork = {
      thesisWorkId: thesisId, preliminaryDraftId: draft.preliminaryDraftId!, preliminaryDraftData: draft,
      createdDate: new Date(), state: stateList.EN_DESARROLLO,
      advances: [], evaluations: [], finalDeliveries: [], documents: [],
      sustentations: [], pazYSalvos: [], specialRequests: [], isArchived: false
    };
    thesisStorage['_thesisWorksList'].set([thesisWork]);
  });

  describe('thesisWorkOwnershipGuard', () => {
    it('permite el paso al director real del trabajo de grado', async () => {
      // Modificamos el mock directamente en lugar de usar overrideProvider
      authServiceMock.currentUser.mockReturnValue({ id: directorId });
      authServiceMock.hasAnyRole.mockReturnValue(false);

      const result = await runInInjectionContext(injector, () =>
        thesisWorkOwnershipGuard(buildRoute(thesisId), {} as RouterStateSnapshot)
      );
      expect(result).toBe(true);
    });

    it('bloquea y redirige a un usuario sin ninguna relación con el trabajo', async () => {
      const result = await runInInjectionContext(injector, () =>
        thesisWorkOwnershipGuard(buildRoute(thesisId), {} as RouterStateSnapshot)
      );
      expect(result).not.toBe(true);
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/thesis-work']);
      expect(notificationMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Acceso restringido' })
      );
    });

    it('permite el paso a un rol privilegiado (Consejo) aunque no participe en el trabajo', async () => {
      authServiceMock.currentUser.mockReturnValue({ id: 'consejo-x' });
      authServiceMock.hasAnyRole.mockReturnValue(true);

      const result = await runInInjectionContext(injector, () =>
        thesisWorkOwnershipGuard(buildRoute(thesisId), {} as RouterStateSnapshot)
      );
      expect(result).toBe(true);
    });

    it('deja pasar si el id no existe (el componente maneja "no encontrado")', async () => {
      const result = await runInInjectionContext(injector, () =>
        thesisWorkOwnershipGuard(buildRoute('id-inexistente'), {} as RouterStateSnapshot)
      );
      expect(result).toBe(true);
    });
  });

  describe('thesisRestrictedStatusGuard', () => {
    it('bloquea si el trabajo está SUSPENDIDO', async () => {
      thesisStorage.updateWork(thesisId, w => ({ ...w, state: stateList.SUSPENDIDO }));
      const result = await runInInjectionContext(injector, () =>
        thesisRestrictedStatusGuard(buildRoute(thesisId), {} as RouterStateSnapshot)
      );
      expect(result).not.toBe(true);
    });

    it('bloquea si el trabajo está CANCELADO, usando allThesisWorks() y no la señal filtrada', async () => {
      thesisStorage.updateWork(thesisId, w => ({ ...w, state: stateList.CANCELADO }));
      expect(thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId)?.isArchived).toBe(true);

      const result = await runInInjectionContext(injector, () =>
        thesisRestrictedStatusGuard(buildRoute(thesisId), {} as RouterStateSnapshot)
      );
      expect(result).not.toBe(true);
    });

    it('permite el paso si el trabajo está EN_DESARROLLO', async () => {
      const result = await runInInjectionContext(injector, () =>
        thesisRestrictedStatusGuard(buildRoute(thesisId), {} as RouterStateSnapshot)
      );
      expect(result).toBe(true);
    });
  });

  describe('thesisSuspendedViewGuard', () => {
    it('bloquea la visualización si está SUSPENDIDO', async () => {
      thesisStorage.updateWork(thesisId, w => ({ ...w, state: stateList.SUSPENDIDO }));
      const result = await runInInjectionContext(injector, () =>
        thesisSuspendedViewGuard(buildRoute(thesisId), {} as RouterStateSnapshot)
      );
      expect(result).not.toBe(true);
    });

    it('NO bloquea si está CANCELADO — un registro archivado sigue siendo consultable en Historial', async () => {
      thesisStorage.updateWork(thesisId, w => ({ ...w, state: stateList.CANCELADO }));
      const result = await runInInjectionContext(injector, () =>
        thesisSuspendedViewGuard(buildRoute(thesisId), {} as RouterStateSnapshot)
      );
      expect(result).toBe(true);
    });
  });
});
