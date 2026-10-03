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
