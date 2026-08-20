import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

@Injectable()
export class RegisterPazYSalvoFormService {
  private readonly notificationService = inject(NotificationService);
  // ← UserService eliminado: todo el formateo de participantes se delega
  // al servicio compartido del módulo.
  private readonly participants        = inject(ThesisParticipantsFormatterService);
  // ← NUEVO: resuelve documentos reutilizando el resolver compartido,
  // eliminando ~25 líneas que antes vivían duplicadas en el componente.
  private readonly documentResolver    = inject(ThesisFinalDeliveryDocumentResolverService);

  getStudentNames(thesisWork: ThesisWork): string   { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }

  /**
   * NOTA DE COMPORTAMIENTO: la versión anterior (en el componente) buscaba
   * primero una entrega con status EN_REVISION y solo caía a finalDeliveries[0]
   * si ninguna lo estaba. El resolver compartido, en cambio, ordena por
   * uploadDate descendente y toma la más reciente sin mirar el status.
   * En la práctica ambos coinciden: ThesisWorkDeliveryService siempre inserta
   * con unshift() y solo muta el índice 0, así que finalDeliveries[0] es
   * consistentemente la entrega más reciente Y la que refleja el estado
   * vigente. Si algún día el arreglo dejara de mantenerse en ese orden,
   * este comportamiento podría divergir del original — señalado por si
   * prefieres conservar la lógica anterior en vez de esta unificación.
   */
  getExistingDocument(thesisWork: ThesisWork, type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();
    const normalizedType = targetType === 'FORMATO' ? 'FORMATO_E' : targetType;

    if (normalizedType === 'MONOGRAFIA' || normalizedType === 'FORMATO_E' || normalizedType === 'ANEXOS') {
      return this.documentResolver.resolveLatestFinalDeliveryDocument(thesisWork, normalizedType);
    }
    return null;
  }

  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title:   'Archivo adjunto',
      message: `El documento ${fileName} se ha adjuntado correctamente.`,
      type:    NotificationType.INFO
    });
  }

  notifyMissingEvaluations(): void {
    this.notificationService.show({
      title:   'Faltan evaluaciones',
      message: 'Debe marcar si cumple o no cumple en ambas revisiones (Académica y Financiera).',
      type:    NotificationType.ERROR
    });
  }

  notifyMissingDocument(): void {
    this.notificationService.show({
      title:   'Documento faltante',
      message: 'Debe adjuntar obligatoriamente el Formato de Paz y Salvo firmado.',
      type:    NotificationType.ERROR
    });
  }
}
