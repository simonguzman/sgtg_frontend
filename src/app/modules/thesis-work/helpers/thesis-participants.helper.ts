import { Proposal } from '../../proposal/interfaces/proposal.interface';

/**
 * Extrae todos los IDs de participantes de una propuesta.
 * Se centraliza aquí porque el mismo patrón se repite en los 5 sub-servicios del módulo,
 * generando duplicación de ~10 líneas por servicio.
 */
export function collectParticipantIds(proposal: Proposal | undefined): string[] {
  if (!proposal) return [];

  const ids: string[] = [];

  proposal.authors?.forEach(author => {
    const id = typeof author === 'string' ? author : author?.id;
    if (id) ids.push(id);
  });

  if (proposal.director?.id)   ids.push(proposal.director.id);
  if (proposal.codirector?.id) ids.push(proposal.codirector.id);
  if (proposal.advisor?.id)    ids.push(proposal.advisor.id);

  return ids;
}
