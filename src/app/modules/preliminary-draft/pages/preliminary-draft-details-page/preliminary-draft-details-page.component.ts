import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { User } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-preliminary-draft-details-page',
  templateUrl: './preliminary-draft-details-page.component.html',
  styleUrls: ['./preliminary-draft-details-page.component.css'],
  imports: [ButtonComponent]
})
export class PreliminaryDraftDetailsPageComponent implements OnInit {
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);

  preliminayDraftDetails = signal<PreliminaryDraft | null>(null);

  mainDocument = computed(() => {
    const currentPreliminaryDraft = this.preliminayDraftDetails();
    if (!currentPreliminaryDraft) return null;
    return currentPreliminaryDraft.documents.find(document => document.type === 'Anteproyecto')
           || currentPreliminaryDraft.documents[0]
           || null;
  });

  ngOnInit(): void {
    const preliminaryDraftId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!preliminaryDraftId) {
      this.handleNavigationError();
      return;
    }
    this.preliminaryDraftService.getPreliminaryDraftByIdMock(preliminaryDraftId).subscribe({
      next: (foundData) => {
        if (foundData) {
          this.preliminayDraftDetails.set(foundData);
        } else {
          this.showNotFoundNotification();
          this.goBack();
        }
      },
      error: (error) => {
        this.showErrorNotification();
        this.router.navigate(['/preliminary-draft']);
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
      this.router.navigate(['/preliminary-draft']);
    }
  }

  private showDownloadFileSuccessNotification(): void {
    this.notificationService.show({
      title: 'Descarga exitosa',
      message: 'El archivo del anteproyecto se ha guardado en su equipo.',
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
      message: 'No se encontró un documento válido vinculado a este anteproyecto.',
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
