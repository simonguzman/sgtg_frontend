import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoEnAnteproyecto, crearTrabajoEnCurso } from '../../../testing/trabajo-grado-de-prueba';

/** Trabajo de grado cerrado (cancelado) cuyo director es el usuario 1 */
const trabajoCerrado = crearTrabajoEnAnteproyecto({ etapa: 'CANCELADO', motivoCierre: 'CANCELACION_DIRECTOR' });

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);

describe('Integración [Historial]: Filtrado real de pertenencia y cálculo de plazo sobre datos archivados', () => {
  let proposalsTab: ArchivedProposalsTabService;
  let draftsTab: ArchivedPreliminaryDraftsTabService;
  let proposalStorage: ProposalStorageService;
  let draftStorage: PreliminaryDraftStorageService;
  const ownerId = '1';
  const outsiderId = 'outsider-1';
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        // UserService (real) consulta el backend: se simula el cliente HTTP
        provideHttpClient(),
        provideHttpClientTesting(),
        ArchivedProposalsTabService, ArchivedPreliminaryDraftsTabService,
        ProposalService, ProposalStorageService, ProposalApiService, ProposalRulesService,
        PreliminaryDraftService, PreliminaryDraftStorageService, PreliminaryDraftApiService,
        PreliminaryDraftAssignmentService, PreliminaryDraftDocumentService,
        UserService, UserStorageService, UserApiService, EventBusService,
        { provide: AuthService, useValue: { currentUser: () => createMockUser({ id: outsiderId }), hasAnyRole: () => false } }
      ]
    });
    proposalsTab = TestBed.inject(ArchivedProposalsTabService);
    draftsTab = TestBed.inject(ArchivedPreliminaryDraftsTabService);
    proposalStorage = TestBed.inject(ProposalStorageService);
    draftStorage = TestBed.inject(PreliminaryDraftStorageService);
    localStorage.clear();
  });
  it('un usuario sin ninguna relación NO debe ver una propuesta archivada, sin recurrir a hasGlobalAccess', () => {
    // Trabajo cerrado del director 1, cargado por un administrador
    iniciarSesionConTrabajos(createMockUser({ id: '99', roles: [UserRoleType.ADMINISTRADOR] }), [trabajoCerrado]);
    const context: HistoryEvaluationContext = { currentUser: createMockUser({ id: outsiderId }), hasGlobalAccess: false };
    expect(proposalsTab.getTableData(context).some(r => r['id'] === '15')).toBe(false);
  });
  it('el director real de la propuesta SÍ debe verla, aunque esté archivada y sin acceso global', () => {
    iniciarSesionConTrabajos(createMockUser({ id: ownerId, roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR] }), [trabajoCerrado]);
    const context: HistoryEvaluationContext = { currentUser: createMockUser({ id: ownerId }), hasGlobalAccess: false };
    expect(proposalsTab.getTableData(context).some(r => r['id'] === '15')).toBe(true);
  });
  it('el anteproyecto de un trabajo cerrado se ve en el historial con el plazo de la versión vigente', () => {
    // Anteproyecto con dos versiones: la 1 con correcciones y la 2 aprobada; el trabajo se canceló después
    const base = crearTrabajoEnCurso();
    const trabajo = crearTrabajoEnCurso({
      etapa: 'CANCELADO',
      motivoCierre: 'CANCELACION_DIRECTOR',
      anteproyecto: {
        ...base.anteproyecto,
        versiones: [
          { ...base.anteproyecto.versiones[0], estado: 'CON_CORRECCIONES' },
          { ...base.anteproyecto.versiones[0], ruta: '15/ANTEPROYECTO/v2/anteproyecto.pdf', version: 2, estado: 'APROBADO' }
        ],
        conceptos: base.anteproyecto.conceptos.map(concepto => ({ ...concepto, version: 2 }))
      }
    });
    iniciarSesionConTrabajos(createMockUser({ id: ownerId, roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR] }), [trabajo]);

    const context: HistoryEvaluationContext = { currentUser: createMockUser({ id: ownerId }), hasGlobalAccess: false };
    const row = draftsTab.getTableData(context).find(r => r['id'] === '15');
    expect(row).toBeDefined();
    expect(row?.['deadlineStatus']).toContain('Resolución emitida');
  });
});
