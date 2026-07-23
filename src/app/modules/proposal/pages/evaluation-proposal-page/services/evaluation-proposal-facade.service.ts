import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { UserService } from '../../../../users/services/user.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';

const RESULT_TO_STATE: Record<string, stateList> = {
  'Aprobado': stateList.APROBADO,
  'No aprobado': stateList.NO_APROBADO
};

@Injectable({ providedIn: 'root' })
export class EvaluationProposalFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  public load(
    id: string,
    onSuccess: (proposal: Proposal) => void,
    onNotFound: () => void
  ): void {
    this.proposalService.getProposalByIdMock(id)
      .pipe(first())
      .subscribe({
        next: (data) => data ? onSuccess(data) : onNotFound(),
        error: () => onNotFound()
      });
  }

  public downloadOriginalDocument(proposal: Proposal): void {
    const document = proposal.documents?.[0] ?? null;
    if (!document?.url?.trim()) {
      this.showNotification(
        'Error de descarga',
        'No se pudo obtener el documento original. Contacte a soporte técnico.',
        NotificationType.ERROR
      );
      return;
    }
    this.showNotification(
      'Descarga iniciada',
      'Descargando la propuesta original para su revisión...',
      NotificationType.INFO
    );
    this.downloadService.download(document.url, document.name);
  }

  public saveEvaluation(
    event: { result: string; comments: string; signedFileName: string },
    proposal: Proposal,
    route: ActivatedRoute,
    onError: () => void
  ): void {
    const currentUser = this.authService.currentUser();

    const targetDocument = [...(proposal.documents ?? [])]
      .filter(document => document.type === DocumentType.PROPUESTA || document.type === DocumentType.CORRECCION)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())[0];

    if (!proposal.id || !currentUser || !targetDocument) {
      this.showNotification(
        'Error de servidor',
        'Hubo un problema al guardar la evaluación. Intente nuevamente en unos minutos.',
        NotificationType.ERROR
      );
      onError();
      return;
    }

    const newEvaluation: Evaluation = {
      id: crypto.randomUUID(),
      proposalId: proposal.id,
      documentId: targetDocument.id,
      evaluatorId:  currentUser.id,
      evaluatorName: this.userService.getUserFullName(currentUser.id),
      evaluatorRole: currentUser.roles[0] ?? 'Evaluador',
      signedDocuments: [event.signedFileName],
      veredict: RESULT_TO_STATE[event.result] ?? proposal.state,
      observations: event.comments,
      date: new Date()
    };

    this.proposalService.addEvaluationMock(proposal.id, newEvaluation)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            'Evaluación registrada',
            'La decisión del comité ha sido guardada y el estado de la propuesta actualizado.',
            NotificationType.CONFIRMATION
          );
          this.router.navigate(['../../'], { relativeTo: route });
        },
        error: () => {
          this.showNotification(
            'Error de servidor',
            'Hubo un problema al guardar la evaluación. Intente nuevamente en unos minutos.',
            NotificationType.ERROR
          );
          onError();
        }
      });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
