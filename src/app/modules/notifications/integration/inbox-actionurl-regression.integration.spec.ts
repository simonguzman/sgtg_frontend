import 'fake-indexeddb/auto';
import { INBOX_MESSAGE_BUILDERS } from '../services/inbox-message-builders';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { InboxEventContext } from '../pages/notifications-page/models/inbox-event-context.model';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createContext = (overrides: Partial<InboxEventContext>): InboxEventContext => {
  return overrides as InboxEventContext;
};

describe('Regresión [Notifications]: actionUrl correctos en INBOX_MESSAGE_BUILDERS', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('PROPOSAL_CORRECTION_UPLOADED debe apuntar a loaded_proposals, no a la página base de solo lectura', () => {
    const context = createContext({ proposalId: 'prop-1', proposalTitle: 'Test' });
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.PROPOSAL_CORRECTION_UPLOADED](context);
    expect(msg.actionUrl).toBe('/proposal/details/prop-1/loaded_proposals');
  });
  it('SPECIAL_REQUEST_CREATED debe apuntar a loaded_documents, donde vive la pestaña de solicitudes', () => {
    const context = createContext({
      thesisId: 'thesis-1',
      thesisTitle: 'Test',
      payload: { type: 'Suspensión' }
    });
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.SPECIAL_REQUEST_CREATED](context);
    expect(msg.actionUrl).toBe('/thesis-work/details/thesis-1/loaded_documents');
  });
  it('SPECIAL_REQUEST_RESOLVED debe apuntar a loaded_documents, mismo criterio que CREATED', () => {
    const context = createContext({
      thesisId: 'thesis-1',
      thesisTitle: 'Test',
      payload: { status: 'Aprobado' }
    });
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.SPECIAL_REQUEST_RESOLVED](context);
    expect(msg.actionUrl).toBe('/thesis-work/details/thesis-1/loaded_documents');
  });
  it('PRELIMINARY_DRAFT_CORRECTION_UPLOADED (ya correcto) sigue intacto', () => {
    const context = createContext({ draftId: 'draft-1', draftTitle: 'Test' });
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED](context);
    expect(msg.actionUrl).toBe('/preliminary-draft/details/draft-1/loaded_documents');
  });
  it('THESIS_REACTIVATED (agregado hace varios turnos, faltaba en el switch original) genera un builder válido', () => {
    const context = createContext({ thesisId: 'thesis-1', thesisTitle: 'Test' });
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.THESIS_REACTIVATED](context);
    expect(msg).toBeDefined();
    expect(msg.actionUrl).toBe('/thesis-work/details/thesis-1');
  });
});
