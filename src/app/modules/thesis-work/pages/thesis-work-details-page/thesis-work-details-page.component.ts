import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { User } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-thesis-work-details-page',
  templateUrl: './thesis-work-details-page.component.html',
  styleUrls: ['./thesis-work-details-page.component.css'],
  imports: [ButtonComponent]
})
export class ThesisWorkDetailsPageComponent implements OnInit {

  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);

  thesisWorkDetails = signal<ThesisWork | null>(null);

  mainDocument = computed<FileDocument | null>(() => {
    const currentWork = this.thesisWorkDetails();
    if (!currentWork || !currentWork.preliminaryDraftData) return null;
    const preliminaryDraft = currentWork.preliminaryDraftData;
    const evaluations = preliminaryDraft.evaluations || [];

    const consejoEvaluations = evaluations.filter(e =>
      e.evaluatorRole && e.evaluatorRole.toUpperCase().includes('CONSEJO')
    );

    if (consejoEvaluations.length > 0) {
      const lastConsejoEval = consejoEvaluations[consejoEvaluations.length - 1];
      if (lastConsejoEval.signedDocuments && lastConsejoEval.signedDocuments.length > 0) {
        const resolutionUrl = lastConsejoEval.signedDocuments[lastConsejoEval.signedDocuments.length - 1];
        const allSystemDocs = [
          ...(preliminaryDraft.documents || []),
          ...(currentWork.documents || [])
        ];
        const exactDocument = allSystemDocs.find(doc =>
          doc.url === resolutionUrl && doc.id !== lastConsejoEval.documentId
        );
        if (exactDocument) {
          return exactDocument;
        }
        let realName = 'Resolucion_Aprobacion_Consejo.pdf';
        try {
          const decodedUrl = decodeURIComponent(resolutionUrl);
          let fileNameFromUrl = decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1).split('?')[0];
          if (fileNameFromUrl.includes('%2F')) {
            fileNameFromUrl = fileNameFromUrl.substring(fileNameFromUrl.lastIndexOf('%2F') + 3);
          } else if (fileNameFromUrl.includes('/')) {
            fileNameFromUrl = fileNameFromUrl.substring(fileNameFromUrl.lastIndexOf('/') + 1);
          }

          if (fileNameFromUrl && fileNameFromUrl.trim() !== '') {
            realName = fileNameFromUrl;
          }
        } catch (error) {
          console.warn('No se pudo procesar el nombre real desde la URL del modal.', error);
        }
        return {
          id: lastConsejoEval.id,
          name: realName,
          url: resolutionUrl,
          uploadDate: lastConsejoEval.date,
          type: DocumentType.RESOLUCION
        };
      }
    }
    const draftDocs = preliminaryDraft.documents || [];
    const resolutionInDraft = draftDocs.find(doc => doc.type === DocumentType.RESOLUCION);
    if (resolutionInDraft) return resolutionInDraft;

    const directDocs = currentWork.documents || [];
    return directDocs.find(doc => doc.type === DocumentType.RESOLUCION) || null;
  });

  ngOnInit(): void {
    const thesisWorkId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!thesisWorkId) {
      this.handleNavigationError();
      return;
    }

    this.thesisWorkService.getThesisWorkByIdMock(thesisWorkId).subscribe({
      next: (foundData) => {
        if (foundData) {
          this.thesisWorkDetails.set(foundData);
        } else {
          this.showNotFoundNotification();
          this.goBack();
        }
      },
      error: (error) => {
        this.showErrorNotification();
        this.goBack();
        console.error('Error al recuperar detalles del trabajo de grado:', error);
      }
    });
  }

  getMemberName(userId: string | undefined): string {
    return this.userService.getUserFullName(userId);
  }

  getAuthors(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  downloadDocument(): void {
    const targetDocument = this.mainDocument();

    if (!targetDocument?.url) {
      this.showDownloadFileErrorNotification();
      return;
    }

    this.showDownloadFileInfoNotification();
    this.downloadService.download(targetDocument.url, targetDocument.name);
    this.showDownloadFileSuccessNotification();
  }

  public goBack(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/history')){
      this.router.navigate(['/history']);
    } else {
      this.router.navigate(['/thesis-work']);
    }
  }

  private showDownloadFileSuccessNotification(): void {
    this.notificationService.show({
      title: 'Descarga exitosa',
      message: 'El archivo original del proyecto se ha guardado en su equipo.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showDownloadFileInfoNotification(): void {
    this.notificationService.show({
      title: 'Iniciando transferencia',
      message: 'Estamos localizando y preparando el documento para su descarga...',
      type: NotificationType.INFO
    });
  }

  private showDownloadFileErrorNotification(): void {
    this.notificationService.show({
      title: 'Archivo no disponible',
      message: 'No se encontró un documento raíz válido vinculado a este trabajo de grado.',
      type: NotificationType.ERROR
    });
  }

  private handleNavigationError(): void {
    this.notificationService.show({
      title: 'Identificador faltante',
      message: 'No se pudo procesar la solicitud debido a un ID de trabajo de grado inválido.',
      type: NotificationType.ERROR
    });
    this.goBack();
  }

  private showNotFoundNotification(): void {
    this.notificationService.show({
      title: 'Registro inexistente',
      message: 'El trabajo de grado solicitado no se encuentra registrado en el sistema.',
      type: NotificationType.ERROR
    });
  }

  private showErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de comunicación',
      message: 'Hubo un problema al intentar conectar con el repositorio de trabajos de grado.',
      type: NotificationType.ERROR
    });
  }
}


