import { Component, inject, OnInit, signal } from '@angular/core';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../../users/interfaces/user.interface';
import { ThesisWork } from '../../interfaces/thesis-work.interface'; // 👈 Importación obligatoria
import { UserRoleType } from '../../../../core/models/user-role';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { RegisterSustentationFormComponent, SustentationFormPayload } from "../../components/register-sustentation-form/register-sustentation-form.component";

@Component({
  selector: 'app-register-sustentation-page',
  templateUrl: './register-sustentation-page.component.html',
  styleUrls: ['./register-sustentation-page.component.css'],
  imports: [ConfirmationActionModalComponent, RegisterSustentationFormComponent]
})
export class RegisterSustentationPageComponent implements OnInit {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  thesisWorkState = signal<ThesisWork | null>(null);
  teachersState = signal<User[]>([]);
  isConfirmModalOpen = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  pendingData = signal<{ payload: SustentationFormPayload; file: File } | null>(null);

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;
    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }
    if (id) {
      this.loadData(id);
    } else {
      this.notification.show({ title: 'Error', message: 'No se identificó el ID del Trabajo de Grado.', type: NotificationType.ERROR });
      this.goBack();
    }
  }

  private loadData(id: string): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (data: ThesisWork | undefined) => {
        if (data) this.thesisWorkState.set(data);
      }
    });

    this.userService.getUsersByRole(UserRoleType.DOCENTE).subscribe({
      next: (teachers: User[] | undefined) => {
        if (teachers) this.teachersState.set(teachers);
      }
    });
  }

  handleRequestConfirmation(data: { payload: SustentationFormPayload; file: File }): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processSustentacion(): void {
    const data = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!data || !thesisId) return;
    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);
    const requestData = {
      ...data.payload,
      formatEDocument: data.file
    };

    this.thesisWorkService.saveSustentationRegistryMock(thesisId, requestData).subscribe({
      next: () => {
        this.notification.show({
          title: 'Sustentación Agendada',
          message: 'Se han asignado los jurados y la programación oficial correctamente.',
          type: NotificationType.CONFIRMATION
        });
        this.isSubmitting.set(false);
        this.goBack();
      },
      error: () => {
        this.notification.show({ title: 'Error', message: 'Fallo al procesar el agendamiento.', type: NotificationType.ERROR });
        this.isSubmitting.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
