import { Component, inject, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ProposalService } from '../../services/proposal.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../../core/models/user-role';
import { Proposal } from '../../interfaces/proposal.interface';
import { ProposalFormComponent } from '../../components/proposal-form/proposal-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({
  selector: 'app-proposal-create-page',
  imports: [ProposalFormComponent, ConfirmationActionModalComponent],
  templateUrl: './proposal-create-page.component.html',
  styleUrls: ['./proposal-create-page.component.css']
})
export class ProposalCreatePageComponent implements OnInit {
  private readonly proposalService = inject(ProposalService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  confirmState = {
    show:        false,
    pendingData: null as Proposal | null
  };

  ngOnInit(): void {
    if(!this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR])){
      this.showAccessDeniedNotification();
      this.router.navigate(['/proposal']);
    }
  }

  handleCreateProposal(proposalData: Proposal): void {
    // 👇 Aplicamos la misma validación de reglas de negocio que en la edición
    const errorMessage = this.proposalService.validateProposalRules(proposalData);

    if (errorMessage) {
      // Si la regla se rompe (ej. el estudiante ya tiene 2 propuestas), bloqueamos el registro
      this.notificationService.show({
        title: 'Atención',
        message: errorMessage,
        type: NotificationType.ERROR
      });
      return;
    }

    // Si todo está correcto, abrimos el modal de confirmación
    this.confirmState = { show: true, pendingData: proposalData };
  }

  confirmCreation(): void {
    if (!this.confirmState.pendingData) return;

    this.confirmState.show = false;
    this.showProcessingCreateProposalNotification();

    this.proposalService.createProposalMock(this.confirmState.pendingData).subscribe({
      next: () => {
        this.handleCreationSuccess();
      },
      error: (err) => {
        this.showCreateProposalErrorNotification();
        console.error(err);
      }
    });
  }

  cancelCreation(): void {
    this.confirmState = { show: false, pendingData: null };
  }

  goBack(): void {
    this.location.back();
  }

  private handleCreationSuccess(): void {
    this.showCreateProposalSuccessNotification();
    this.confirmState = { show: false, pendingData: null };
    this.router.navigate(['/proposal']);
  }

  private showAccessDeniedNotification() {
    this.notificationService.show({
      title: 'Acceso Denegado',
      message: 'No tienes los permisos requeridos para registrar propuestas.',
      type: NotificationType.ERROR
    });
  }

  private showProcessingCreateProposalNotification() {
    this.notificationService.show({
      title: 'Procesando registro',
      message: 'Estamos guardando la información de la propuesta en el sistema...',
      type: NotificationType.INFO
    });
  }

  private showCreateProposalSuccessNotification() {
    this.notificationService.show({
      title: '¡Propuesta registrada!',
      message: 'La propuesta ha sido creada exitosamente y ya puede ser gestionada.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showCreateProposalErrorNotification() {
    this.notificationService.show({
      title: 'Error de servidor',
      message: 'No se pudo completar el registro. Por favor, intente nuevamente más tarde.',
      type: NotificationType.ERROR
    });
  }
}
