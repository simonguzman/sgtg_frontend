import { Component, inject, OnInit, signal } from '@angular/core';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { RegisterPazYSalvoFormComponent } from "../../components/register-paz-y-salvo-form/register-paz-y-salvo-form.component";
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../interfaces/paz-y-salvo-playload.interface';

@Component({
  selector: 'app-register-paz-y-salvo-page',
  templateUrl: './register-paz-y-salvo-page.component.html',
  styleUrls: ['./register-paz-y-salvo-page.component.css'],
  imports: [ConfirmationActionModalComponent, RegisterPazYSalvoFormComponent]
})
export class RegisterPazYSalvoPageComponent implements OnInit {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  thesisWorkState = signal<ThesisWork | null>(null);
  isConfirmModalOpen = signal(false);
  isSubmitting = signal(false);

  pendingData = signal<{ payload: PazYSalvoPayload, file: File } | null>(null);

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
      this.goBack();
    }
  }

  private loadData(id: string) {
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (data) => {
        if (data) this.thesisWorkState.set(data);
      }
    });
  }

  handleRequestConfirmation(data: { payload: any, file: File }) {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processPazYSalvo() {
    const data = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!data || !thesisId) return;
    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.thesisWorkService.registerPazYSalvoMock(thesisId, data.payload, data.file).subscribe({
      next: () => {
        const isApproved = data.payload.academicApproved && data.payload.financialApproved;

        this.notification.show({
          title: isApproved ? 'Paz y Salvo Aprobado' : 'Paz y Salvo No Aprobado',
          message: isApproved
            ? 'El registro se ha guardado correctamente y el proyecto puede avanzar.'
            : 'Se registró el Paz y Salvo. La entrega final ha sido rechazada y debe volver a cargarse.',
          type: isApproved ? NotificationType.CONFIRMATION : NotificationType.INFO
        });

        this.isSubmitting.set(false);
        this.goBack();
      },
      error: () => {
        this.notification.show({ title: 'Error', message: 'Fallo al guardar.', type: NotificationType.ERROR });
        this.isSubmitting.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
