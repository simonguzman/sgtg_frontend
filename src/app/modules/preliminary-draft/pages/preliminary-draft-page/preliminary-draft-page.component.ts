import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

import { Column, TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { DescriptionModalComponent } from "../../../../shared/components/modals/description-modal/description-modal.component";

import { UserRoleType } from '../../../../core/models/user-role';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../../core/enums/evaluation-deadline-status.enum';

// Importación de la utilidad adaptada
import { getRemainingBusinessDays } from '../../../../core/utils/date-utils';
import { User } from '../../../users/interfaces/user.interface';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';

const PRELIMINARY_DRAFT_COLUMNS: Column[] = [
  // 👇 1. Agregamos filterable
  { field: 'title', header: 'Titulo', type: 'text', width: '25%', filterable: true },
  { field: 'modality', header: 'Modalidad', type: 'text', width: '15%', filterable: true },
  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{ action: 'ver descripción', label: 'Ver descripción', variant: 'primary', disabled: false }],
    width: '15%'
  },
  // 👇 2. Agregamos filterable a Estado y Plazo
  { field: 'state', header: 'Estado', type: 'state', width: '15%', filterable: true },
  { field: 'remainingTime', header: 'Plazo Evaluación', type: 'text', width: '15%', filterable: true },
  {
    field: 'actions',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'editar', icon: 'edit', variant: 'primary', disabled: false },
      { action: 'eliminar', icon: 'delete', variant: 'primary', disabled: false }
    ],
    width: '15%'
  },
];

const HEADER_BUTTONS: TableButton[] = [
  { label: 'Formatos descargables', variant: 'primary' },
  { label: 'Registrar anteproyecto', variant: 'primary' }
];

