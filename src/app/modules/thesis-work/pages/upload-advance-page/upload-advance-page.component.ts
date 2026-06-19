import { Component, inject, OnInit, signal } from '@angular/core';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { forkJoin, Observable } from 'rxjs';
import { UploadAdvanceFormComponent } from "../../components/upload-advance-form/upload-advance-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { UploadAdvancePayload } from '../../interfaces/advance-playload.interface';

@Component({
  selector: 'app-upload-advance-page',
  imports: [UploadAdvanceFormComponent, ConfirmationActionModalComponent],
  templateUrl: './upload-advance-page.component.html',
  styleUrls: ['./upload-advance-page.component.css']
})
export class UploadAdvancePageComponent implements OnInit {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  thesisWorkState = signal<ThesisWork | null>(null);
  isConfirmModalOpen = signal(false);
  isSaving = signal(false);

  pendingAdvanceData = signal<UploadAdvancePayload | null>(null);

  ngOnInit() {
    let currentRoute = this.route;
    let id: string | null = null;
    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent!;
    }
    if (id) {
      this.loadThesisWork(id);
    } else {
      this.notification.show({
        title: 'Error de navegación',
        message: 'No se pudo identificar el identificador del trabajo de grado.',
        type: NotificationType.ERROR
      });
      this.navigateBack();
    }
  }

  private loadThesisWork(id: string) {
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (data) => {
        if (!data) {
          this.notification.show({
            title: 'No encontrado',
            message: 'El trabajo de grado solicitado no existe.',
            type: NotificationType.INFO
          });
          this.navigateBack();
          return;
        }
        this.thesisWorkState.set(data);
      },
      error: () => {
        this.notification.show({
          title: 'Error de conexión',
          message: 'No se pudo obtener la información del trabajo de grado.',
          type: NotificationType.ERROR
        });
      }
    });
  }

  handleSaveRequest(data: UploadAdvancePayload) {
    this.pendingAdvanceData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processAdvance() {
    const data = this.pendingAdvanceData();
    const thesisWork = this.thesisWorkState();
    const currentUser = this.authService.currentUser();
    if (!data || !thesisWork || !currentUser) return;
    this.isSaving.set(true);
    const globalAdvanceBlockId = crypto.randomUUID();
    const advanceMeta = {
      title: data.formValues.title,
      comments: data.formValues.comments,
      studentId: currentUser.id,
      advanceId: globalAdvanceBlockId
    };
    const documentsToUpload: Document[] = data.files.map(file => ({
      id: crypto.randomUUID(),
      name: `${data.formValues.title} - ${file.name}`,
      url: 'url-pendiente-de-carga-s3',
      type: DocumentType.AVANCE,
      uploadDate: new Date().toISOString()
    }));
    const uploadRequests: Observable<void>[] = documentsToUpload.map(doc =>
      this.thesisWorkService.uploadDocumentMock(
        thesisWork.thesisWorkId,
        doc,
        advanceMeta
      )
    );
    forkJoin(uploadRequests).subscribe({
      next: () => {
        this.notification.show({
          title: 'Avance registrado',
          message: 'Los archivos del avance han sido guardados y puestos en revisión exitosamente.',
          type: NotificationType.CONFIRMATION
        });
        this.isConfirmModalOpen.set(false);
        this.isSaving.set(false);
        this.navigateBack();
      },
      error: () => {
        this.notification.show({
          title: 'Error al guardar',
          message: 'Ocurrió un problema al subir los documentos del avance. Intente nuevamente.',
          type: NotificationType.ERROR
        });
        this.isSaving.set(false);
        this.isConfirmModalOpen.set(false);
      }
    });
  }

  navigateBack() {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
