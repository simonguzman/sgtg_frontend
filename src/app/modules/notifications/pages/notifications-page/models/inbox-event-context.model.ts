/**
 * Forma flexible del payload que llega a través del EventBus.
 * Cada tipo de evento pone campos distintos (título, id, veredicto, etc.)
 * — este interface documenta los campos conocidos que el procesador de
 * la bandeja realmente lee. El índice `[key: string]: unknown` se agrega
 * porque no se tiene visibilidad del tipo real de AppEvent.payload (usado
 * de forma laxa en ~15 emit() distintos a través de todo el proyecto);
 * sin él, el cast desde el payload crudo del evento sería más frágil.
 */
export interface InboxEventPayload {
  title?: string;
  proposalTitle?: string;
  proposal?: { title?: string; id?: string };
  proposalId?: string;

  preliminaryDraftTitle?: string;
  proposalData?: { title?: string };
  preliminaryDraft?: { proposalData?: { title?: string }; preliminaryDraftId?: string };
  draftTitle?: string;
  preliminaryDraftId?: string;
  draftId?: string;

  thesisTitle?: string;
  preliminaryDraftData?: { proposalData?: { title?: string } };
  thesisWork?: { thesisWorkId?: string; preliminaryDraftData?: { proposalData?: { title?: string } } };
  thesisWorkId?: string;
  thesisId?: string;

  id?: string;
  veredict?: string;
  finalState?: string;
  status?: string;
  type?: string;
  isApproved?: boolean;
  daysLeft?: number;
  sustentationId?: string;

  [key: string]: unknown;
}

export interface InboxEventContext {
  payload: InboxEventPayload;
  proposalTitle: string;
  proposalId?: string;
  draftTitle: string;
  draftId?: string;
  thesisTitle: string;
  thesisId?: string;
}
