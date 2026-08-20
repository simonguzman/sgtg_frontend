import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { stateList } from '../../../../../core/enums/state.enum';

type SpecialRequestVerdict = stateList.APROBADO | stateList.NO_APROBADO;

@Injectable({ providedIn: 'root' })
export class EvaluateSpecialRequestFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWorkAndRequest(
    thesisId: string,
    requestId: string,
    onSuccess: (work: ThesisWork, request: SpecialRequest) => void,
    onError: () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(thesisId).pipe(first()).subscribe({
      next: (data) => {
        // ← FIX: antes `if (!data) return;` dejaba la página cargando
        // indefinidamente sin notificar ni redirigir — inconsistente con
        // RegisterSpecialRequestFacadeService.loadThesisWork, que sí
        // maneja este caso. Ahora ambos facades se comportan igual, y no
        // hizo falta tocar la firma: el mismo onError() que ya se usa para
        // "solicitud no encontrada" sirve también aquí.
        if (!data) {
          this.showError('El trabajo de grado especificado no existe.');
          onError();
          return;
        }
        const request = data.specialRequests?.find((req: SpecialRequest) => req.id === requestId);
        if (!request) {
          this.showError('No se encontró la solicitud especial especificada.');
          onError();
          return;
        }
        onSuccess(data, request);
      },
      error: () => {
        this.showError('No se pudo recuperar la información del proyecto.');
        onError();
      }
    });
  }

  public processEvaluation(
    thesisId: string,
    requestId: string,
    payload: { status: SpecialRequestVerdict; resolutionDetails: string; grantedDeadline?: Date },
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.evaluateSpecialRequestMock(thesisId, requestId, payload)
      .pipe(first())
      .subscribe({
        next: () => {
          this.notificationService.show({
            title:   'Evaluación Registrada',
            message: 'La evaluación de la solicitud ha sido guardada correctamente.',
            type:    NotificationType.CONFIRMATION
          });
          onSuccess();
        },
        error: () => {
          this.notificationService.show({
            title:   'Error de Red',
            message: 'Fallo la comunicación al almacenar la evaluación.',
            type:    NotificationType.ERROR
          });
          onError();
        }
      });
  }

  private showError(message: string): void {
    this.notificationService.show({ title: 'Error de carga', message, type: NotificationType.ERROR });
  }
}
