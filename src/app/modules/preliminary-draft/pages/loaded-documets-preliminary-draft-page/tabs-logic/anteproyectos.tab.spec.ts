import { AnteproyectosTabConfig } from './anteproyectos.tab';
import { PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { User } from '../../../../users/interfaces/user.interface';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  firstName: 'Juan',
  lastName: 'Perez',
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Mock Proposal',
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: '1',
  proposalId: 'prop-1',
  proposalData: createMockProposal(),
  evaluators: [],
  evaluations: [],
  documents: [],
  state: stateList.EN_REVISION,
  createdData: new Date(),
  isArchived: false,
  ...overrides
} as PreliminaryDraft);

const createMockContext = (overrides: Partial<PreliminaryDraftEvaluationContext> = {}): PreliminaryDraftEvaluationContext => ({
  preliminaryDraft: createMockPreliminaryDraft(),
  currentUser: createMockUser(),
  isAdmin: false,
  isJefe: false,
  isDirector: false,
  isAssignedEvaluator: false,
  isConsejoMember: false,
  totalEvaluatorsCount: 2,
  latestAnteproyectoId: 'doc-1',
  ...overrides
});

describe('AnteproyectosTabConfig', () => {
  let mockContext: PreliminaryDraftEvaluationContext;
  // La pestaña de anteproyectos usa el estado que envía el backend: no necesita el servicio
  const servicio = {} as PreliminaryDraftService;

  const version = (id: string, numero: number, status: stateList): FileDocument => ({
    id, name: `anteproyecto-v${numero}`, url: `/archivos/${id}`, uploadDate: '09 - 03 - 2026',
    type: DocumentType.ANTEPROYECTO, version: numero, status
  });
  const resolucion: FileDocument = { id: 'res', name: 'resolucion', url: '/archivos/res', uploadDate: '10 - 03 - 2026',
    type: DocumentType.RESOLUCION };

  beforeEach(() => {
    mockContext = createMockContext();
  });

  describe('getTableData', () => {
    it('muestra las versiones de la más reciente a la más antigua con el estado de cada una', () => {
      const documentos = [version('doc-1', 1, stateList.NO_APROBADO), resolucion,
        version('doc-2', 2, stateList.EN_REVISION)];

      const result = AnteproyectosTabConfig.getTableData(documentos, { ...mockContext, latestAnteproyectoId: 'doc-2' }, servicio);

      expect(result.map(fila => [fila.id, fila.version, fila.status])).toEqual([
        ['doc-2', 2, stateList.EN_REVISION],
        ['doc-1', 1, stateList.NO_APROBADO]
      ]);
    });

    it('muestra la fecha de carga legible (no el texto crudo de la fecha)', () => {
      const conFecha = { ...version('doc-1', 1, stateList.EN_REVISION), uploadDate: new Date(2026, 9, 24) };
      expect(AnteproyectosTabConfig.getTableData([conFecha], mockContext, servicio)[0].uploadDate).toBe('24 - 10 - 2026');
    });

    it('el evaluador asignado evalúa solo la versión vigente que está en revisión', () => {
      const documentos = [version('doc-1', 1, stateList.NO_APROBADO), version('doc-2', 2, stateList.EN_REVISION)];

      const result = AnteproyectosTabConfig.getTableData(documentos,
        { ...mockContext, isAssignedEvaluator: true, latestAnteproyectoId: 'doc-2' }, servicio);

      expect(result[0].allowedActions).toEqual(['download', 'evaluate']);
      expect(result[1].allowedActions).toEqual(['download']);
    });

    it('no evalúa quien no es evaluador asignado, ni quien ya conceptuó la versión', () => {
      const documentos = [version('doc-1', 1, stateList.EN_REVISION)];
      expect(AnteproyectosTabConfig.getTableData(documentos, { ...mockContext, isAdmin: true }, servicio)[0].allowedActions)
        .toEqual(['download']);

      const evaluation = { documentId: 'doc-1', evaluatorId: 'u1' } as Evaluation;
      const yaConcepto = createMockContext({
        isAssignedEvaluator: true,
        preliminaryDraft: createMockPreliminaryDraft({ evaluations: [evaluation] })
      });
      expect(AnteproyectosTabConfig.getTableData(documentos, yaConcepto, servicio)[0].allowedActions).toEqual(['download']);
    });

    it('una versión con correcciones o aprobada ya no se evalúa', () => {
      const documentos = [version('doc-1', 1, stateList.APROBADO)];
      expect(AnteproyectosTabConfig.getTableData(documentos, { ...mockContext, isAssignedEvaluator: true }, servicio)[0].allowedActions)
        .toEqual(['download']);
    });
  });

  describe('getHeaderButtons', () => {
    it('el Jefe asigna evaluadores si aún no hay', () => {
      const result = AnteproyectosTabConfig.getHeaderButtons({ ...mockContext, isJefe: true, totalEvaluatorsCount: 0 }, servicio);
      expect(result).toEqual([expect.objectContaining({ action: 'assign_evaluators', disabled: false })]);
    });

    it('si ya hay evaluadores el botón del Jefe queda deshabilitado', () => {
      const result = AnteproyectosTabConfig.getHeaderButtons({ ...mockContext, isJefe: true, totalEvaluatorsCount: 2 }, servicio);
      expect(result).toEqual([expect.objectContaining({ label: 'Evaluadores ya asignados', disabled: true })]);
    });

    it('un anteproyecto archivado no tiene acciones', () => {
      mockContext.preliminaryDraft.isArchived = true;
      expect(AnteproyectosTabConfig.getHeaderButtons({ ...mockContext, isJefe: true }, servicio)).toHaveLength(0);
    });

    it.each([
      [stateList.EN_REVISION, true],
      [stateList.APROBADO, true],
      [stateList.NO_APROBADO, false]
    ])('el director corrige según el estado de la versión vigente (%s → deshabilitado %s)', (estado, deshabilitado) => {
      const preliminaryDraft = createMockPreliminaryDraft({
        documents: [version('doc-1', 1, stateList.NO_APROBADO), version('doc-2', 2, estado)]
      });
      const result = AnteproyectosTabConfig.getHeaderButtons({ ...mockContext, isDirector: true, preliminaryDraft }, servicio);
      expect(result).toEqual([expect.objectContaining({ action: 'upload_document', disabled: deshabilitado })]);
    });
  });
});
