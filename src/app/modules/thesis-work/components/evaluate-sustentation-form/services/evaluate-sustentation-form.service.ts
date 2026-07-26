import { inject, Injectable } from '@angular/core';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';

// Sin FormGroup: este componente usa signals simples (verdictSelected, observations),
// así que el servicio se enfoca únicamente en formateo de participantes,
// resolución de documentos y notificaciones.
@Injectable()
export class EvaluateSustentationFormService {
  private readonly userService         = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly documentResolver    = inject(ThesisFinalDeliveryDocumentResolverService);

  getStudentNames(thesisWork: ThesisWork): string {
    return this.userService.getAuthorsNames(
      thesisWork?.preliminaryDraftData?.proposalData?.authors ?? []
    );
  }

  getMemberName(id: string | undefined): string {
    return id ? this.userService.getUserFullName(id) : '';
  }

  getAssignedJurors(sustentation: SustentationRegistry | null): string {
    const jurors = sustentation?.assignedJurors ?? [];
    if (jurors.length === 0) return 'No asignados';
    return jurors.map((j: User) => this.userService.getUserFullName(j.id)).join(' y ');
  }

  getExistingDocument(thesisWork: ThesisWork, type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();
    if (targetType === 'MONOGRAFIA' || targetType === 'ANEXOS') {
      return this.documentResolver.resolveLatestFinalDeliveryDocument(thesisWork, targetType);
    }
    return null;
  }

  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title:   'Archivo adjunto',
      message: `El acta de sustentación ${fileName} se ha adjuntado correctamente.`,
      type:    NotificationType.INFO
    });
  }

  notifyMissingVerdict(): void {
    this.notificationService.show({
      title:   'Falta calificación',
      message: 'Debe seleccionar obligatoriamente una calificación para la sustentación.',
      type:    NotificationType.ERROR
    });
  }

  notifyMissingFile(): void {
    this.notificationService.show({
      title:   'Formato faltante',
      message: 'Debe adjuntar obligatoriamente el Formato de Sustentación con los resultados firmados.',
      type:    NotificationType.ERROR
    });
  }
}
