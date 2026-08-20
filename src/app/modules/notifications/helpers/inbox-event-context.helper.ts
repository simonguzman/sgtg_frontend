import { InboxEventContext, InboxEventPayload } from '../pages/notifications-page/models/inbox-event-context.model';

/**
 * Extrae título e ID del nivel correcto del payload, sin importar de qué
 * evento venga (propuesta, anteproyecto o trabajo de grado). Se centraliza
 * aquí porque este bloque de fallbacks anidados era la parte menos legible
 * del procesador original — separarlo permite testearlo de forma aislada.
 */
export function extractInboxEventContext(payload: InboxEventPayload): InboxEventContext {
  const proposalTitle =
    payload.title ||
    payload.proposal?.title ||
    payload.proposalTitle ||
    'Propuesta sin título';

  const draftTitle =
    payload.preliminaryDraftTitle ||
    payload.proposalData?.title ||
    payload.preliminaryDraft?.proposalData?.title ||
    payload.draftTitle ||
    (proposalTitle !== 'Propuesta sin título' ? proposalTitle : 'Anteproyecto sin título');

  // ← FIX: se elimina `payload?.thesisTitle ||` duplicado — aparecía dos
  // veces en el original. La segunda ocurrencia era código muerto
  // inalcanzable (si la primera evaluó falsy, la segunda también lo hace).
  const thesisTitle =
    payload.thesisTitle ||
    payload.preliminaryDraftData?.proposalData?.title ||
    payload.thesisWork?.preliminaryDraftData?.proposalData?.title ||
    (draftTitle !== 'Anteproyecto sin título' ? draftTitle : 'Trabajo de grado sin título');

  const proposalId = payload.proposalId || payload.proposal?.id || payload.id;
  const draftId = payload.preliminaryDraftId || payload.preliminaryDraft?.preliminaryDraftId || payload.draftId || payload.id;
  const thesisId = payload.thesisWorkId || payload.thesisWork?.thesisWorkId || payload.thesisId || payload.id;

  return { payload, proposalTitle, proposalId, draftTitle, draftId, thesisTitle, thesisId };
}
