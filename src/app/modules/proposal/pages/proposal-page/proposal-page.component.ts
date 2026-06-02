import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProposalService } from '../../services/proposal.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Column, TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { UserRoleType } from '../../../../core/models/user-role';
import { getRemainingBusinessDays } from '../../../../core/utils/date-utils';

const PROPOSAL_COLUMNS: Column[] = [
  { field: 'title', header: 'Titulo', type: 'text', width: '30%' },
  { field: 'modality', header: 'Modalidad', type: 'text', width: 'auto'},
  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{action:'ver descripcion', label: 'Ver descripcion', variant: 'primary', disabled: false}],
    width: 'auto'
  },
  { field: 'state', header: 'Estado', type: 'state', width: 'auto' },
  // Nueva columna para visualizar el estado de la fecha límite basada en días hábiles
  { field: 'deadlineStatus', header: 'Plazo Evaluación', type: 'text', width: 'auto' },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'editar', icon: 'edit', variant: 'primary', disabled: false },
      { action: 'eliminar', icon: 'delete', variant: 'primary', disabled: false }
    ],
    width: 'auto'
  },
];

const HEADER_BUTTONS: TableButton[] = [
  { label: 'Formatos descargables', variant: 'primary' },
  { label: 'Registrar propuesta',   variant: 'primary' }
]

@Component({
  selector: 'app-proposal-page',
  imports: [TableComponent, DescriptionModalComponent, ConfirmationActionModalComponent],
  templateUrl: './proposal-page.component.html',
  styleUrl: './proposal-page.component.css',
})
export class ProposalPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly proposalService = inject(ProposalService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  private readonly rawProposals = this.proposalService.proposals;
  protected columns: Column[] = PROPOSAL_COLUMNS;
  protected headerButtons: TableButton[] = [];

  protected proposalsWithPermissions = computed(() => {
    const currentUser = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);

    return this.rawProposals().map(proposal => {
      const isOwner = proposal.director?.id === currentUser?.id;

      // Calculamos la etiqueta del plazo límite en días hábiles para esta propuesta
      const badgeInfo = this.getDeadlineBadge(proposal.evaluationDeadline);

      return {
        ...proposal,
        // Asignamos el texto formateado al campo de la columna 'deadlineStatus'
        deadlineStatus: badgeInfo.label,
        allowedActions: (isAdmin || isOwner)
          ? ['ver descripcion', 'ver', 'editar', 'eliminar']
          : ['ver descripcion', 'ver']
      };
    });
  });

  descriptionModal = { show: false, title: '', content: '' };
  deleteState = {
    show:     false,
    id:       null as string | null,
    title:    '',
    loading: false
  };

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
      : HEADER_BUTTONS.filter(btn => btn.label !== 'Registrar propuesta');
  }

  handleTableAction(event: { action: string, row: any }): void {
    if (event.row.allowedActions && !event.row.allowedActions.includes(event.action)) {
      this.showRestrictedAccessNotification();
      return;
    }

    switch (event.action) {
      case 'ver descripcion':
        this.descriptionModal = {
          show: true,
          title: 'Descripción de la propuesta',
          content: event.row.description
        };
        break;
      case 'ver':
        this.router.navigate(['/proposal/details', event.row.id]);
        break;
      case 'editar':
        this.router.navigate(['/proposal/edit', event.row.id]);
        break;
      case 'eliminar':
        this.deleteState = {
          show: true,
          id: event.row.id!,
          title: event.row.title,
          loading: false
        };
        break;
    }
  }

  handleHeaderButton(button: TableButton): void {
    switch (button.label) {
      case 'Registrar propuesta':
        this.router.navigate(['/proposal/create']);
        break;
      case 'Formatos descargables':
        this.router.navigate(['/proposal/downloadable_formats']);
        break;
    }
  }

  getDeadlineBadge(deadline?: Date) {
    if (!deadline) return { label: 'Sin límite', css: 'bg-gray-100 text-gray-700' };

    const remainingDays = getRemainingBusinessDays(deadline);

    if (remainingDays < 0) {
      return {
        label: `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`,
        css: 'bg-red-100 text-red-700 font-bold border border-red-300'
      };
    } else if (remainingDays === 0) {
      return {
        label: '¡Vence hoy!',
        css: 'bg-orange-100 text-orange-700 font-bold'
      };
    } else if (remainingDays <= 3) {
      return {
        label: `Quedan ${remainingDays} días hábiles`,
        css: 'bg-yellow-100 text-yellow-700'
      };
    } else {
      return {
        label: `Quedan ${remainingDays} días hábiles`,
        css: 'bg-green-100 text-green-700'
      };
    }
  }

  confirmDelete(): void {
    const idToDelete = this.deleteState.id;
    if (!idToDelete || this.deleteState.loading) return;

    this.deleteState.loading = true;
    this.showDeleteProposalInfoNotification();

    this.proposalService.deleteProposalMock(idToDelete).subscribe({
      next: () => {
        this.showDeleteProposalSuccessNotification();
        this.resetDeleteState();
      },
      error: () => {
        this.showDeleteProposalErrorNotification();
        this.deleteState.loading = false;
      }
    });
  }

  cancelDelete(): void {
    this.resetDeleteState();
  }

  private resetDeleteState(): void {
    this.deleteState = { show: false, id: null, title: '', loading: false };
  }

  private showRestrictedAccessNotification(): void {
    this.notificationService.show({
      title: 'Acceso restringido',
      message: 'No tienes permisos para realizar esta acción sobre esta propuesta.',
      type: NotificationType.ERROR
    });
  }

  private showDeleteProposalInfoNotification() {
    this.notificationService.show({
      title: 'Eliminando propuesta',
      message: 'Se está procesando la solicitud...',
      type: NotificationType.INFO
    });
  }

  private showDeleteProposalSuccessNotification() {
    this.notificationService.show({
      title: 'Propuesta eliminada',
      message: 'La propuesta fue eliminada correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showDeleteProposalErrorNotification() {
    this.notificationService.show({
      title: 'Error',
      message: 'No se pudo completar la eliminación.',
      type: NotificationType.ERROR
    });
  }
}
