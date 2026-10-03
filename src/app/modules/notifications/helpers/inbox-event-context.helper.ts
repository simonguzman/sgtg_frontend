import { InboxEventContext, InboxEventPayload } from '../pages/notifications-page/models/inbox-event-context.model';

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
