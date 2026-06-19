import { Component, inject, OnInit, signal } from '@angular/core';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { UploadFinalDeliveryFormComponent } from "../../components/upload-final-delivery-form/upload-final-delivery-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";

@Component({
  selector: 'app-upload-final-delivery-page',
  templateUrl: './upload-final-delivery-page.component.html',
  styleUrls: ['./upload-final-delivery-page.component.css'],
  imports: [UploadFinalDeliveryFormComponent, ConfirmationActionModalComponent]
})
export class UploadFinalDeliveryPageComponent implements OnInit {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  thesisWorkState = signal<any | null>(null);
  isConfirmModalOpen = signal(false);
  isSubmitting = signal(false);

  pendingFilesData = signal<{ monograph: File, formatE: File, annexes?: File } | null>(null);

  ngOnInit() {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;
    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }
    if (id) {
      this.loadData(id);
    } else {
      this.notification.show({
        title: 'Error de navegación',
        message: 'No se pudo identificar el identificador del trabajo de grado.',
        type: NotificationType.ERROR
      });
      this.goBack();
    }
  }

  private loadData(id: string) {
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (data) => {
        if (!data) {
          this.notification.show({ title: 'No encontrado', message: 'El proyecto solicitado no existe.', type: NotificationType.INFO });
          this.goBack();
          return;
        }
        this.thesisWorkState.set(data);
      },
      error: () => this.notification.show({ title: 'Error de conexión', message: 'Fallo técnico al recuperar los datos.', type: NotificationType.ERROR })
    });
  }

  handleRequestConfirmation(files: { monograph: File, formatE: File, annexes?: File }) {
    this.pendingFilesData.set(files);
    this.isConfirmModalOpen.set(true);
  }

  processFinalDelivery() {
    const files = this.pendingFilesData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!files || !thesisId) return;
    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);
    this.thesisWorkService.uploadFinalDeliveryMock(thesisId, files.monograph, files.formatE, files.annexes).subscribe({
      next: () => {
        this.notification.show({
          title: '¡Entrega Registrada!',
          message: 'La monografía y el Formato_E se han procesado de manera oficial.',
          type: NotificationType.CONFIRMATION
        });
        this.isSubmitting.set(false);
        this.goBack();
      },
      error: () => {
        this.notification.show({ title: 'Error al guardar', message: 'No se pudo guardar la entrega final.', type: NotificationType.ERROR });
        this.isSubmitting.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
