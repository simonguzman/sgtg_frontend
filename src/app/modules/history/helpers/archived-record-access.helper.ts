import { ArchivedBaseProposal } from '../interfaces/archived-base-proposal.interface';

export function hasArchiveAccess(
  proposal: ArchivedBaseProposal | undefined,
  userId: string | undefined,
  hasGlobalAccess: boolean
): boolean {
  if (hasGlobalAccess) return true;

  if (!proposal || !userId) return false;

  const isAuthor = proposal.authors?.some(author =>
    (typeof author === 'string' ? author : author.id) === userId
  ) ?? false;

  const isDirector = proposal.director?.id === userId;
  const isCodirector = proposal.codirector?.id === userId;
  const isAdvisor = proposal.advisor?.id === userId;

  return isAuthor || isDirector || isCodirector || isAdvisor;
}
