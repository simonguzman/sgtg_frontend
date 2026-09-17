// src/app/modules/notifications/integration/inbox-actionurl-regression.integration.spec.ts
import { INBOX_MESSAGE_BUILDERS } from '../services/inbox-message-builders';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { InboxEventContext } from '../pages/notifications-page/models/inbox-event-context.model';

describe('Regresión [Notifications]: actionUrl correctos en INBOX_MESSAGE_BUILDERS', () => {
  it('PROPOSAL_CORRECTION_UPLOADED debe apuntar a loaded_proposals, no a la página base de solo lectura', () => {
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.PROPOSAL_CORRECTION_UPLOADED](
      { proposalId: 'prop-1', proposalTitle: 'Test' } as InboxEventContext
    );
    expect(msg.actionUrl).toBe('/proposal/details/prop-1/loaded_proposals');
  });

  it('SPECIAL_REQUEST_CREATED debe apuntar a loaded_documents, donde vive la pestaña de solicitudes', () => {
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.SPECIAL_REQUEST_CREATED](
      { thesisId: 'thesis-1', thesisTitle: 'Test', payload: { type: 'Suspensión' } } as InboxEventContext
    );
    expect(msg.actionUrl).toBe('/thesis-work/details/thesis-1/loaded_documents');
  });

  it('SPECIAL_REQUEST_RESOLVED debe apuntar a loaded_documents, mismo criterio que CREATED', () => {
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.SPECIAL_REQUEST_RESOLVED](
      { thesisId: 'thesis-1', thesisTitle: 'Test', payload: { status: 'Aprobado' } } as InboxEventContext
    );
    expect(msg.actionUrl).toBe('/thesis-work/details/thesis-1/loaded_documents');
  });

  // Muestra de control: confirma que los que YA estaban bien no se rompan
  // por un cambio futuro cercano en el mismo archivo.
  it('PRELIMINARY_DRAFT_CORRECTION_UPLOADED (ya correcto) sigue intacto', () => {
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED](
      { draftId: 'draft-1', draftTitle: 'Test' } as InboxEventContext
    );
    expect(msg.actionUrl).toBe('/preliminary-draft/details/draft-1/loaded_documents');
  });

  it('THESIS_REACTIVATED (agregado hace varios turnos, faltaba en el switch original) genera un builder válido', () => {
    const msg = INBOX_MESSAGE_BUILDERS[AppEventType.THESIS_REACTIVATED](
      { thesisId: 'thesis-1', thesisTitle: 'Test' } as InboxEventContext
    );
    expect(msg).toBeDefined();
    expect(msg.actionUrl).toBe('/thesis-work/details/thesis-1');
  });
});
