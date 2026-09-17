// src/app/modules/history/integration/history-domain-visibility.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { ArchivedProposalsTabService } from '../pages/history-page/services/archived-proposals-tab.service';
import { ArchivedPreliminaryDraftsTabService } from '../pages/history-page/services/archived-preliminary-drafts-tab.service';

import { ProposalService } from '../../proposal/services/proposal.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';
import { ProposalApiService } from '../../proposal/services/proposal-api.service';
import { ProposalRulesService } from '../../proposal/services/proposal-rules.service';

import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { PreliminaryDraftApiService } from '../../preliminary-draft/services/preliminary-draft-api.service';
import { PreliminaryDraftAssignmentService } from '../../preliminary-draft/services/preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService } from '../../preliminary-draft/services/preliminary-draft-document.service';

import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { HistoryEvaluationContext } from '../interfaces/history-evaluation-context.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Historial]: Filtrado real de pertenencia y cálculo de plazo sobre datos archivados', () => {
  let proposalsTab: ArchivedProposalsTabService;
  let draftsTab: ArchivedPreliminaryDraftsTabService;
  let proposalStorage: ProposalStorageService;
  let draftStorage: PreliminaryDraftStorageService;

  const ownerId = 'owner-1';
  const outsiderId = 'outsider-1';

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        ArchivedProposalsTabService, ArchivedPreliminaryDraftsTabService,
        ProposalService, ProposalStorageService, ProposalApiService, ProposalRulesService,
        PreliminaryDraftService, PreliminaryDraftStorageService, PreliminaryDraftApiService,
        PreliminaryDraftAssignmentService, PreliminaryDraftDocumentService,
        UserService, UserStorageService, UserApiService, EventBusService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: outsiderId }), hasAnyRole: () => false } }
      ]
    });

    proposalsTab = TestBed.inject(ArchivedProposalsTabService);
    draftsTab = TestBed.inject(ArchivedPreliminaryDraftsTabService);
    proposalStorage = TestBed.inject(ProposalStorageService);
    draftStorage = TestBed.inject(PreliminaryDraftStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(proposalStorage.isHydrated, injector);
    await waitForHydration(draftStorage.isHydrated, injector);
  });

  it('un usuario sin ninguna relación NO debe ver una propuesta archivada, sin recurrir a hasGlobalAccess', () => {
    const owner = createMockUser({ id: ownerId, firstName: 'Dueño' });
    const archivedProposal: Proposal = {
      id: 'prop-hist-1', title: 'Propuesta archivada', description: 'desc', modality: Modality.TI,
      authors: [], director: owner, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: true
    };
    proposalStorage.updateProposals(() => [archivedProposal]);

    const context: HistoryEvaluationContext = { currentUser: { id: outsiderId } as User, hasGlobalAccess: false };
    expect(proposalsTab.getTableData(context).some(r => r['id'] === 'prop-hist-1')).toBe(false);
  });

  it('el director real de la propuesta SÍ debe verla, aunque esté archivada y sin acceso global', () => {
    const owner = createMockUser({ id: ownerId, firstName: 'Dueño' });
    const archivedProposal: Proposal = {
      id: 'prop-hist-2', title: 'Propuesta del dueño', description: 'desc', modality: Modality.TI,
      authors: [], director: owner, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: true
    };
    proposalStorage.updateProposals(() => [archivedProposal]);

    const context: HistoryEvaluationContext = { currentUser: { id: ownerId } as User, hasGlobalAccess: false };
    expect(proposalsTab.getTableData(context).some(r => r['id'] === 'prop-hist-2')).toBe(true);
  });

  it('debe elegir el documentId correcto por tipo (Anteproyecto/Corrección), no por índice, para calcular el plazo real', () => {
    const owner = createMockUser({ id: ownerId, firstName: 'Dueño' });
    const draft: PreliminaryDraft = {
      preliminaryDraftId: 'draft-hist-1', proposalId: 'prop-x',
      proposalData: {
        id: 'prop-x', title: 'Anteproyecto', description: '', modality: Modality.TI,
        authors: [], director: owner, state: stateList.APROBADO, createdAt: new Date(), documents: [], evaluations: []
      },
      evaluators: [],
      evaluations: [{
        id: 'eval-hist-2', proposalId: 'prop-x', documentId: 'doc-anteproyecto-1', evaluatorId: 'ev-1',
        evaluatorName: 'Evaluador', evaluatorRole: 'Evaluador', veredict: stateList.NO_APROBADO,
        observations: 'x', date: new Date(), deadlineStatus: EvaluationDeadlineStatus.ON_TIME
      }],
      // Reproduce el escenario real del bug: FORMATO_C subido DESPUÉS de
      // la última corrección, quedando primero en el arreglo — sin el
      // filtro por tipo, documents[0] habría sido este, no el correcto.
      documents: [
        { id: 'doc-formato-c-1', name: 'Presentación', url: 'data:x', uploadDate: new Date(), type: DocumentType.FORMATO_C, status: stateList.EN_REVISION },
        { id: 'doc-anteproyecto-1', name: 'Anteproyecto', url: 'data:x', uploadDate: new Date(), type: DocumentType.ANTEPROYECTO, status: stateList.NO_APROBADO }
      ],
      state: stateList.NO_APROBADO, createdData: new Date(), isArchived: true
    };
    draftStorage.addDraft(draft);

    const context: HistoryEvaluationContext = { currentUser: { id: ownerId } as User, hasGlobalAccess: false };
    const row = draftsTab.getTableData(context).find(r => r['id'] === 'draft-hist-1');

    // Con el bug (buscando por índice), la evaluación nunca se
    // encontraría y el label caería al genérico "Resolución emitida"
    // sin paréntesis. Con el fix, incluye el estado real entre paréntesis.
    expect(row?.['deadlineStatus']).toContain('Resolución emitida');
    expect(row?.['deadlineStatus']).not.toBe('Resolución emitida');
  });
});
