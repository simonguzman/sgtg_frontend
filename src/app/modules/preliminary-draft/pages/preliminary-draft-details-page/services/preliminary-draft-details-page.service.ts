import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../../users/interfaces/user.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { resolveApprovedEvaluationDocument } from '../../../../../core/utils/evaluation-utils';

@Injectable()
export class PreliminaryDraftDetailsPageService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);

  readonly preliminaryDraftDetails = signal<PreliminaryDraft | null>(null);

  readonly approvedProposalDocument = computed<FormattedDocument | null>(() => {
    const evaluations = this.preliminaryDraftDetails()?.proposalData?.evaluations;
    return resolveApprovedEvaluationDocument(evaluations);
  });

  init(): void {
    const preliminaryDraftId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');

    if (!preliminaryDraftId) {
      this.handleNavigationError();
      return;
    }

    this.preliminaryDraftService.getPreliminaryDraftById(preliminaryDraftId).subscribe({
      next: (foundData) => {
        if (foundData) {
          this.preliminaryDraftDetails.set(foundData);
        } else {
          this.showNotFoundNotification();
          this.goBack();
        }
      },
      error: (error) => {
        this.showErrorNotification();
        void this.router.navigate(['/preliminary-draft']);
        console.error('Error al recuperar detalles:', error);
      }
    });
  }

  getMemberName(userId: string | undefined): string {
    return this.userService.getUserFullName(userId);
  }

  getAuthors(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  async downloadDocument(): Promise<void> {
    const targetDocument = this.approvedProposalDocument();
    if (!targetDocument?.url) {
      this.showDownloadFileErrorNotification();
      return;
    }
    this.showDownloadFileInfoNotification();
    try {
      await this.downloadService.download(targetDocument.url, targetDocument.name);
      this.showDownloadFileSuccessNotification();
    } catch (err) {
      console.error('Error al descargar el documento:', err);
      this.showDownloadFileErrorNotification();
    }
  }

  goBack(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/history')) {
      void this.router.navigate(['/history']);
    } else {
      void this.router.navigate(['/preliminary-draft']);
    }
  }

  navigateToEvaluations(): void {
    void this.router.navigate(['evaluations_performed'], { relativeTo: this.route });
  }

  navigateToDocuments(): void {
    void this.router.navigate(['loaded_documents'], { relativeTo: this.route });
  }

  private showDownloadFileSuccessNotification(): void {
    this.notificationService.show({
      title: 'Descarga exitosa',
      message: 'El formato de evaluación se ha guardado en su equipo.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showDownloadFileInfoNotification(): void {
    this.notificationService.show({
      title: 'Iniciando transferencia',
      message: 'Estamos preparando el documento para la descarga...',
      type: NotificationType.INFO
    });
  }

  private showDownloadFileErrorNotification(): void {
    this.notificationService.show({
      title: 'Archivo no disponible',
      message: 'No se encontró el formato de evaluación aprobado por el comité para esta propuesta.',
      type: NotificationType.ERROR
    });
  }

  private handleNavigationError(): void {
    this.notificationService.show({
      title: 'Identificador faltante',
      message: 'No se pudo cargar la información porque el ID del anteproyecto no es válido.',
      type: NotificationType.ERROR
    });
    this.goBack();
  }

  private showNotFoundNotification(): void {
    this.notificationService.show({
      title: 'Registro inexistente',
      message: 'El anteproyecto solicitado no se encuentra en nuestra base de datos.',
      type: NotificationType.ERROR
    });
  }

  private showErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de servidor',
      message: 'Hubo un problema al intentar conectar con el servicio de datos.',
      type: NotificationType.ERROR
    });
  }
}
