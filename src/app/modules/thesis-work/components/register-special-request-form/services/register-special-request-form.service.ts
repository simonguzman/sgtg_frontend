import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';

@Injectable()
export class RegisterSpecialRequestFormService {
  private readonly fb                  = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly participants        = inject(ThesisParticipantsFormatterService);

  public readonly requestOptions = Object.values(SpecialRequestType);

  // Mantenemos el nonNullable para evitar validaciones de null en el submit.
  // El casteo a SpecialRequestType | '' es correcto para iniciar un select estricto vacío.
  public readonly form = this.fb.nonNullable.group({
    requestType: ['' as SpecialRequestType | '', [Validators.required]],
    comments:    ['', [Validators.required]]
  });

  public getStudentNames(thesisWork: ThesisWork): string {
    return this.participants.getStudentNames(thesisWork);
  }

  public getDirectorName(thesisWork: ThesisWork): string {
    return this.participants.getDirectorName(thesisWork);
  }

  public getCodirectorName(thesisWork: ThesisWork): string {
    return this.participants.getCodirectorName(thesisWork);
  }

  public getAdvisorName(thesisWork: ThesisWork): string {
    return this.participants.getAdvisorName(thesisWork);
  }

  public notifyIncompleteForm(): void {
    this.notificationService.show({
      title:   'Formulario incompleto',
      message: 'Por favor, seleccione un tipo de solicitud e incluya la justificación requerida.',
      type:    NotificationType.ERROR
    });
  }
}
