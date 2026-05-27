import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ProposalService } from '../../services/proposal.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { Proposal } from '../../interfaces/proposal.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { ProposalFormComponent } from "../../components/proposal-form/proposal-form.component";
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../core/models/user-role';

@Component({
  selector: 'app-proposal-edit-page',
  templateUrl: './proposal-edit-page.component.html',
  styleUrls: ['./proposal-edit-page.component.css'],
  imports: [ConfirmationActionModalComponent, ProposalFormComponent]
})
export class ProposalEditPageComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly proposalService = inject(ProposalService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  proposalToEdit = signal<Proposal | null>(null);

  confirmState = {
    show:        false,
    pendingData: null as Proposal | null
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    id ? this.loadProposalData(id) : this.router.navigate(['/proposal']);
  }

  private loadProposalData(id: string): void {
    this.proposalService.getProposalByIdMock(id).subscribe({
      next: (found) => {
        if (found) {
          const currentUser = this.authService.currentUser();
          const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
          const isOwner = found.director?.id === currentUser?.id;
          if (!isAdmin && !isOwner) {
            this.handleUpdateError('No tienes permisos para editar esta propuesta.');
            this.router.navigate(['/proposal']);
            return;
          }
          this.proposalToEdit.set({ ...found });
        } else {
          this.handleNotFound();
        }
      }
    });
  }

  handleUpdate(updatedData: Proposal): void {
    const errorMessage = this.proposalService.validateProposalRules(updatedData);

    if (errorMessage) {
      this.showUpdateErrorNotification(errorMessage)
      return;
    }
    this.confirmState = { show: true, pendingData: updatedData };
  }

  confirmUpdate(): void {
    const currentProposal = this.proposalToEdit();
    const dataToSave = this.confirmState.pendingData;
    if (!currentProposal?.id || !dataToSave) return;
    this.showUpdateInfoNotification();
    this.proposalService.updateProposalMock(currentProposal.id, dataToSave).subscribe({
      next: () => this.handleUpdateSuccess(),
      error: () => this.handleUpdateError()
    });
  }

  cancelUpdate(): void {
    this.confirmState = { show: false, pendingData: null };
  }

  goBack(): void {
    this.location.back();
  }

  private handleUpdateSuccess(): void {
    this.showUpdateSuccessNotification();
    this.confirmState = { show: false, pendingData: null };
    this.router.navigate(['/proposal']);
  }

  private handleUpdateError(customMessage?: string): void {
    this.showUpdateErrorNotification(customMessage);
    this.confirmState.show = false;
  }

  private handleNotFound(): void {
    this.showNotFoundNotification();
    this.router.navigate(['/proposal']);
  }

  private showUpdateInfoNotification() {
    this.notificationService.show({
      title: 'Procesando actualización',
      message: 'Estamos guardando los cambios en la propuesta...',
      type: NotificationType.INFO
    });
  }

  private showUpdateSuccessNotification() {
    this.notificationService.show({
      title: '¡Actualización exitosa!',
      message: 'La información de la propuesta se ha modificado correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showUpdateErrorNotification(customMessage?: string) {
    this.notificationService.show({
      title: 'Error de actualización',
      message: customMessage || 'No se pudieron guardar los cambios. Por favor, intente de nuevo.',
      type: NotificationType.ERROR
    });
  }

  private showNotFoundNotification() {
    this.notificationService.show({
      title: 'Atención',
      message: 'La propuesta que intenta editar no fue encontrada en el sistema.',
      type: NotificationType.ERROR
    });
    this.router.navigate(['/proposal']);
  }
}
