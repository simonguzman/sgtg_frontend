import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { JurorVerdict, ThesisWork, SustentationRegistry } from '../../interfaces/thesis-work.interface';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { DatePipe } from '@angular/common';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-sustentation-details-page',
  templateUrl: './sustentation-details-page.component.html',
  styleUrls: ['./sustentation-details-page.component.css'],
  imports: [ButtonComponent, DatePipe]
})
export class SustentationDetailsPageComponent implements OnInit {
  protected route = inject(ActivatedRoute);
  public router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);

  thesisWorkDetails = signal<ThesisWork | null>(null);
  // Guardamos el ID de la sustentación que viene en la URL
  sustentationId = signal<string | null>(null);

  // Computado: Filtra la sustentación específica por su ID
  selectedSustentation = computed<SustentationRegistry | null>(() => {
    const work = this.thesisWorkDetails();
    const id = this.sustentationId();
    if (!work || !work.sustentations || !id) return null;
    return work.sustentations.find(s => s.id === id) || null;
  });

  // Computado: Último veredicto de la sustentación seleccionada
  latestVerdict = computed<JurorVerdict | null>(() => {
    const sustentation = this.selectedSustentation();
    if (!sustentation || !sustentation.verdicts) return null;
    return sustentation.verdicts.length > 0 ? sustentation.verdicts[sustentation.verdicts.length - 1] : null;
  });

  showCorrectedDocumentsButton = computed<boolean>(() => {
    const verdict = this.latestVerdict();
    return verdict?.veredict === stateList.APROBADO_CON_OBSERVACIONES;
  });

  actaDocument = computed<Document | null>(() => {
    const work = this.thesisWorkDetails();
    if (!work || !work.documents) return null;
    return work.documents.find(doc => doc.type === (DocumentType['FORMATO_G'] || 'Formato_G')) || null;
  });

  ngOnInit(): void {
    // Obtenemos el ID de la sustentación desde la ruta (ej: /view_sustentation_details/:id)
    const sId = this.route.snapshot.paramMap.get('id');
    this.sustentationId.set(sId);

    // Obtenemos el ID del trabajo de grado desde la ruta padre
    const thesisWorkId = this.route.parent?.snapshot.paramMap.get('id');

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
      }
    });
  }

  getMemberName(userId: string | undefined): string {
    return this.userService.getUserFullName(userId);
  }

  getAuthors(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }

  // Ahora usa selectedSustentation()
  getAssignedJurors(): string {
    const sustentation = this.selectedSustentation();
    const jurors = sustentation?.assignedJurors || [];
    if (jurors.length === 0) return 'No asignados';
    return jurors.map((j: any) => this.userService.getUserFullName(j.id || j)).join(' y ');
  }

  navigateToCorrectedDocuments(): void {
    this.router.navigate(['../../corrected_documents'], { relativeTo: this.route });
  }

  downloadDocument(): void {
    const targetDocument = this.actaDocument();
    if (!targetDocument?.url) {
      this.showDownloadError();
      return;
    }
    this.downloadService.download(targetDocument.url, targetDocument.name);
  }

  goBack(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  private handleNavigationError(): void {
    this.notificationService.show({ title: 'Error', message: 'ID inválido.', type: NotificationType.ERROR });
    this.goBack();
  }

  private showNotFoundNotification(): void {
    this.notificationService.show({ title: 'No encontrado', message: 'Trabajo no registrado.', type: NotificationType.ERROR });
  }

  private showErrorNotification(): void {
    this.notificationService.show({ title: 'Error', message: 'Error de comunicación.', type: NotificationType.ERROR });
  }

  private showDownloadError() {
    this.notificationService.show({ title: 'Error', message: 'Acta no encontrada.', type: NotificationType.ERROR });
  }
}
