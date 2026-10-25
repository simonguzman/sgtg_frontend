import { PresentacionesTabConfig } from './presentaciones.tab';
import { PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
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
  latestPresentacionId: 'doc-presentacion-1',
  latestAnteproyectoId: 'doc-anteproyecto-1',
  ...overrides
});

const createMockDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-presentacion-1',
  name: 'presentacion.pdf',
  url: 'http://localhost/pres.pdf',
  uploadDate: new Date(),
  type: DocumentType.FORMATO_C,
  ...overrides
} as FileDocument);

describe('PresentacionesTabConfig', () => {
  // La pestaña usa los estados que envía el backend: no necesita el servicio
  const servicio = {} as PreliminaryDraftService;

  const anteproyecto = (version: number, status: stateList): FileDocument => createMockDocument({
    id: `ante-v${version}`, type: DocumentType.ANTEPROYECTO, version, status
  });
  const remision = (version: number, status: stateList): FileDocument => createMockDocument({
    id: `remision-v${version}`, type: DocumentType.FORMATO_C, version, status
  });

  describe('getTableData', () => {
    it('muestra las remisiones de la más reciente a la más antigua con su estado', () => {
      const documentos = [anteproyecto(1, stateList.NO_APROBADO), remision(1, stateList.NO_APROBADO),
        remision(2, stateList.EN_REVISION)];

      const result = PresentacionesTabConfig.getTableData(documentos,
        createMockContext({ latestPresentacionId: 'remision-v2' }), servicio);

      expect(result.map(fila => [fila.id, fila.version, fila.status])).toEqual([
        ['remision-v2', 2, stateList.EN_REVISION],
        ['remision-v1', 1, stateList.NO_APROBADO]
      ]);
      const conFecha = { ...remision(1, stateList.EN_REVISION), uploadDate: new Date(2026, 9, 24) };
      expect(PresentacionesTabConfig.getTableData([conFecha], createMockContext(), servicio)[0].uploadDate)
        .toBe('24 - 10 - 2026');
    });

    it('solo el Consejo evalúa la remisión vigente mientras está en revisión', () => {
      const documentos = [remision(1, stateList.EN_REVISION)];
      const contexto = (overrides: Partial<PreliminaryDraftEvaluationContext>) =>
        createMockContext({ latestPresentacionId: 'remision-v1', ...overrides });

      expect(PresentacionesTabConfig.getTableData(documentos, contexto({ isConsejoMember: true }), servicio)[0].allowedActions)
        .toEqual(['download', 'evaluate-presentation']);
      expect(PresentacionesTabConfig.getTableData(documentos, contexto({ isAdmin: true }), servicio)[0].allowedActions)
        .toEqual(['download']);
      expect(PresentacionesTabConfig.getTableData([remision(1, stateList.APROBADO)],
        contexto({ isConsejoMember: true }), servicio)[0].allowedActions).toEqual(['download']);
    });
  });

  describe('getHeaderButtons', () => {
    const conDocumentos = (state: stateList, ...documents: FileDocument[]) =>
      createMockContext({ isJefe: true, preliminaryDraft: createMockPreliminaryDraft({ state, documents }) });

    it('el Jefe remite cuando ambos evaluadores aprobaron la versión vigente y aún no se remite', () => {
      const result = PresentacionesTabConfig.getHeaderButtons(
        conDocumentos(stateList.EVALUADO, anteproyecto(1, stateList.APROBADO)), servicio);
      expect(result).toEqual([expect.objectContaining({ action: 'upload_document', disabled: false })]);
    });

    it('no se remite una versión ya remitida, ni una que siga en revisión', () => {
      expect(PresentacionesTabConfig.getHeaderButtons(conDocumentos(stateList.EVALUADO,
        anteproyecto(1, stateList.APROBADO), remision(1, stateList.EN_REVISION)), servicio)[0].disabled).toBe(true);
      expect(PresentacionesTabConfig.getHeaderButtons(conDocumentos(stateList.EN_REVISION,
        anteproyecto(1, stateList.EN_REVISION)), servicio)[0].disabled).toBe(true);
    });

    it('tras un NO APROBADO, la nueva versión aprobada se remite de nuevo', () => {
      const result = PresentacionesTabConfig.getHeaderButtons(conDocumentos(stateList.EVALUADO,
        anteproyecto(1, stateList.NO_APROBADO), remision(1, stateList.NO_APROBADO), anteproyecto(2, stateList.APROBADO)),
        servicio);
      expect(result[0].disabled).toBe(false);
    });

    it('otros roles o un anteproyecto archivado no tienen el botón', () => {
      expect(PresentacionesTabConfig.getHeaderButtons(createMockContext({ isAdmin: true }), servicio)).toEqual([]);
      const archivado = createMockContext({ isJefe: true, preliminaryDraft: createMockPreliminaryDraft({ isArchived: true }) });
      expect(PresentacionesTabConfig.getHeaderButtons(archivado, servicio)).toEqual([]);
    });
  });
});
