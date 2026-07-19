import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { stateList } from '../../../../core/enums/state.enum';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../interfaces/sustentation-registry.interface';
import { User } from '../../../users/interfaces/user.interface';

export interface SustentationEvaluationPayload {
  veredict: stateList;
  observations: string;
  evaluationDate: Date;
}

@Component({
  selector: 'app-evaluate-sustentation-form',
  templateUrl: './evaluate-sustentation-form.component.html',
  styleUrls: ['./evaluate-sustentation-form.component.css'],
  imports: [ReactiveFormsModule, FileUploadModalComponent, ButtonComponent, DatePipe, InfoBannerComponent]
})
export class EvaluateSustentationFormComponent {
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;

  @Output() onSave = new EventEmitter<{ payload: SustentationEvaluationPayload; file: File }>();
  @Output() onBack = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();

  verdictSelected = signal<stateList | null>(null);
  observations = signal<string>('');
  uploadedFormat = signal<{ fileName: string; file: File } | null>(null);
  isModalOpen = signal<boolean>(false);
  isSubmitAttempted = signal<boolean>(false);

  public get states(): typeof stateList {
    return stateList;
  }

  get currentSustentation(): SustentationRegistry | null {
    return this.thesisWork?.sustentations?.[0] || null;
  }

  // ─── Miembros ─────────────────────────────────────────────────────────────────

  getStudentNames(): string {
    const authors = this.thesisWork?.preliminaryDraftData?.proposalData?.authors || [];
    return this.userService.getAuthorsNames(authors as User[]);
  }

  getDirectorName(): string {
    const directorId = this.thesisWork?.preliminaryDraftData?.proposalData?.director?.id;
    return directorId ? this.userService.getUserFullName(directorId) : 'No asignado';
  }

  getCodirectorName(): string {
    const codirectorId = this.thesisWork?.preliminaryDraftData?.proposalData?.codirector?.id;
    return codirectorId ? this.userService.getUserFullName(codirectorId) : '';
  }

  getAdvisorName(): string {
    const advisorId = this.thesisWork?.preliminaryDraftData?.proposalData?.advisor?.id;
    return advisorId ? this.userService.getUserFullName(advisorId) : '';
  }

  getAssignedJurors(): string {
    const jurors = this.currentSustentation?.assignedJurors || [];
    if (jurors.length === 0) return 'No asignados';
    return jurors.map((j: User) => this.userService.getUserFullName(j.id)).join(' y ');
  }

  // ─── Documentos ───────────────────────────────────────────────────────────────

  getExistingDocument(type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();
    const thesis = this.thesisWork;

    if (!thesis?.finalDeliveries?.length) return null;

    const latestDelivery = [...thesis.finalDeliveries].sort((a, b) =>
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    )[0];

    if (targetType === 'MONOGRAFIA') return latestDelivery?.monograph ?? null;
    if (targetType === 'ANEXOS') return latestDelivery?.annexes ?? null;

    return null;
  }

  downloadDocument(doc: FileDocument | null | undefined): void {
    if (doc) this.onDownloadFile.emit(doc);
  }

  // ─── Manejo de archivo y submit ───────────────────────────────────────────────

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormat.set(event);
    this.isModalOpen.set(false);
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El acta de sustentación ${event.fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  removeFile(): void {
    this.uploadedFormat.set(null);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);

    const currentVerdict = this.verdictSelected();
    const fileData = this.uploadedFormat();

    if (!currentVerdict) {
      this.notificationService.show({
        title: 'Falta calificación',
        message: 'Debe seleccionar obligatoriamente una calificación para la sustentación.',
        type: NotificationType.ERROR
      });
      return;
    }

    if (!fileData) {
      this.notificationService.show({
        title: 'Formato faltante',
        message: 'Debe adjuntar obligatoriamente el Formato de Sustentación con los resultados firmados.',
        type: NotificationType.ERROR
      });
      return;
    }

    this.onSave.emit({
      payload: {
        veredict: currentVerdict,
        observations: this.observations(),
        evaluationDate: new Date()
      },
      file: fileData.file
    });
  }
}
