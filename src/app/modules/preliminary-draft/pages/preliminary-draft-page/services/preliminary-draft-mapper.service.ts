import { Injectable } from '@angular/core';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { PreliminaryDraftTableRow } from '../models/preliminary-draft-page.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../../../core/enums/evaluation-deadline-status.enum';
import { getRemainingBusinessDays } from '../../../../../core/utils/date-utils';
import { User } from '../../../../users/interfaces/user.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftMapperService {

  public mapPreliminaryDraftToTable(
    preliminaryDraft: PreliminaryDraft,
    hasFullAccessRole: boolean,
    isAdmin: boolean,
    currentUserId: string | undefined
  ): PreliminaryDraftTableRow {
    return {
      // SOLUCIÓN AL ERROR TS(2322): Garantizamos que siempre sea un string
      id: preliminaryDraft.preliminaryDraftId || '',
      title: preliminaryDraft.proposalData?.title || 'Sin título',
      modality: preliminaryDraft.proposalData?.modality || 'No definida',
      description: preliminaryDraft.proposalData?.description || '',
      state: preliminaryDraft.state,
      remainingTime: this.getDeadlineBadge(preliminaryDraft),
      hiddenParticipants: this.buildHiddenParticipants(preliminaryDraft),
      allowedActions: this.calculateAllowedActions(preliminaryDraft, hasFullAccessRole, isAdmin, currentUserId)
    };
  }

  private buildHiddenParticipants(preliminaryDraft: PreliminaryDraft): string {
    const proposal = preliminaryDraft.proposalData;
    const allParticipants = [
      proposal?.director,
      proposal?.codirector,
      proposal?.advisor,
      ...(proposal?.authors || []),
      ...(preliminaryDraft.evaluators || [])
    ];

    return allParticipants
      .filter((user): user is User => !!user && typeof user === 'object')
      .map(user => `${user.firstName || ''} ${user.lastName || ''}`.trim())
      .join(' ');
  }

  private calculateAllowedActions(
    preliminaryDraft: PreliminaryDraft,
    hasFullAccessRole: boolean,
    isAdmin: boolean,
    currentUserId: string | undefined
  ): string[] {
    if (!currentUserId) return ['ver descripción'];

    const proposal = preliminaryDraft.proposalData;
    const isMatchingUser = (entity?: Pick<User, 'id'> | string) => {
      if (!entity) return false;
      const id = typeof entity === 'string' ? entity : entity.id;
      return String(id) === currentUserId;
    };

    const isUserInList = (list?: (User | { id: string } | string)[]) => Array.isArray(list) && list.some(isMatchingUser);

    const isDirector = isMatchingUser(proposal?.director);
    const isCodirector = isMatchingUser(proposal?.codirector);
    const isAdvisor = isMatchingUser(proposal?.advisor);
    const isStudentAuthor = isUserInList(proposal?.authors);
    const isAssignedEvaluator = isUserInList(preliminaryDraft.evaluators);

    const hasViewPermission = hasFullAccessRole || isDirector || isCodirector || isAdvisor || isStudentAuthor || isAssignedEvaluator;
    const isOwnerOrAdmin = isAdmin || isDirector;
    const isApproved = preliminaryDraft.state === stateList.APROBADO;

    let allowed: string[] = ['ver descripción'];

    if (hasViewPermission) allowed.push('ver');
    if (isOwnerOrAdmin && !isApproved) allowed.push('editar', 'eliminar');

    return allowed;
  }

  private getEvaluationsStatusLabel(currentRoundEvaluations: Evaluation[]): string {
    if (currentRoundEvaluations.length === 0) return '';

    // SOLUCIÓN TS(2367): Comparamos contra el miembro del enum en lugar de un string literal
    const hasDelayed = currentRoundEvaluations.some(
      evaluation => evaluation.deadlineStatus === EvaluationDeadlineStatus.DELAYED
    );

    return hasDelayed ? EvaluationDeadlineStatus.DELAYED : EvaluationDeadlineStatus.ON_TIME;
  }

  private getDeadlineBadge(preliminaryDraft: PreliminaryDraft): string {
    const totalEvaluators = preliminaryDraft.evaluators?.length || 0;
    const currentDocument = preliminaryDraft.documents?.[0];
    const currentRoundEvaluations = preliminaryDraft.evaluations?.filter(evaluation => currentDocument && evaluation.documentId === currentDocument.id) || [];
    const statusLabel = this.getEvaluationsStatusLabel(currentRoundEvaluations);

    const isFinalized = [stateList.APROBADO, stateList.APROBADO_CON_OBSERVACIONES, stateList.NO_APROBADO].includes(preliminaryDraft.state as stateList);

    if (isFinalized) return statusLabel ? `Resolución emitida (${statusLabel})` : 'Resolución emitida';
    if (!preliminaryDraft.evaluationDeadline) return 'Sin límite (Consejo)';
    if (totalEvaluators > 0 && currentRoundEvaluations.length >= totalEvaluators) return `Evaluación completada — ${statusLabel} (Esperando Consejo)`;

    const remainingDays = getRemainingBusinessDays(new Date(preliminaryDraft.evaluationDeadline));
    if (remainingDays < 0) return `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`;
    if (remainingDays === 0) return '¡Vence hoy!';
    return `Quedan ${remainingDays} días hábiles`;
  }
}
