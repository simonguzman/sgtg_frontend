import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';

import { PreliminaryDraftFormComponent } from "../../components/preliminary-draft-form/preliminary-draft-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";

@Component({
  selector: 'app-preliminary-draft-create-page',
  templateUrl: './preliminary-draft-create-page.component.html',
  styleUrls: ['./preliminary-draft-create-page.component.css'],
  imports: [PreliminaryDraftFormComponent, ConfirmationActionModalComponent]
})
export class PreliminaryDraftCreatePageComponent implements OnInit {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  confirmState = signal({
    isOpen: false,
    pendingData: null as PreliminaryDraft | null,
    isProcessing: false
  });

  ngOnInit(): void {
    const hasRequiredRoles = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DIRECTOR
    ]);
    if (!hasRequiredRoles) {
      this.showAccessDeniedNotification();
      this.router.navigate(['/preliminary-draft']);
    }
  }

  handleCreatePreliminaryDraft(preliminaryDraft: PreliminaryDraft): void {
    this.confirmState.set({
      isOpen: true,
      pendingData: preliminaryDraft,
      isProcessing: false
    });
  }

  confirmCreation(): void {
    const { pendingData, isProcessing } = this.confirmState();
    if (!pendingData || isProcessing) return;
    this.confirmState.update(state => ({ ...state, isProcessing: true }));
    this.showProcessingNotification();
    this.preliminaryDraftService.createPreliminaryDraftMock(pendingData).subscribe({
      next: () => this.handleCreationSuccess(),
      error: (error) => {
        console.error('Error al registrar anteproyecto:', error);
        this.confirmState.update(state => ({ ...state, isProcessing: false, isOpen: false }));
        this.showCreationErrorNotification();
      }
    });
  }

  cancelCreation(): void {
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
  }

  goBack(): void {
    this.location.back();
  }

  private handleCreationSuccess(): void {
    this.showSuccessNotification();
    this.confirmState.set({ isOpen: false, pendingData: null, isProcessing: false });
    this.router.navigate(['/preliminary-draft']);
  }

  private showSuccessNotification(): void {
    this.notificationService.show({
      title: '¡Registro exitoso!',
      message: 'El anteproyecto ha sido creado correctamente y está listo para evaluación.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showAccessDeniedNotification(): void {
    this.notificationService.show({
      title: 'Acceso restringido',
      message: 'No cuenta con los permisos necesarios para registrar nuevos anteproyectos.',
      type: NotificationType.ERROR
    });
  }

  private showProcessingNotification(): void {
    this.notificationService.show({
      title: 'Procesando solicitud',
      message: 'Guardando la información del anteproyecto en el sistema...',
      type: NotificationType.INFO
    });
  }

  private showCreationErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de registro',
      message: 'Hubo un problema al intentar guardar el anteproyecto. Por favor, intente de nuevo.',
      type: NotificationType.ERROR
    });
  }
}
