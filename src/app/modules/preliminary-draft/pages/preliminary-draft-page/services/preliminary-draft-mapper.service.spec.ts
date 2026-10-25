import { TestBed } from '@angular/core/testing';
import { PreliminaryDraftMapperService } from './preliminary-draft-mapper.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default-id',
  firstName: 'Nombre',
  lastName: 'Apellido',
  roles: [],
  ...overrides
} as User);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => {
  const base: Partial<PreliminaryDraft> = {
    preliminaryDraftId: 'draft-default-id',
    state: stateList.EN_REVISION,
    evaluators: [],
    documents: [],
    evaluations: [],
    proposalData: undefined,
    ...overrides
  };
  return base as PreliminaryDraft;
};

type ProposalData = NonNullable<PreliminaryDraft['proposalData']>;
const createMockProposalData = (overrides: Partial<ProposalData> = {}): ProposalData => ({
  id: 'prop-default-id',
  title: 'Default Title',
  description: 'Default Desc',
  modality: Modality.TI,
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  authors: [],
  ...overrides
} as ProposalData);

describe('PreliminaryDraftMapperService', () => {
  let service: PreliminaryDraftMapperService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [PreliminaryDraftMapperService]
    });
    service = TestBed.inject(PreliminaryDraftMapperService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debería mapear correctamente un PreliminaryDraft a PreliminaryDraftTableRow', () => {
    const mockDraft = createMockDraft({
      preliminaryDraftId: '123',
      state: stateList.EN_REVISION,
      proposalData: createMockProposalData({
        title: 'Test Title',
        modality: Modality.TI,
        description: 'Test Desc'
      })
    });

    const result = service.mapPreliminaryDraftToTable(mockDraft, true, true, 'user-1');

    expect(result.id).toBe('123');
    expect(result.title).toBe('Test Title');
    expect(result.modality).toBe(Modality.TI);
    expect(result.description).toBe('Test Desc');
    expect(result.state).toBe(stateList.EN_REVISION);
  });

  it('debería calcular las acciones permitidas correctamente para un Administrador', () => {
    const mockDraft = createMockDraft({ state: stateList.EN_REVISION });

    // @ts-expect-error Acceso intencional a método privado para testing de caja blanca
    const allowed = service.calculateAllowedActions(mockDraft, true, true, 'admin-1');

    // Solo el director anula
    expect(allowed).toEqual(['ver descripción', 'ver', 'editar']);
  });

  it('el director puede anular mientras el anteproyecto no esté aprobado', () => {
    const director = createMockUser({ id: 'dir-1' });
    const enRevision = createMockDraft({ state: stateList.EN_REVISION,
      proposalData: createMockProposalData({ director }) });
    const aprobado = createMockDraft({ state: stateList.APROBADO, proposalData: createMockProposalData({ director }) });

    // @ts-expect-error Acceso intencional a método privado para testing de caja blanca
    expect(service.calculateAllowedActions(enRevision, false, false, 'dir-1')).toEqual(
      ['ver descripción', 'ver', 'editar', 'anular']);
    // @ts-expect-error Acceso intencional a método privado para testing de caja blanca
    expect(service.calculateAllowedActions(aprobado, false, false, 'dir-1')).toEqual(['ver descripción', 'ver']);
  });

  it('debería restringir acciones si el usuario no tiene relación con el anteproyecto', () => {
    const mockDraft = createMockDraft({
      state: stateList.EN_REVISION,
      proposalData: createMockProposalData({
        authors: [createMockUser({ id: 'student-1' })]
      })
    });

    // @ts-expect-error Acceso intencional a método privado para testing de caja blanca
    const allowed = service.calculateAllowedActions(mockDraft, false, false, 'user-x');

    expect(allowed).toEqual(['ver descripción']);
  });

  it('debería extraer y concatenar los participantes ocultos correctamente', () => {
    const mockDraft = createMockDraft({
      proposalData: createMockProposalData({
        director: createMockUser({ firstName: 'Juan', lastName: 'Perez' }),
        authors: [createMockUser({ firstName: 'Maria', lastName: 'Gomez' })]
      })
    });

    // @ts-expect-error Acceso intencional a método privado para testing de caja blanca
    const result = service.buildHiddenParticipants(mockDraft);

    expect(result).toContain('Juan Perez');
    expect(result).toContain('Maria Gomez');
  });
  it('el plazo es el de la versión vigente: una versión corregida vuelve a contar los días de los evaluadores', () => {
    const v1 = { id: 'v1', name: 'Anteproyecto', url: '/v1', uploadDate: new Date(2026, 2, 2), type: DocumentType.ANTEPROYECTO,
      version: 1, status: stateList.APROBADO_CON_OBSERVACIONES };
    const v2 = { ...v1, id: 'v2', url: '/v2', version: 2, status: stateList.EN_REVISION };
    const evaluador = (id: string) => ({ id, evaluatorId: id, documentId: 'v1', veredict: stateList.APROBADO_CON_OBSERVACIONES }) as Evaluation;
    const draft = createMockDraft({
      evaluators: [createMockUser({ id: 'e1' }), createMockUser({ id: 'e2' })],
      documents: [v1, v2],
      evaluations: [evaluador('e1'), evaluador('e2')],
      evaluationDeadline: new Date(2026, 3, 1),
      evaluationRemainingDays: 7
    });

    // Los conceptos de la versión 1 no cuentan para la ronda de la versión 2
    expect(service.mapPreliminaryDraftToTable(draft, false, false, 'user-1').remainingTime).toBe('Quedan 7 días hábiles');
  });
});
