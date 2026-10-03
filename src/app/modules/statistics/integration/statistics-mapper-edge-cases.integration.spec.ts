import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { ProjectDataMapperService } from '../services/project-data-mapper.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { UserFormatterService } from '../../users/services/user-formatter.service';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
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

describe('Integración [Estadísticas]: Casos límite del ProjectDataMapperService con UserService real', () => {
  let mapper: ProjectDataMapperService;
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [ProjectDataMapperService, UserService, UserStorageService, UserApiService, UserFormatterService]
    });
    mapper = TestBed.inject(ProjectDataMapperService);
  });
  it('debe mostrar "Sin Asignar" con el UserService real cuando la propuesta no tiene director', () => {
    const proposalPartial: Partial<Proposal> = {
      id: 'prop-no-dir', title: 'Sin director', description: '', modality: Modality.TI,
      authors: [],
      director: undefined,
      state: stateList.EN_REVISION, createdAt: new Date('2026-01-01'),
      documents: [], evaluations: [], isArchived: false
    };
    const proposal = proposalPartial as Proposal;
    const mapped = mapper.mapProposal(proposal);
    expect(mapped.directorName).toBe('Sin Asignar');
    expect(mapped.directorId).toBe('sin-director');
  });
  it('no debe confundir un Formato_C recién subido con el documento de anteproyecto al calcular deadlineStatus', () => {
    const proposalDataPartial: Partial<Proposal> = {
      id: 'prop-edge-1', title: 'Anteproyecto', description: '', modality: Modality.TI,
      authors: [],
      director: createMockUser({ id: 'dir-edge-1' }),
      state: stateList.NO_APROBADO, createdAt: new Date('2026-01-01'), documents: [], evaluations: []
    };
    const proposalData = proposalDataPartial as Proposal;
    const draftPartial: Partial<PreliminaryDraft> = {
      preliminaryDraftId: 'draft-edge-1',
      proposalId: 'prop-edge-1',
      proposalData: proposalData,
      evaluators: [],
      documents: [
        { id: 'doc-formato-c', name: 'Presentación', url: 'data:x', uploadDate: new Date(), type: DocumentType.FORMATO_C, status: stateList.EN_REVISION },
        { id: 'doc-anteproyecto', name: 'Anteproyecto', url: 'data:x', uploadDate: new Date(), type: DocumentType.ANTEPROYECTO, status: stateList.NO_APROBADO }
      ],
      evaluations: [{
        id: 'eval-edge-1', proposalId: 'prop-edge-1', documentId: 'doc-anteproyecto', evaluatorId: 'ev-1',
        evaluatorName: 'Evaluador', evaluatorRole: 'Evaluador', veredict: stateList.NO_APROBADO,
        observations: '', date: new Date(), deadlineStatus: EvaluationDeadlineStatus.DELAYED
      }],
      state: stateList.NO_APROBADO, createdData: new Date('2026-01-01'), isArchived: false
    };
    const draft = draftPartial as PreliminaryDraft;
    const mapped = mapper.mapPreliminaryDraft(draft);
    expect(mapped.deadlineStatus).toBe(EvaluationDeadlineStatus.DELAYED);
  });
});
