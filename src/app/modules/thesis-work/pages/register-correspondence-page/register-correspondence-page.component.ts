import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { RegisterCorrespondenceFormComponent } from "../../components/register-correspondence-form/register-correspondence-form.component";

@Component({
  selector: 'app-register-correspondence-page',
  templateUrl: './register-correspondence-page.component.html',
  styleUrls: ['./register-correspondence-page.component.css'],
  imports: [RegisterCorrespondenceFormComponent]
})
export class RegisterCorrespondencePageComponent implements OnInit {
  protected route = inject(ActivatedRoute);
  public router = inject(Router);

  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  thesisWorkDetails = signal<ThesisWork | null>(null);
  isSubmitting = signal<boolean>(false);

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
          this.showNotification('Registro inexistente', 'El trabajo de grado solicitado no existe.', NotificationType.ERROR);
          this.goBack();
        }
      },
      error: (err) => {
        this.showNotification('Error', 'Hubo un problema al recuperar los detalles.', NotificationType.ERROR);
        console.error(err);
        this.goBack();
      }
    });
  }

  handleCorrespondenceSave(file: File): void {
    const currentWork = this.thesisWorkDetails();
    if (!currentWork) return;

    this.isSubmitting.set(true);

    const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');

    const finalCorrespondenceDoc: Document = {
      id: crypto.randomUUID(),
      name: file.name.replace('.pdf', ''),
      url: `uploads/correspondencia/resolucion_${crypto.randomUUID().substring(0, 8)}.pdf`,
      uploadDate: dateStr,
      type: DocumentType['FORMATO_H'] || ('Resolución' as any),
      status: stateList.APROBADO
    };

    this.thesisWorkService.registerCorrespondenceDocumentMock(currentWork.thesisWorkId, finalCorrespondenceDoc).subscribe({
      next: () => {
        this.showNotification(
          '¡Trabajo de Grado Concluido!',
          'El formato H ha sido asentado correctamente. El proceso se encuentra formalmente cerrado.',
          NotificationType.CONFIRMATION
        );
        this.isSubmitting.set(false);
        this.goBack();
      },
      error: (err) => {
        this.showNotification('Error en guardado', 'No se pudo registrar la correspondencia final.', NotificationType.ERROR);
        this.isSubmitting.set(false);
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private handleNavigationError(): void {
    this.showNotification('Identificador faltante', 'No se pudo procesar la vista por falta de un ID válido.', NotificationType.ERROR);
    this.goBack();
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
