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

const PRELIMINARY_DRAFT_COLUMNS: Column[] = [
  { field: 'title', header: 'Titulo', type: 'text', width: '30%' },
  { field: 'modality', header: 'Modalidad', type: 'text', width: '15%' },
  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{ action: 'ver descripción', label: 'Ver descripción', variant: 'primary', disabled: false }],
    width: '20%'
  },
  { field: 'state', header: 'Estado', type: 'state', width: '15%' },
  {
    field: 'actions',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'editar', icon: 'edit', variant: 'primary', disabled: false },
      { action: 'eliminar', icon: 'delete', variant: 'primary', disabled: false }
    ],
    width: '20%'
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

  // Variables renombradas para mayor claridad
  descriptionModal = signal({ isOpen: false, title: '', content: '' });
  deleteState = signal({ isOpen: false, draftId: null as string | null, draftTitle: '', isProcessing: false });

  protected tableData = computed(() => {
    const currentUser = this.authService.currentUser();
    const currentUserId = currentUser?.id ? String(currentUser.id) : null;
    const hasFullAccessRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.JEFE_DEP,
      UserRoleType.CONSEJO
    ]);
    const isMatchingUser = (entity: any) => entity?.id != null && String(entity.id) === currentUserId;
    const isUserInList = (list?: any[]) => Array.isArray(list) && list.some(isMatchingUser);
    const preliminaryDraftList = this.preliminaryDraftService.preliminaryDrafts();

    return preliminaryDraftList.map(preliminaryDraft => {
      const proposal = preliminaryDraft.proposalData;
      const isDirector = isMatchingUser(proposal?.director);
      const isCodirector = isMatchingUser(proposal?.codirector);
      const isAdvisor = isMatchingUser(proposal?.advisor);
      const isStudentAuthor = (currentUserId != null && Array.isArray(proposal?.authors))
        ? proposal.authors.some(author => author.id === currentUserId)
        : false;
      const isAssignedEvaluator = isUserInList(preliminaryDraft.evaluators);
      const hasViewPermission = hasFullAccessRole || isDirector || isCodirector || isAdvisor || isStudentAuthor || isAssignedEvaluator;
      const isOwnerOrAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]) || isDirector;
      const isAproved = preliminaryDraft.state === stateList.APROBADO;
      let allowed: string[] = ['ver descripción'];
      if (hasViewPermission) allowed.push('ver');
      // Regla: No editar/eliminar si ya está aprobado
      if (isOwnerOrAdmin && !isAproved) {
        allowed.push('editar', 'eliminar');
      }
      return {
        id: preliminaryDraft.preliminaryDraftId,
        title: proposal?.title || 'Sin título',
        description: proposal?.description,
        modality: proposal?.modality || 'No definida',
        state: preliminaryDraft.state,
        allowedActions: allowed
      };
    });
  });

  ngOnInit(): void {
    this.initHeaderButtons();
  }

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

  // Métodos de notificación para feedback
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
