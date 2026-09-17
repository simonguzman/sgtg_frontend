// src/app/modules/preliminary-draft/integration/preliminary-draft-historical-access.integration.spec.ts
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
import { Modality } from '../../proposal/enums/modality.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Anteproyectos]: Visibilidad para evaluadores históricos (hasEvaluation por evaluatorId)', () => {
  let draftStorage: PreliminaryDraftStorageService;

  const draftId = 'draft-hist-1';
  const oldEvaluatorId = 'evaluator-old-1';
  const newEvaluatorId = 'evaluator-new-1';
  const outsiderId = 'outsider-1';

  async function setupAsUser(userId: string) {
    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftStorageService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: userId }), hasAnyRole: () => false } }
      ]
    });
    const storage = TestBed.inject(PreliminaryDraftStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(storage.isHydrated, injector);
    return storage;
  }

  function seedDraft(): PreliminaryDraft {
    const director = createMockUser({ id: 'dir-hist-1', firstName: 'Director' });
    const proposal: Proposal = {
      id: 'prop-hist-1', title: 'Anteproyecto con historial', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.EN_REVISION, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    return {
      preliminaryDraftId: draftId, proposalId: proposal.id!, proposalData: proposal,
      // Solo el evaluador NUEVO está en evaluators[] — el viejo fue
      // reemplazado en una segunda ronda de asignación (assignReviewersMock
      // reemplaza el arreglo completo, no lo acumula).
      evaluators: [createMockUser({ id: newEvaluatorId, firstName: 'Nuevo' })],
      // Pero su evaluación ORIGINAL sigue en el historial.
      evaluations: [{
        id: 'eval-old-1', proposalId: proposal.id!, documentId: 'doc-v1',
        evaluatorId: oldEvaluatorId, evaluatorName: 'Evaluador Viejo',
        evaluatorRole: 'Evaluador', veredict: stateList.NO_APROBADO,
        observations: 'Requiere correcciones', date: new Date()
      }],
      documents: [], state: stateList.EN_REVISION, createdData: new Date(), isArchived: false
    };
  }

  it('un evaluador reemplazado pero con evaluación previa SÍ debe seguir viendo el anteproyecto', async () => {
    const storage = await setupAsUser(oldEvaluatorId);
    storage.addDraft(seedDraft());

    const visible = storage.preliminaryDrafts();
    expect(visible.some(d => d.preliminaryDraftId === draftId)).toBe(true);
  });

  it('un usuario sin ninguna relación (ni evaluación, ni asignación, ni autoría) NO debe verlo', async () => {
    const storage = await setupAsUser(outsiderId);
    storage.addDraft(seedDraft());

    const visible = storage.preliminaryDrafts();
    expect(visible.some(d => d.preliminaryDraftId === draftId)).toBe(false);
  });

  it('el evaluador actualmente asignado también lo ve, por la vía normal (isAssignedEvaluator)', async () => {
    const storage = await setupAsUser(newEvaluatorId);
    storage.addDraft(seedDraft());

    const visible = storage.preliminaryDrafts();
    expect(visible.some(d => d.preliminaryDraftId === draftId)).toBe(true);
  });
});
