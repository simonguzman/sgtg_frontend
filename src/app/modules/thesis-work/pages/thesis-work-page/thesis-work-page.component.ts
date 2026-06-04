import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Column, TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../core/models/user-role';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { DescriptionModalComponent } from "../../../../shared/components/modals/description-modal/description-modal.component";
import { User } from '../../../users/interfaces/user.interface';

const THESIS_WORK_COLUMNS: Column[] = [
  { field: 'title', header: 'Título', type: 'text', width: '25%' },
  { field: 'modality', header: 'Modalidad', type: 'text', width: '15%' },
  {
    field: 'description',
    header: 'Descripción',
    type: 'actions',
    actions: [{ action: 'ver descripción', label: 'Ver descripción', variant: 'primary', disabled: false }],
    width: '15%'
  },
  { field: 'state', header: 'Estado', type: 'state', width: '15%' },
  { field: 'maxDeliveryDate', header: 'Plazo Máximo', type: 'text', width: '15%' }, // 👈 Columna de la fecha límite
  {
    field: 'actions',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false },
    ],
    width: '15%'
  },
];

const HEADER_BUTTONS: TableButton[] = [
  { label: 'Formatos descargables', variant: 'primary' }
];

@Component({
  selector: 'app-thesis-work-page',
  imports: [TableComponent, DescriptionModalComponent],
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

  descriptionModal = signal({ isOpen: false, title: '', content: '' });

  protected tableData = computed(() => {
    const currentUser = this.authService.currentUser();
    const currentUserId = currentUser?.id ? String(currentUser.id) : null;
    const hasFullAccessRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DECANATURA,
      UserRoleType.CONSEJO
    ]);

    const thesisWorkList = this.thesisWorkService.thesisWorks();
    return thesisWorkList.map(work => {
      const draft = work.preliminaryDraftData;
      const proposal = draft?.proposalData;

      // --- Extracción directa desde la raíz de PreliminaryDraft ---
      let maxDeliveryDateFormatted = 'No asignada';
      const rawDate = draft?.maximumDeliveryDate;

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
      const isJuror = work.sustentations?.[0]?.assignedJurors?.some(juror => String(juror.id) === currentUserId) ?? false;
      const hasViewPermission = hasFullAccessRole || isDirector || isCodirector || isAdvisor || isStudentAuthor || isJuror;
      const isOwnerOrAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]) || isDirector;

      let allowed: string[] = ['ver descripción'];
      if (hasViewPermission) allowed.push('ver');
      if (isOwnerOrAdmin) allowed.push('editar');

      return {
        id: work.thesisWorkId,
        title: proposal?.title || 'Sin título',
        description: proposal?.description || 'Sin descripción disponible.',
        modality: proposal?.modality || 'No definida',
        state: work.state,
        maxDeliveryDate: maxDeliveryDateFormatted, // 👈 Vinculado correctamente
        allowedActions: allowed
      };
    });
  });

  ngOnInit(): void {
    // Listo para inicializaciones adicionales en caso de ser necesario
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
          title: 'Descripción del trabajo de grado',
          content: event.row.description
        });
        break;
      case 'ver':
        this.router.navigate(['/thesis-work/details', event.row.id]);
        break;
    }
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
