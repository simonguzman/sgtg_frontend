import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, tap } from 'rxjs';

// --- Sub-servicios Especializados ---
import { ProposalStorageService } from './proposal-storage.service';
import { ProposalRulesService } from './proposal-rules.service';
import { ProposalDocumentService } from './proposal-document.service';

import { UserService } from '../../users/services/user.service';
import { Proposal } from '../interfaces/proposal.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { Document } from '../../../core/interfaces/Document.interface';
import { UserRoleType } from '../../../core/models/user-role';
import { stateList } from '../../../core/enums/state.enum';
import { addBusinessDays } from '../../../core/utils/date-utils';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';

@Injectable({
  providedIn: 'root'
})
export class ProposalService {
  private readonly storage = inject(ProposalStorageService);
  private readonly rulesService = inject(ProposalRulesService);
  private readonly documentService = inject(ProposalDocumentService);
  private readonly userService = inject(UserService);
  private readonly eventBus = inject(EventBusService);

  // Exposición limpia del canal de datos computado
  readonly proposals = this.storage.proposals;

  getProposalByIdMock(id: string): Observable<Proposal | undefined> {
    return this.storage.getById(id);
  }

  /**
   * Registra una nueva propuesta en el sistema, calcula deadlines y dispara notificaciones institucionales.
   */
  createProposalMock(proposal: Proposal): Observable<Proposal> {
    const nowDate = new Date();
    const deadlineDate = addBusinessDays(nowDate, 10);

    // 💡 Ajuste: Estandarización completa a Web Crypto API para UUIDs consistentes
    const newProposal: Proposal = {
      ...proposal,
      id: crypto.randomUUID(),
      createdAt: nowDate,
      evaluationDeadline: deadlineDate,
      state: stateList.EN_REVISION,
      documents: proposal.documents ? proposal.documents.map(doc => ({
        ...doc,
        id: doc.id || crypto.randomUUID()
      })) : [],
      evaluations: []
    };

    return of(newProposal).pipe(
      delay(1000),
      tap(onSaved => {
        this.storage.updateProposals(current => [onSaved, ...current]);

        // Sincronización automática de roles para el equipo de docentes
        if (onSaved.director) this.userService.addRoleToUser(onSaved.director.id, UserRoleType.DIRECTOR);
        if (onSaved.codirector) this.userService.addRoleToUser(onSaved.codirector.id, UserRoleType.CODIRECTOR);
        if (onSaved.advisor) this.userService.addRoleToUser(onSaved.advisor.id, UserRoleType.ASESOR);

        const notifyUserIds: string[] = [];

        // Registro de usuarios de la propuesta para notificación distribuida
        onSaved.authors?.forEach(author => {
          if (author?.id) notifyUserIds.push(author.id);
        });
        if (onSaved.director?.id) notifyUserIds.push(onSaved.director.id);
        if (onSaved.codirector?.id) notifyUserIds.push(onSaved.codirector.id);
        if (onSaved.advisor?.id) notifyUserIds.push(onSaved.advisor.id);

        // Inyección de los miembros del Comité de Programa
        const comiteUsers = this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.COMITE))
          .map(user => user.id);
        notifyUserIds.push(...comiteUsers);

        // 💡 Ajuste: Envío unificado usando claves estandarizadas core ('proposalId', 'proposalTitle')
        this.eventBus.emit({
          type: AppEventType.PROPOSAL_CREATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            proposalId: onSaved.id,
            proposalTitle: onSaved.title
          }
        });
      })
    );
  }

  /**
   * Modifica una propuesta existente ejecutando de forma segura las políticas de intercambio de roles.
   */
  updateProposalMock(id: string, changes: Partial<Proposal>): Observable<Proposal> {
    // 🔒 Captura atómica de la instantánea previa antes de abrir el flujo asíncrono
    const oldProposal = this.storage.getProposalsListSnapshot().find(p => p.id === id);

    return of(null).pipe(
      delay(1000),
      map(() => {
        if (!oldProposal) {
          throw new Error(`Propuesta con ID ${id} no encontrada para actualizar.`);
        }

        // Gestión centralizada de roles docentes basada en la foto original
        this.rulesService.handleRoleExchange(oldProposal.codirector?.id, changes.codirector?.id, UserRoleType.CODIRECTOR, id);
        this.rulesService.handleRoleExchange(oldProposal.advisor?.id, changes.advisor?.id, UserRoleType.ASESOR, id);

        const updatedProposal: Proposal = { ...oldProposal, ...changes };

        // Mutación inmutable directa sobre el almacén de señales
        this.storage.updateProposals(list =>
          list.map(p => (p.id === id ? updatedProposal : p))
        );

        // 💡 Ajuste: Retorno directo del objeto en memoria eliminando re-consultas redundantes a snapshots
        return updatedProposal;
      })
    );
  }

  /**
   * Elimina de forma lógica o física una propuesta y reevalúa dependencias residuales de roles.
   */
  deleteProposalMock(id: string): Observable<void> {
    const proposalToRemove = this.storage.getProposalsListSnapshot().find(p => p.id === id);

    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        if (!proposalToRemove) return;

        // Remover la propuesta del storage global
        this.storage.updateProposals(list => list.filter(p => p.id !== id));

        // Limpieza de roles huerfanos tras la eliminación
        const rolesToCheck = [
          { id: proposalToRemove.codirector?.id, role: UserRoleType.CODIRECTOR },
          { id: proposalToRemove.advisor?.id, role: UserRoleType.ASESOR }
        ];

        rolesToCheck.forEach(({ id: userId, role }) => {
          if (userId) {
            // El snapshot ya refleja el estado sin la propuesta actual
            const isStillLinked = this.storage.getProposalsListSnapshot().some(p =>
              (role === UserRoleType.CODIRECTOR && p.codirector?.id === userId) ||
              (role === UserRoleType.ASESOR && p.advisor?.id === userId)
            );

            if (!isStillLinked) {
              this.userService.removeRoleFromUser(userId, role);
            }
          }
        });
      })
    );
  }

  // --- Delegación a Sub-servicios Especializados ---

  validateProposalRules(proposal: Partial<Proposal>): string | null {
    return this.rulesService.validateProposalRules(proposal);
  }

  addEvaluationMock(proposalId: string, evaluation: Evaluation): Observable<void> {
    return this.documentService.addEvaluationMock(proposalId, evaluation);
  }

  uploadCorrectionMock(proposalId: string, newDoc: Document): Observable<void> {
    return this.documentService.uploadCorrectionMock(proposalId, newDoc);
  }

  getDocumentsByProposalId(id: string): Document[] {
    const proposal = this.storage.getProposalsListSnapshot().find(p => p.id === id);
    return proposal ? proposal.documents : [];
  }
}