@Component({
  selector: 'app-preliminary-draft-page',
  imports: [TableComponent, ConfirmationActionModalComponent, DescriptionModalComponent],
  templateUrl: './preliminary-draft-page.component.html',
  styleUrl: './preliminary-draft-page.component.css',
})
export class PreliminaryDraftPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  protected columns: Column[] = PRELIMINARY_DRAFT_COLUMNS;
  protected headerButtons: TableButton[] = [];

  protected filterFields = ['title', 'modality', 'state', 'remainingTime', 'hiddenParticipants'];

  descriptionModal = signal({ isOpen: false, title: '', content: '' });
  deleteState = signal({ isOpen: false, draftId: null as string | null, draftTitle: '', isProcessing: false });

  // --- ORQUESTADOR PRINCIPAL ---
  protected tableData = computed(() => {
    const preliminaryDraftList = this.preliminaryDraftService.preliminaryDrafts();
    const activePreliminaryDrafts = preliminaryDraftList.filter(preliminaryDraft => !preliminaryDraft.isArchived);

    const sortedList = [...activePreliminaryDrafts].sort((a, b) => {
      const dateA = a.createdData || a.proposalData?.createdAt || new Date(0);
      const dateB = b.createdData || b.proposalData?.createdAt || new Date(0);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return sortedList.map(preliminaryDraft => {
      const allowedActions = this.calculateAllowedActions(preliminaryDraft);
      const remainingTimeLabel = this.getDeadlineBadge(preliminaryDraft);
      const proposal = preliminaryDraft.proposalData;

      // 👇 2. Consolidamos TODOS los involucrados en un solo arreglo plano
      const allParticipants = [
        proposal?.director,
        proposal?.codirector,
        proposal?.advisor,
        ...(proposal?.authors || []),
        ...(preliminaryDraft.evaluators || [])
      ];

      // 👇 3. Filtramos los nulos/indefinidos y extraemos los nombres para hacer una cadena gigante
      const hiddenParticipants = allParticipants
        .filter(user => !!user)
        .map((user: any) => `${user.firstName || ''} ${user.lastName || ''}`.trim())
        .join(' ');

      return {
        id: preliminaryDraft.preliminaryDraftId,
        title: preliminaryDraft.proposalData?.title || 'Sin título',
        description: preliminaryDraft.proposalData?.description,
        modality: preliminaryDraft.proposalData?.modality || 'No definida',
        state: preliminaryDraft.state,
        remainingTime: remainingTimeLabel,
        allowedActions: allowedActions,
        // 👇 4. Pasamos la cadena oculta a la fila
        hiddenParticipants: hiddenParticipants
      };
    });
  });

  ngOnInit(): void {
    this.initHeaderButtons();
  }

  // --- MÉTODOS PRIVADOS DE LÓGICA DE NEGOCIO ---

  private calculateAllowedActions(preliminaryDraft: PreliminaryDraft): string[] {
    const currentUser = this.authService.currentUser();
    const currentUserId = currentUser?.id ? String(currentUser.id) : null;

    const hasFullAccessRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.JEFE_DEP,
      UserRoleType.CONSEJO
    ]);

    const isMatchingUser = (entity: any) => entity?.id != null && String(entity.id) === currentUserId;
    const isUserInList = (list?: any[]) => Array.isArray(list) && list.some(isMatchingUser);

    const proposal = preliminaryDraft.proposalData;
    const isDirector = isMatchingUser(proposal?.director);
    const isCodirector = isMatchingUser(proposal?.codirector);
    const isAdvisor = isMatchingUser(proposal?.advisor);

    const isStudentAuthor = (currentUserId != null && Array.isArray(proposal?.authors))
      ? proposal.authors.some((author: User) => author.id === currentUserId)
      : false;

    const isAssignedEvaluator = isUserInList(preliminaryDraft.evaluators);

    const hasViewPermission = hasFullAccessRole || isDirector || isCodirector || isAdvisor || isStudentAuthor || isAssignedEvaluator;
    const isOwnerOrAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]) || isDirector;
    const isApproved = preliminaryDraft.state === stateList.APROBADO;

    let allowed: string[] = ['ver descripción'];

    if (hasViewPermission) {
      allowed.push('ver');
    }

    if (isOwnerOrAdmin && !isApproved) {
      allowed.push('editar', 'eliminar');
    }

    return allowed;
  }

  /**
   * Analiza las evaluaciones registradas para determinar si la etapa cumplió o no el plazo global.
   */
  private getEvaluationsStatusLabel(currentRoundEvaluations: Evaluation[]): string {
    if (currentRoundEvaluations.length === 0) return '';

    const hasDelayed = currentRoundEvaluations.some(
      evaluation => (evaluation.deadlineStatus as string) === EvaluationDeadlineStatus.DELAYED || (evaluation.deadlineStatus as string) === 'Evaluado con retraso'
    );

    return hasDelayed ? EvaluationDeadlineStatus.DELAYED : EvaluationDeadlineStatus.ON_TIME;
  }



  private getDeadlineBadge(preliminaryDraft: PreliminaryDraft): string {
    const totalEvaluators = preliminaryDraft.evaluators?.length || 0;

    // 👇 LA SOLUCIÓN: Filtramos las evaluaciones para contar SOLO las que pertenecen al documento más reciente
    const currentDocument = preliminaryDraft.documents?.[0];
    const currentRoundEvaluations = preliminaryDraft.evaluations?.filter(e =>
      currentDocument && e.documentId === currentDocument.id
    ) || [];

    const currentEvaluationsCount = currentRoundEvaluations.length;
    const statusLabel = this.getEvaluationsStatusLabel(currentRoundEvaluations); // Le pasamos el arreglo filtrado

    // 1. Si el consejo ya emitió un veredicto final, el proceso terminó.
    const isFinalized =
      preliminaryDraft.state === stateList.APROBADO ||
      preliminaryDraft.state === stateList.APROBADO_CON_OBSERVACIONES ||
      preliminaryDraft.state === stateList.NO_APROBADO;

    if (isFinalized) {
      return statusLabel ? `Resolución emitida (${statusLabel})` : 'Resolución emitida';
    }

    // 2. Si no hay fecha límite configurada (ej: El documento pasó al Consejo sin evaluadores)
    if (!preliminaryDraft.evaluationDeadline) {
      return 'Sin límite (Consejo)';
    }

    // 3. Verificamos si LOS EVALUADORES ya terminaron SU RONDA ACTUAL
    if (totalEvaluators > 0 && currentEvaluationsCount >= totalEvaluators) {
      return `Evaluación completada — ${statusLabel} (Esperando Consejo)`;
    }

    // 4. Si seguimos esperando a los evaluadores en esta nueva ronda...
    const remainingDays = getRemainingBusinessDays(new Date(preliminaryDraft.evaluationDeadline));

    if (remainingDays < 0) {
      return `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`;
    } else if (remainingDays === 0) {
      return '¡Vence hoy!';
    } else {
      return `Quedan ${remainingDays} días hábiles`;
    }
  }

  // --- MÉTODOS DE INTERACCIÓN DE LA VISTA ---

  private initHeaderButtons(): void {
    const canRegister = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DIRECTOR
    ]);

    this.headerButtons = canRegister
      ? [...HEADER_BUTTONS]
      : HEADER_BUTTONS.filter(btn => btn.label !== 'Registrar anteproyecto');
  }

  handleTableAction(event: { action: string, row: any }): void {
    if (event.row.allowedActions && !event.row.allowedActions.includes(event.action)) {
      this.showRestrictedNotification();
      return;
    }
    switch (event.action) {
      case 'ver descripción':
        this.descriptionModal.set({
          isOpen: true,
          title: 'Descripción del anteproyecto',
          content: event.row.description || 'Sin descripción disponible.'
        });
        break;
      case 'ver':
        this.router.navigate(['/preliminary-draft/details', event.row.id]);
        break;
      case 'editar':
        this.router.navigate(['/preliminary-draft/edit', event.row.id]);
        break;
      case 'eliminar':
        this.deleteState.set({
          isOpen: true,
          draftId: event.row.id,
          draftTitle: event.row.title,
          isProcessing: false
        });
        break;
    }
  }

  handleHeaderButton(button: TableButton): void {
    if (button.label === 'Registrar anteproyecto') {
      this.router.navigate(['/preliminary-draft/create']);
    } else {
      this.router.navigate(['/preliminary-draft/downloadable_formats']);
    }
  }

  confirmDelete(): void {
    const state = this.deleteState();
    if (!state.draftId || state.isProcessing) return;
    this.deleteState.update(s => ({ ...s, isProcessing: true }));
    this.preliminaryDraftService.deleteDraftMock(state.draftId).subscribe({
      next: () => {
        this.showDeleteSuccessNotification();
        this.cancelDelete();
      },
      error: () => {
        this.deleteState.update(s => ({ ...s, isProcessing: false }));
        this.showDeleteErrorNotification();
      }
    });
  }

  cancelDelete(): void {
    this.deleteState.set({ isOpen: false, draftId: null, draftTitle: '', isProcessing: false });
  }

  private showDeleteSuccessNotification(): void {
    this.notificationService.show({
      title: 'Anteproyecto eliminado',
      message: 'El registro ha sido removido correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showDeleteErrorNotification(): void {
    this.notificationService.show({
      title: 'Error',
      message: 'No se pudo eliminar el anteproyecto debido a un fallo en el servidor.',
      type: NotificationType.ERROR
    });
  }

  private showRestrictedNotification(): void {
    this.notificationService.show({
      title: 'Acceso denegado',
      message: 'No tienes permisos para realizar esta acción o el registro está bloqueado.',
      type: NotificationType.ERROR
    });
  }
}
