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
import { Proposal } from '../../interfaces/proposal.interface';
import { stateList } from '../../../../core/enums/state.enum';

const PROPOSAL_COLUMNS: Column[] = [
  // 👇 1. Agregamos filterable al Título
  { field: 'title', header: 'Titulo', type: 'text', width: '30%', filterable: true },

  // 👇 2. Agregamos filterable a la Modalidad
  { field: 'modality', header: 'Modalidad', type: 'text', width: 'auto', filterable: true },

  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{action:'ver descripcion', label: 'Ver descripcion', variant: 'primary', disabled: false}],
    width: 'auto'
  },

  // 👇 3. Agregamos filterable al Estado (muy útil para buscar solo los "Aprobados" o "En revisión")
  { field: 'state', header: 'Estado', type: 'state', width: 'auto', filterable: true },

  // 👇 4. También podemos agregarlo al plazo si quieren filtrar por "Sin límite" o "Vencido"
  { field: 'deadlineStatus', header: 'Plazo Evaluación', type: 'text', width: 'auto', filterable: true },

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

  protected filterFields = ['title', 'modality', 'state', 'deadlineStatus', 'hiddenParticipants'];

  protected proposalsWithPermissions = computed(() => {
    const currentUser = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);

    return this.rawProposals().map(proposal => {
      const isOwner = proposal.director?.id === currentUser?.id;

      // 👇 2. Consolidamos TODOS los involucrados en un solo arreglo plano
      // Agregamos codirector y advisor por si la interfaz de Proposal los soporta a futuro
      const allParticipants = [
        proposal.director,
        proposal.codirector,
        proposal.advisor,
        ...(proposal.authors || [])
      ];

      // 👇 3. Filtramos los nulos/indefinidos y extraemos los nombres para hacer la cadena
      const hiddenParticipants = allParticipants
        .filter(user => user && typeof user === 'object')
        .map((user: any) => `${user.firstName || ''} ${user.lastName || ''}`.trim())
        .join(' ');

      return {
        ...proposal,
        deadlineStatus: this.getDeadlineBadge(proposal),
        allowedActions: (isAdmin || isOwner)
          ? ['ver descripcion', 'ver', 'editar', 'eliminar']
          : ['ver descripcion', 'ver'],
        // 👇 4. Asignamos la cadena oculta y eliminamos hiddenDirectorName / hiddenAuthorsNames
        hiddenParticipants: hiddenParticipants
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

 getDeadlineBadge(proposal: Proposal): string {
    // 1. Verificamos si la propuesta YA FUE EVALUADA
    const isEvaluated =
      proposal.state === stateList.APROBADO ||
      proposal.state === stateList.NO_APROBADO;

    if (isEvaluated) {
      // Como las evaluaciones se insertan al inicio del array [nueva, ...viejas], la [0] es la actual
      if (proposal.evaluations && proposal.evaluations.length > 0) {
        const latestEvaluation = proposal.evaluations[0];
        // Retornamos el valor del Enum (Ej: "Evaluado en plazo" o "Evaluado con retraso")
        if (latestEvaluation.deadlineStatus) {
          return latestEvaluation.deadlineStatus as string;
        }
      }
      return 'Evaluación completada';
    }

    // 2. Si sigue en revisión, calculamos los días normales
    if (!proposal.evaluationDeadline) return 'Sin límite';

    const remainingDays = getRemainingBusinessDays(proposal.evaluationDeadline);

    if (remainingDays < 0) {
      return `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`;
    } else if (remainingDays === 0) {
      return '¡Vence hoy!';
    } else {
      return `Quedan ${remainingDays} días hábiles`;
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
