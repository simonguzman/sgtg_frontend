import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { SpecialRequest, ThesisWork } from '../../interfaces/thesis-work.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";

@Component({
  selector: 'app-evaluate-special-request-form',
  templateUrl: './evaluate-special-request-form.component.html',
  styleUrls: ['./evaluate-special-request-form.component.css'],
  imports: [ButtonComponent]
})
export class EvaluateSpecialRequestFormComponent {
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input({ required: true }) specialRequest!: SpecialRequest;
  @Input() isSubmitting = false;

  @Output() onSave = new EventEmitter<{ status: stateList; resolutionDetails: string }>();
  @Output() onBack = new EventEmitter<void>();

  verdictSelected = signal<stateList | null>(null);
  observations = signal<string>('');
  isSubmitAttempted = signal(false);

  public get states(): typeof stateList {
    return stateList;
  }

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
    return (this.specialRequest as any).requestType || 'Prórroga';
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

    this.onSave.emit({
      status: currentVerdict,
      resolutionDetails: this.observations()
    });
  }
}
