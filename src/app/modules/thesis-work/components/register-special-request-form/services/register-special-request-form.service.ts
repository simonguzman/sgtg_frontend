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

  readonly requestOptions = Object.values(SpecialRequestType);

  // ← nonNullable.group con valor inicial tipado explícitamente evita el cast
  // `as { requestType: SpecialRequestType; comments: string }` que tenía el
  // submit() original. getRawValue() ya devuelve el tipo correcto.
  readonly form = this.fb.nonNullable.group({
    requestType: ['' as SpecialRequestType | '', Validators.required],
    comments:    ['', Validators.required]
  });

  getStudentNames(thesisWork: ThesisWork): string   { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }

  notifyIncompleteForm(): void {
    this.notificationService.show({
      title:   'Formulario incompleto',
      message: 'Por favor, seleccione un tipo de solicitud e incluya la justificación requerida.',
      type:    NotificationType.ERROR
    });
  }
}
