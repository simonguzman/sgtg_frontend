import { Injectable } from '@angular/core';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisWorkTableRow } from '../models/thesis-work-page.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';

@Injectable({ providedIn: 'root' })
export class ThesisWorkPageMapperService {

  public mapThesisWorkToTable(
    thesisWork: ThesisWork,
    hasFullAccessRole: boolean,
    isAdmin: boolean,
    currentUserId: string | undefined
  ): ThesisWorkTableRow {
    const proposal = thesisWork.preliminaryDraftData?.proposalData;

    return {
      id: thesisWork.thesisWorkId || '',
      title: proposal?.title || 'Sin título',
      modality: proposal?.modality || 'No definida',
      description: proposal?.description || 'Sin descripción disponible.',
      state: thesisWork.state,
      maxDeliveryDate: this.formatMaxDeliveryDate(thesisWork.preliminaryDraftData?.maximumDeliveryDate),
      hiddenParticipants: this.buildHiddenParticipants(thesisWork),
      allowedActions: this.calculateAllowedActions(thesisWork, hasFullAccessRole, isAdmin, currentUserId)
    };
  }

  private formatMaxDeliveryDate(rawDate?: Date | string): string {
    if (!rawDate) return 'No asignada';
    const dateObj = new Date(rawDate);
    return isNaN(dateObj.getTime()) ? 'No asignada' : dateObj.toLocaleDateString('es-ES');
  }

  private buildHiddenParticipants(thesisWork: ThesisWork): string {
    const proposal = thesisWork.preliminaryDraftData?.proposalData;
    const allParticipants = [
      proposal?.director,
      proposal?.codirector,
      proposal?.advisor,
      ...(Array.isArray(proposal?.authors) ? proposal.authors : []),
      ...(thesisWork.sustentations?.[0]?.assignedJurors || [])
    ];

    return allParticipants
      .filter((user): user is User => !!user && typeof user === 'object')
      .map(user => `${user.firstName || ''} ${user.lastName || ''}`.trim())
      .join(' ');
  }

  private calculateAllowedActions(
    thesisWork: ThesisWork,
    hasFullAccessRole: boolean,
    isAdmin: boolean,
    currentUserId: string | undefined
  ): string[] {
    if (!currentUserId) return ['ver descripción'];

    const proposal = thesisWork.preliminaryDraftData?.proposalData;
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
    const isJuror = isUserInList(thesisWork.sustentations?.[0]?.assignedJurors);

    const hasViewPermission = hasFullAccessRole || isDirector || isCodirector || isAdvisor || isStudentAuthor || isJuror;
    const isOwnerOrAdmin = isAdmin || isDirector;

    let allowed: string[] = ['ver descripción'];

    if (hasViewPermission) allowed.push('ver');
    if (isOwnerOrAdmin) allowed.push('editar');

    if (thesisWork.state === stateList.SUSPENDIDO && isAdmin) {
      allowed.push('reactivar');
    }

    return allowed;
  }
}
