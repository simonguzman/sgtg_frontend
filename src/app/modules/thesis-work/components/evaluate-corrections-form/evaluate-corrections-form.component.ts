import { Component, EventEmitter, inject, Input, computed, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Servicios
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { AuthService } from '../../../../core/services/auth/auth.service';

// Interfaces y Enums
import { ThesisWork, CorrectedDelivery } from '../../interfaces/thesis-work.interface';
import { Document } from '../../../../core/interfaces/Document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { User } from '../../../users/interfaces/user.interface'; // 👈 Importación agregada

// Componentes Reutilizables de la aplicación
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";

@Component({
  selector: 'app-evaluate-corrections-form',
  templateUrl: './evaluate-corrections-form.component.html',
  styleUrls: ['./evaluate-corrections-form.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadModalComponent, ButtonComponent]
})
export class EvaluateCorrectionsFormComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  public readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;

  @Output() onSubmitEvaluation = new EventEmitter<{ evaluation: Omit<Evaluation, 'id' | 'date'>, file: File }>();
  @Output() onGoBack = new EventEmitter<void>();

  // Estados reactivos del formulario
  selectedVerdict = signal<stateList | null>(null);
  observations = signal<string>('');
  uploadedFormatG = signal<{ fileName: string; file: File } | null>(null);

  // Estados visuales de interacción
  isModalOpen = signal<boolean>(false);
  isSubmitAttempted = signal<boolean>(false);

  public get states(): typeof stateList {
    return stateList;
  }

  verdictOptions = [
    { value: stateList.APROBADO, label: 'Aprobado' },
    { value: stateList.APROBADO_CON_OBSERVACIONES, label: 'Aprobado con Observaciones' },
    { value: stateList.NO_APROBADO, label: 'No Aprobado' },
    { value: stateList.APLAZADO, label: 'Aplazado' }
  ];

  // 📦 Se obtiene la lista estructurada de entregas unificadas
  correctedDeliveriesList = computed<CorrectedDelivery[]>(() => {
    if (!this.thesisWork || !this.thesisWork.correctedDeliveries) return [];
    return this.thesisWork.correctedDeliveries;
  });

  // --- Getters de Información de Personal ---
  getStudentNames(): string {
    const authors = this.thesisWork?.preliminaryDraftData?.proposalData?.authors || [];
    return this.userService.getAuthorsNames(authors);
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
    const jurors = this.thesisWork?.sustentations?.[0]?.assignedJurors || [];
    if (jurors.length === 0) return 'No asignados';
    // 👈 Cambiado (j: any) por su respectivo tipado estricto (j: User)
    return jurors.map((j: User) => this.userService.getUserFullName(j.id)).join(' y ');
  }

  downloadDocument(doc: Document): void {
    if (!doc?.url) {
      this.notificationService.show({
        title: 'Error de archivo',
        message: 'Este documento no posee una ruta válida de descarga.',
        type: NotificationType.ERROR
      });
      return;
    }
    this.downloadService.download(doc.url, `${doc.name}.pdf`);
  }

  handleFormatGUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormatG.set(event);
    this.isModalOpen.set(false);
    this.notificationService.show({
      title: 'Acta Adjunta',
      message: 'El Formato_G se ha vinculado correctamente a la evaluación.',
      type: NotificationType.INFO
    });
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const user = this.authService.currentUser();
    const verdict = this.selectedVerdict();

    if (!verdict) {
      this.notificationService.show({ title: 'Dictamen requerido', message: 'Debe seleccionar una decisión de evaluación.', type: NotificationType.ERROR });
      return;
    }

    if (!this.observations().trim() || this.observations().length < 10) {
      this.notificationService.show({ title: 'Observaciones vacías', message: 'Debe ingresar una justificación técnica detallada (mínimo 10 caracteres).', type: NotificationType.ERROR });
      return;
    }

    if (!this.uploadedFormatG()) {
      this.notificationService.show({ title: 'Formato_G Faltante', message: 'Es obligatorio cargar el Formato_G firmado para continuar.', type: NotificationType.ERROR });
      return;
    }

    // Se extrae el ID de la monografía del paquete de entrega más reciente [0]
    const currentDelivery = this.correctedDeliveriesList()[0];
    const targetDocumentId = currentDelivery?.monograph?.id || '';

    const evaluationData: Omit<Evaluation, 'id' | 'date'> = {
      documentId: targetDocumentId,
      proposalId: this.thesisWork.preliminaryDraftData?.proposalData?.id || '',
      evaluatorId: user?.id || '',
      evaluatorName: user ? `${user.firstName} ${user.lastName}` : 'Jurado Asignado',
      evaluatorRole: 'JURADO',
      veredict: verdict,
      observations: this.observations()
    };

    this.onSubmitEvaluation.emit({
      evaluation: evaluationData,
      file: this.uploadedFormatG()!.file
    });
  }
}
