import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { RegisterSpecialRequestFormComponent } from "../../components/register-special-request-form/register-special-request-form.component";

@Component({
  selector: 'app-register-special-request-page',
  templateUrl: './register-special-request-page.component.html',
  styleUrls: ['./register-special-request-page.component.css'],
  imports: [RegisterSpecialRequestFormComponent]
})
export class RegisterSpecialRequestPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  isLoading = signal(true);
  isSubmitting = signal(false);
  thesisWorkData = signal<ThesisWork | undefined>(undefined);

  ngOnInit(): void {
    const thesisId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (thesisId) {
      this.loadThesisWorkData(thesisId);
    } else {
      this.goBack();
    }
  }

  loadThesisWorkData(id: string): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (data: ThesisWork | undefined) => {
        if (data) {
          this.thesisWorkData.set(data);
        } else {
          this.notificationService.show({
            title: 'No encontrado',
            message: 'El trabajo de grado especificado no existe.',
            type: NotificationType.ERROR
          });
          this.goBack();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notificationService.show({
          title: 'Error',
          message: 'No se pudo cargar la información del trabajo de grado.',
          type: NotificationType.ERROR
        });
        this.isLoading.set(false);
      }
    });
  }

  handleSaveRequest(event: { requestType: string, comments: string }): void {
    const currentWork = this.thesisWorkData();
    if (!currentWork) return;
    this.isSubmitting.set(true);
    const thesisId = currentWork.thesisWorkId;
    const payload = {
      ...event,
      thesisId: thesisId
    };

    this.thesisWorkService.createSpecialRequestMock(payload).subscribe({
      next: () => {
        this.notificationService.show({
          title: 'Éxito',
          message: 'La solicitud especial ha sido registrada correctamente.',
          type: NotificationType.CONFIRMATION
        });
        this.isSubmitting.set(false);
        this.goBack();
      },
      error: (err) => {
        console.error(err);
        this.notificationService.show({
          title: 'Error al guardar',
          message: 'Hubo un problema registrando la solicitud. Intente nuevamente.',
          type: NotificationType.ERROR
        });
        this.isSubmitting.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}

