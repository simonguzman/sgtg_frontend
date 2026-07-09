import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Column, TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../core/models/user-role';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { DescriptionModalComponent } from "../../../../shared/components/modals/description-modal/description-modal.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';

const THESIS_WORK_COLUMNS: Column[] = [
  // 👇 Agregamos filterable: true a los campos clave
  { field: 'title', header: 'Título', type: 'text', width: '25%', filterable: true },
  { field: 'modality', header: 'Modalidad', type: 'text', width: '15%', filterable: true },
  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{ action: 'ver descripción', label: 'Ver descripción', variant: 'primary', disabled: false }],
    width: '15%'
  },
  { field: 'state', header: 'Estado', type: 'state', width: '15%', filterable: true },
  { field: 'maxDeliveryDate', header: 'Plazo Máximo', type: 'text', width: '15%', filterable: true },
  {
    field: 'actions',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'reactivar', icon: 'play_circle', variant: 'secondary', disabled: false },
    ],
    width: '15%'
  },
];

const HEADER_BUTTONS: TableButton[] = [
  { label: 'Formatos descargables', variant: 'primary' }
];

@Component({
  selector: 'app-thesis-work-page',
  imports: [TableComponent, DescriptionModalComponent, ConfirmationActionModalComponent],
  templateUrl: './thesis-work-page.component.html',
  styleUrl: './thesis-work-page.component.css',
})
export class ThesisWorkPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  protected columns: Column[] = THESIS_WORK_COLUMNS;
  protected headerButtons: TableButton[] = HEADER_BUTTONS;

  protected filterFields = ['title', 'modality', 'state', 'maxDeliveryDate', 'hiddenParticipants'];

  descriptionModal = signal({ isOpen: false, title: '', content: '' });

  // Señales para el modal de reactivación
  isConfirmModalOpen = signal(false);
  thesisToReactivate = signal<string | null>(null);

  protected tableData = computed(() => {
    const currentUser = this.authService.currentUser();
    const currentUserId = currentUser?.id ? String(currentUser.id) : null;
    const hasFullAccessRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DECANATURA,
      UserRoleType.CONSEJO
    ]);

    const activeThesisWorkList = this.thesisWorkService.thesisWorks().filter(thesisWork => !thesisWork.isArchived);
    return activeThesisWorkList.map(thesisWork => {
      const preliminaryDraft = thesisWork.preliminaryDraftData;
      const proposal = preliminaryDraft?.proposalData;

      let maxDeliveryDateFormatted = 'No asignada';
      const rawDate = preliminaryDraft?.maximumDeliveryDate;
      if (rawDate) {
        const dateObj = new Date(rawDate);
        if (!isNaN(dateObj.getTime())) {
          maxDeliveryDateFormatted = dateObj.toLocaleDateString('es-ES');
        }
      }

      const isDirector = proposal?.director?.id != null && String(proposal.director.id) === currentUserId;
      const isCodirector = proposal?.codirector?.id != null && String(proposal.codirector.id) === currentUserId;
      const isAdvisor = proposal?.advisor?.id != null && String(proposal.advisor.id) === currentUserId;

      const isStudentAuthor = (currentUserId != null && Array.isArray(proposal?.authors))
        ? proposal.authors.some((author: User) =>
            typeof author === 'string' ? author === currentUserId : String(author?.id) === currentUserId
          )
        : false;
      const isJuror = thesisWork.sustentations?.[0]?.assignedJurors?.some(juror => String(juror.id) === currentUserId) ?? false;

      const hasViewPermission = hasFullAccessRole || isDirector || isCodirector || isAdvisor || isStudentAuthor || isJuror;
      const isOwnerOrAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]) || isDirector;

      let allowed: string[] = ['ver descripción'];
      if (hasViewPermission) allowed.push('ver');
      if (isOwnerOrAdmin) allowed.push('editar');

      if (thesisWork.state === stateList.SUSPENDIDO && this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR])) {
        allowed.push('reactivar');
      }

      // 👇 2. Consolidamos a todos los participantes, incluyendo los jurados de la sustentación
      const allParticipants = [
        proposal?.director,
        proposal?.codirector,
        proposal?.advisor,
        ...(Array.isArray(proposal?.authors) ? proposal.authors : []),
        ...(thesisWork.sustentations?.[0]?.assignedJurors || [])
      ];

      // 👇 3. Extraemos nombres (validando que sean objetos y no strings de IDs)
      const hiddenParticipants = allParticipants
        .filter(user => user && typeof user === 'object')
        .map((user: any) => `${user.firstName || ''} ${user.lastName || ''}`.trim())
        .join(' ');

      return {
        id: thesisWork.thesisWorkId,
        title: proposal?.title || 'Sin título',
        description: proposal?.description || 'Sin descripción disponible.',
        modality: proposal?.modality || 'No definida',
        state: thesisWork.state,
        maxDeliveryDate: maxDeliveryDateFormatted,
        allowedActions: allowed,
        // 👇 4. Pasamos la cadena oculta a la fila
        hiddenParticipants: hiddenParticipants
      };
    });
  });

  ngOnInit(): void {}

  handleTableAction(event: { action: string, row: any }): void {
    if (event.row.allowedActions && !event.row.allowedActions.includes(event.action)) {
      this.showRestrictedNotification();
      return;
    }

    switch (event.action) {
      case 'ver descripción':
        this.descriptionModal.set({ isOpen: true, title: 'Descripción del trabajo de grado', content: event.row.description });
        break;
      case 'ver':
        this.router.navigate(['/thesis-work/details', event.row.id]);
        break;
      case 'reactivar':
        this.thesisToReactivate.set(event.row.id);
        this.isConfirmModalOpen.set(true);
        break;
    }
  }

  confirmReactivation(): void {
    const id = this.thesisToReactivate();
    if (!id) return;

    this.thesisWorkService.reactivateThesisWorkMock(id).subscribe({
      next: () => {
        this.notificationService.show({
          title: 'Trabajo Reactivado',
          message: 'El trabajo ha sido reactivado correctamente.',
          type: NotificationType.CONFIRMATION
        });
        this.isConfirmModalOpen.set(false);
      },
      error: () => {
        this.notificationService.show({
          title: 'Error',
          message: 'Hubo un error al reactivar el trabajo.',
          type: NotificationType.ERROR
        });
        this.isConfirmModalOpen.set(false);
      }
    });
  }

  handleHeaderButton(button: TableButton): void {
    if (button.label === 'Formatos descargables') {
      this.router.navigate(['/thesis-work/downloadable_formats']);
    }
  }

  private showRestrictedNotification(): void {
    this.notificationService.show({
      title: 'Acceso denegado',
      message: 'No tienes permisos para realizar esta acción o interactuar con este registro.',
      type: NotificationType.ERROR
    });
  }
}
