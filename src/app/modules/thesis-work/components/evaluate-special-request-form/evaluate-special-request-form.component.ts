import { Component, EventEmitter, inject, Input, Output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';

import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";

@Component({
  selector: 'app-evaluate-special-request-form',
  templateUrl: './evaluate-special-request-form.component.html',
  styleUrls: ['./evaluate-special-request-form.component.css'],
  imports: [ButtonComponent, DatePicker, FormsModule, InfoBannerComponent]
})
export class EvaluateSpecialRequestFormComponent {
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input({ required: true }) specialRequest!: SpecialRequest;
  @Input() isSubmitting = false;

  @Output() onSave = new EventEmitter<{ status: stateList; resolutionDetails: string; grantedDeadline?: Date }>();
  @Output() onBack = new EventEmitter<void>();

  verdictSelected = signal<stateList | null>(null);
  observations = signal<string>('');
  grantedDeadline = signal<Date | null>(null);
  isSubmitAttempted = signal(false);

  public get states(): typeof stateList {
    return stateList;
  }

  requiresNewDeadline = computed(() => {
    const isApproved = this.verdictSelected() === stateList.APROBADO;
    const type = this.getRequestType() as SpecialRequestType;
    return isApproved && (type === SpecialRequestType.PRORROGA || type === SpecialRequestType.SUSPENSION);
  });

  getStudentNames(): string {
    const authors = this.thesisWork?.preliminaryDraftData?.proposalData?.authors || [];
    return this.userService.getAuthorsNames(authors);
  }

  getDirectorName(): string {
    const directorId = this.thesisWork?.preliminaryDraftData?.proposalData?.director?.id;
    return directorId ? this.userService.getUserFullName(directorId) : 'No asignado';
  }

  getCodirectorName(): string {
    const codirectorId = this.thesisWork?.preliminaryDraftData?.proposalData?.codirector?.id;
    return codirectorId ? this.userService.getUserFullName(codirectorId) : '';
  }

  getAdvisorName(): string {
    const advisorId = this.thesisWork?.preliminaryDraftData?.proposalData?.advisor?.id;
    return advisorId ? this.userService.getUserFullName(advisorId) : '';
  }

  getRequestType(): string {
    return (this.specialRequest as any).requestType || SpecialRequestType.PRORROGA;
  }

  submit(): void {
    this.isSubmitAttempted.set(true);

    const currentVerdict = this.verdictSelected();

    if (!currentVerdict) {
      this.notificationService.show({
        title: 'Falta calificación',
        message: 'Debe seleccionar si la solicitud cumple o no con los requisitos.',
        type: NotificationType.ERROR
      });
      return;
    }

    if (this.requiresNewDeadline() && !this.grantedDeadline()) {
      this.notificationService.show({
        title: 'Fecha requerida',
        message: 'Debe asignar la nueva fecha límite de entrega para autorizar la solicitud.',
        type: NotificationType.ERROR
      });
      return;
    }

    this.onSave.emit({
      status: currentVerdict,
      resolutionDetails: this.observations(),
      grantedDeadline: this.grantedDeadline() || undefined
    });
  }
}
