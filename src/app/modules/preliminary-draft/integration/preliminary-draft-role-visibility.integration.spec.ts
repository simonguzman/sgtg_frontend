import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';
import { PreliminaryDraftStorageService } from '../services/preliminary-draft-storage.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);

describe('Integración [Anteproyectos]: Visibilidad por rol — señal preliminaryDrafts() filtrada', () => {
  let draftStorage: PreliminaryDraftStorageService;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  function buildDraft(id: string, director: User, isArchived = false): PreliminaryDraft {
    const proposalPartial: Partial<Proposal> = {
      id: `prop-${id}`, title: `Anteproyecto ${id}`, description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.EN_REVISION, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const proposal = proposalPartial as Proposal;

    const draftPartial: Partial<PreliminaryDraft> = {
      preliminaryDraftId: id, proposalId: proposal.id!, proposalData: proposal,
      evaluators: [], evaluations: [], documents: [],
      state: stateList.EN_REVISION, createdData: new Date(), isArchived
    };
    return draftPartial as PreliminaryDraft;
  }

  it('un rol privilegiado (Comité) ve TODOS los anteproyectos activos, sin importar participación', async () => {
    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: AuthService, useValue: { currentUser: () => createMockUser({ id: 'comite-1' }), hasAnyRole: () => true } }
      ]
    });
    draftStorage = TestBed.inject(PreliminaryDraftStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(draftStorage.isHydrated, injector);

    const directorA = createMockUser({ id: 'dir-vis-a' });
    const directorB = createMockUser({ id: 'dir-vis-b' });
    draftStorage.addDraft(buildDraft('draft-vis-a', directorA));
    draftStorage.addDraft(buildDraft('draft-vis-b', directorB));

    const visible = draftStorage.preliminaryDrafts();
    expect(visible.map(d => d.preliminaryDraftId)).toEqual(expect.arrayContaining(['draft-vis-a', 'draft-vis-b']));
  });

  it('un usuario sin rol privilegiado solo ve los anteproyectos donde tiene relación real', async () => {
    const ownDirectorId = 'dir-vis-own';
    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: AuthService, useValue: { currentUser: () => createMockUser({ id: ownDirectorId }), hasAnyRole: () => false } }
      ]
    });
    draftStorage = TestBed.inject(PreliminaryDraftStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(draftStorage.isHydrated, injector);

    const ownDirector = createMockUser({ id: ownDirectorId });
    const otherDirector = createMockUser({ id: 'dir-vis-other' });
    draftStorage.addDraft(buildDraft('draft-vis-own', ownDirector));
    draftStorage.addDraft(buildDraft('draft-vis-other', otherDirector));

    const visible = draftStorage.preliminaryDrafts();
    expect(visible.some(d => d.preliminaryDraftId === 'draft-vis-own')).toBe(true);
    expect(visible.some(d => d.preliminaryDraftId === 'draft-vis-other')).toBe(false);
  });

  it('los anteproyectos archivados quedan excluidos incluso para un rol privilegiado', async () => {
    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: AuthService, useValue: { currentUser: () => createMockUser({ id: 'consejo-1' }), hasAnyRole: () => true } }
      ]
    });
    draftStorage = TestBed.inject(PreliminaryDraftStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(draftStorage.isHydrated, injector);

    const director = createMockUser({ id: 'dir-vis-archived' });
    draftStorage.addDraft(buildDraft('draft-vis-archived', director, true));

    expect(draftStorage.preliminaryDrafts().some(d => d.preliminaryDraftId === 'draft-vis-archived')).toBe(false);
    expect(draftStorage.allPreliminaryDrafts().some(d => d.preliminaryDraftId === 'draft-vis-archived')).toBe(true);
  });
});
