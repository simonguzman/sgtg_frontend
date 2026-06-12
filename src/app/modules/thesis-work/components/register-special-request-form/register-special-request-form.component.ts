import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { ThesisWork, SpecialRequestType } from '../../interfaces/thesis-work.interface';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";

@Component({
  selector: 'app-register-special-request-form',
  templateUrl: './register-special-request-form.component.html',
  styleUrls: ['./register-special-request-form.component.css'],
  imports: [ReactiveFormsModule, ButtonComponent, InfoBannerComponent]
})
export class RegisterSpecialRequestFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;

  @Output() onSaveRequest = new EventEmitter<{ requestType: SpecialRequestType; comments: string }>();

  readonly requestOptions = Object.values(SpecialRequestType);
  isSubmitAttempted = signal(false);

  readonly requestForm = this.fb.group({
    requestType: ['', Validators.required],
    comments: ['', Validators.required]
  });

  // ─── Miembros ─────────────────────────────────────────────────────────────────

  getStudentNames(): string {
    return this.userService.getAuthorsNames(this.thesisWork.preliminaryDraftData?.proposalData?.authors);
  }

  getDirectorName(): string {
    return this.userService.getUserFullName(this.thesisWork.preliminaryDraftData?.proposalData?.director?.id);
  }

  getCodirectorName(): string {
    const codirector = this.thesisWork.preliminaryDraftData?.proposalData?.codirector;
    return codirector?.id ? this.userService.getUserFullName(codirector.id) : '';
  }

  getAdvisorName(): string {
    const advisor = this.thesisWork.preliminaryDraftData?.proposalData?.advisor;
    return advisor?.id ? this.userService.getUserFullName(advisor.id) : '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.requestForm.get(fieldName);
    return !!(this.isSubmitAttempted() && control?.invalid) || !!(control?.invalid && control?.touched);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  submit(): void {
    this.isSubmitAttempted.set(true);
    this.requestForm.markAllAsTouched();

    if (this.requestForm.invalid) {
      this.notificationService.show({
        title: 'Formulario incompleto',
        message: 'Por favor, seleccione un tipo de solicitud e incluya la justificación requerida.',
        type: NotificationType.ERROR
      });
      return;
    }

    this.onSaveRequest.emit(this.requestForm.value as { requestType: SpecialRequestType; comments: string });
  }
}
