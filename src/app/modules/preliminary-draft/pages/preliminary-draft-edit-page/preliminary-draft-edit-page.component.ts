import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../../core/models/user-role';

import { PreliminaryDraftFormComponent } from "../../components/preliminary-draft-form/preliminary-draft-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";

@Component({
  selector: 'app-preliminary-draft-edit-page',
  templateUrl: './preliminary-draft-edit-page.component.html',
  styleUrls: ['./preliminary-draft-edit-page.component.css'],
  imports: [PreliminaryDraftFormComponent, ConfirmationActionModalComponent, InfoBannerComponent]
})
export class PreliminaryDraftEditPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  preliminaryDraftToEdit = signal<PreliminaryDraft | null>(null);

  confirmState = signal({
    isOpen: false,
    pendingData: null as PreliminaryDraft | null,
    isProcessing: false
  });

  ngOnInit(): void {
    const draftId = this.route.snapshot.paramMap.get('id');
    draftId ? this.loadPreliminaryDraftData(draftId) : this.router.navigate(['/preliminary-draft']);
  }

  private loadPreliminaryDraftData(id: string): void {
    this.preliminaryDraftService.getPreliminaryDraftByIdMock(id).subscribe({
      next: (foundDraft) => {
        if (foundDraft) {
          const currentUser = this.authService.currentUser();
          const currentUserId = currentUser?.id;

          const hasAdminPrivileges = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
          const isDraftOwner = foundDraft.proposalData.director?.id === currentUserId;

          if (!hasAdminPrivileges && !isDraftOwner) {
            this.handleUpdateError('No cuenta con los permisos necesarios para editar este registro.');
            this.router.navigate(['/preliminary-draft']);
            return;
          }

          this.preliminaryDraftToEdit.set({ ...foundDraft });
        } else {
          this.handleNotFound();
        }
      },
      error: () => this.handleUpdateError('Error al cargar la información del anteproyecto.')
    });
  }

  handleUpdate(updatedData: PreliminaryDraft): void {
    this.confirmState.set({
      isOpen: true,
      pendingData: updatedData,
      isProcessing: false
    });
  }

  confirmUpdate(): void {
    const currentDraft = this.preliminaryDraftToEdit();
    const { pendingData, isProcessing } = this.confirmState();

    if (!currentDraft?.preliminaryDraftId || !pendingData || isProcessing) return;

    this.confirmState.update(state => ({ ...state, isProcessing: true }));
    this.showUpdateInfoNotification();

    this.preliminaryDraftService.updatePreliminaryDraftMock(currentDraft.preliminaryDraftId, pendingData).subscribe({
      next: () => this.handleUpdateSuccess(),
      error: () => {
        this.confirmState.update(state => ({ ...state, isProcessing: false }));
        this.handleUpdateError();
      }
    });
  }

  cancelUpdate(): void {
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
  }

  goBack(): void {
    this.location.back();
  }

  private handleUpdateSuccess(): void {
    this.showUpdateSuccessNotification();
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
    this.router.navigate(['/preliminary-draft']);
  }

  private handleUpdateError(customMessage?: string): void {
    this.showUpdateErrorNotification(customMessage);
    this.confirmState.update(state => ({ ...state, isOpen: false }));
  }

  private handleNotFound(): void {
    this.showNotFoundNotification();
    this.router.navigate(['/preliminary-draft']);
  }

  private showUpdateInfoNotification() {
    this.notificationService.show({
      title: 'Actualizando registro',
      message: 'Procesando los cambios en el anteproyecto...',
      type: NotificationType.INFO
    });
  }

  private showUpdateSuccessNotification() {
    this.notificationService.show({
      title: '¡Cambios guardados!',
      message: 'El anteproyecto ha sido actualizado correctamente.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showUpdateErrorNotification(customMessage?: string) {
    this.notificationService.show({
      title: 'Error de guardado',
      message: customMessage || 'No se pudieron aplicar los cambios. Verifique su conexión e intente nuevamente.',
      type: NotificationType.ERROR
    });
  }

  private showNotFoundNotification() {
    this.notificationService.show({
      title: 'Registro no encontrado',
      message: 'El anteproyecto solicitado no existe o ha sido eliminado.',
      type: NotificationType.ERROR
    });
  }
}
