// src/app/modules/proposal/integration/proposal-role-visibility.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { ProposalStorageService } from '../services/proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';

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

describe('Integración [Proposal]: Visibilidad por rol — señal proposals() filtrada', () => {
  let proposalStorage: ProposalStorageService;

  function buildProposal(id: string, director: User, isArchived = false): Proposal {
    return {
      id, title: `Propuesta ${id}`, description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.EN_REVISION, createdAt: new Date(),
      documents: [], evaluations: [], isArchived
    };
  }

  it('un rol privilegiado (Comité) ve TODAS las propuestas activas, sin importar participación', async () => {
    TestBed.configureTestingModule({
      providers: [
        ProposalStorageService, UserService, UserStorageService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'comite-1' }), hasAnyRole: () => true } }
      ]
    });
    proposalStorage = TestBed.inject(ProposalStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(proposalStorage.isHydrated, injector);

    const directorA = createMockUser({ id: 'dir-vis-a' });
    const directorB = createMockUser({ id: 'dir-vis-b' });
    proposalStorage.updateProposals(() => [buildProposal('prop-vis-a', directorA), buildProposal('prop-vis-b', directorB)]);

    const visible = proposalStorage.proposals();
    expect(visible.map(p => p.id)).toEqual(expect.arrayContaining(['prop-vis-a', 'prop-vis-b']));
  });

  it('un usuario sin rol privilegiado solo ve las propuestas donde tiene relación real', async () => {
    const ownDirectorId = 'dir-vis-own';
    TestBed.configureTestingModule({
      providers: [
        ProposalStorageService, UserService, UserStorageService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: ownDirectorId }), hasAnyRole: () => false } }
      ]
    });
    proposalStorage = TestBed.inject(ProposalStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(proposalStorage.isHydrated, injector);

    const ownDirector = createMockUser({ id: ownDirectorId });
    const otherDirector = createMockUser({ id: 'dir-vis-other' });
    proposalStorage.updateProposals(() => [buildProposal('prop-vis-own', ownDirector), buildProposal('prop-vis-other', otherDirector)]);

    const visible = proposalStorage.proposals();
    expect(visible.some(p => p.id === 'prop-vis-own')).toBe(true);
    expect(visible.some(p => p.id === 'prop-vis-other')).toBe(false);
  });

  it('las propuestas archivadas quedan excluidas incluso para un rol privilegiado', async () => {
    TestBed.configureTestingModule({
      providers: [
        ProposalStorageService, UserService, UserStorageService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'consejo-1' }), hasAnyRole: () => true } }
      ]
    });
    proposalStorage = TestBed.inject(ProposalStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(proposalStorage.isHydrated, injector);

    const director = createMockUser({ id: 'dir-vis-archived' });
    proposalStorage.updateProposals(() => [buildProposal('prop-vis-archived', director, true)]);

    expect(proposalStorage.proposals().some(p => p.id === 'prop-vis-archived')).toBe(false);
    expect(proposalStorage.allProposals().some(p => p.id === 'prop-vis-archived')).toBe(true);
  });
});
