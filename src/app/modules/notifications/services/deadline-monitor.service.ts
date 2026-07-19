import { inject, Injectable } from '@angular/core';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { UserService } from '../../users/services/user.service';
import { InboxStateService } from './inbox-state.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface'; // 💡 Asegúrate de que la ruta coincida con la ubicación real de tu interfaz

@Injectable({
  providedIn: 'root'
})
export class DeadlineMonitorService {
  private readonly proposalService = inject(ProposalService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);
  private readonly inboxState = inject(InboxStateService);
  private readonly eventBus = inject(EventBusService);

  private readonly WARNING_DAYS_THRESHOLD = 3;
  private readonly THESIS_WARNING_DAYS_THRESHOLD = 30;

  public checkDeadlines(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ejecutamos ambas revisiones en paralelo
    this.checkProposalDeadlines(today);
    this.checkPreliminaryDraftDeadlines(today);
    this.checkThesisDeadlines(today);
  }

  // --- REVISIÓN DE PROPUESTAS ---
  private checkProposalDeadlines(today: Date): void {
    const activeProposals = this.proposalService.proposals()
      .filter(p => p.state === stateList.EN_REVISION && p.evaluationDeadline);

    activeProposals.forEach(proposal => {
      const deadline = new Date(proposal.evaluationDeadline!);
      deadline.setHours(0, 0, 0, 0);

      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const targetUserIds = this.getProposalStakeholders();

      if (daysLeft < 0) {
        this.triggerIfUnique(proposal.id!, proposal.title, targetUserIds, AppEventType.PROPOSAL_DEADLINE_EXPIRED, 'Plazo Vencido');
      } else if (daysLeft <= this.WARNING_DAYS_THRESHOLD) {
        this.triggerIfUnique(proposal.id!, proposal.title, targetUserIds, AppEventType.PROPOSAL_DEADLINE_WARNING, 'Recordatorio de Evaluación', daysLeft, 'proposalId', 'proposalTitle');
      }
    });
  }

  // --- REVISIÓN DE ANTEPROYECTOS ---
  private checkPreliminaryDraftDeadlines(today: Date): void {
    const activeDrafts = this.preliminaryDraftService.preliminaryDrafts()
      .filter(d => d.state === stateList.EN_REVISION && d.evaluationDeadline);

    activeDrafts.forEach(draft => {
      const deadline = new Date(draft.evaluationDeadline!);
      deadline.setHours(0, 0, 0, 0);

      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Buscamos a los evaluadores del anteproyecto
      const targetUserIds = this.getPreliminaryDraftStakeholders(draft);
      const title = draft.proposalData?.title || 'Anteproyecto sin título';

      if (daysLeft < 0) {
        this.triggerIfUnique(draft.preliminaryDraftId!, title, targetUserIds, AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED, 'Plazo de Anteproyecto Vencido', undefined, 'preliminaryDraftId', 'preliminaryDraftTitle');
      } else if (daysLeft <= this.WARNING_DAYS_THRESHOLD) {
        this.triggerIfUnique(draft.preliminaryDraftId!, title, targetUserIds, AppEventType.PRELIMINARY_DRAFT_DEADLINE_WARNING, 'Recordatorio de Evaluación de Anteproyecto', daysLeft, 'preliminaryDraftId', 'preliminaryDraftTitle');
      }
    });
  }

  // --- REVISIÓN DE TRABAJOS DE GRADO ---
  private checkThesisDeadlines(today: Date): void {
    const activeThesis = this.thesisWorkService.thesisWorks()
      .filter(t => t.state === stateList.EN_DESARROLLO && t.preliminaryDraftData?.maximumDeliveryDate);

    activeThesis.forEach(thesis => {
      const deadline = new Date(thesis.preliminaryDraftData!.maximumDeliveryDate!);
      deadline.setHours(0, 0, 0, 0);

      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Destinatarios: Autores + Equipo de dirección
      const targetUserIds = this.getThesisStakeholders(thesis);
      const title = thesis.preliminaryDraftData?.proposalData?.title || 'Trabajo sin título';

      if (daysLeft < 0) {
        this.triggerIfUnique(
          thesis.thesisWorkId,
          title,
          targetUserIds,
          AppEventType.THESIS_DEADLINE_EXPIRED,
          'Plazo de Entrega Vencido',
          undefined,
          'thesisId',
          'thesisTitle'
        );
      } else if (daysLeft <= this.THESIS_WARNING_DAYS_THRESHOLD) {
        this.triggerIfUnique(
          thesis.thesisWorkId,
          title,
          targetUserIds,
          AppEventType.THESIS_DEADLINE_WARNING,
          'Recordatorio de Entrega Final',
          daysLeft,
          'thesisId',
          'thesisTitle'
        );
      }
    });
  }

  /**
   * Método generalizado para no duplicar alertas
   */
  private triggerIfUnique(
    entityId: string,
    entityTitle: string,
    targetUserIds: string[],
    eventType: AppEventType,
    notificationTitle: string,
    daysLeft?: number,
    idKey: string = 'proposalId',
    titleKey: string = 'proposalTitle'
  ): void {

    if (targetUserIds.length === 0) return;

    const alreadyNotified = this.inboxState.messagesSignal().some(msg =>
      msg.actionUrl?.includes(entityId) && msg.title === notificationTitle
    );

    if (!alreadyNotified) {
      // 💡 Reemplazo de 'any' por un Record que acepta strings o números
      const payload: Record<string, string | number | undefined> = { daysLeft };
      payload[idKey] = entityId;
      payload[titleKey] = entityTitle;

      this.eventBus.emit({
        type: eventType,
        targetUserIds: targetUserIds,
        payload: payload
      });
    }
  }

  /**
   * Destinatarios para Propuestas: El Comité
   */
  private getProposalStakeholders(): string[] {
    const comiteUsers = this.userService.users()
      .filter(user => user.roles.includes(UserRoleType.COMITE))
      .map(user => user.id);
    return [...new Set(comiteUsers)];
  }

  /**
   * Destinatarios para Anteproyectos: Los Evaluadores asignados
   */
  private getPreliminaryDraftStakeholders(draft: PreliminaryDraft): string[] {
    if (!draft.evaluators) return [];
    const evaluatorsIds = draft.evaluators.map(evaluator => evaluator.id);
    return [...new Set(evaluatorsIds)];
  }

  private getThesisStakeholders(thesis: ThesisWork): string[] {
    const notifyUserIds: string[] = [];
    const proposal = thesis.preliminaryDraftData?.proposalData;

    // 💡 Tipado estricto iterando con la interfaz User
    proposal?.authors?.forEach((author: User) => {
      if (author?.id) {
        notifyUserIds.push(author.id);
      }
    });

    // Dirección
    if (proposal?.director?.id) notifyUserIds.push(proposal.director.id);
    if (proposal?.codirector?.id) notifyUserIds.push(proposal.codirector.id);
    if (proposal?.advisor?.id) notifyUserIds.push(proposal.advisor.id);

    return [...new Set(notifyUserIds)];
  }
}
