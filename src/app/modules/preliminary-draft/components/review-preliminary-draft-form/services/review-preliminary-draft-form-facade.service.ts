import { computed, inject, Injectable, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

@Injectable()
export class ReviewPreliminaryDraftFormFacadeService {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  readonly userService = inject(UserService);

  // Estado del componente
  readonly preliminaryDraft = signal<PreliminaryDraft | null>(null);
  readonly uploadedSignedFile = signal<{ fileName: string; file: File } | null>(null);
  readonly uploadedAnnotatedFile = signal<{ fileName: string; file: File } | null>(null);

  readonly isUploadModalOpen = signal(false);
  readonly isAnnotatedUploadModalOpen = signal(false);

  // Formulario reactivo
  readonly evaluationForm = this.fb.group({
    result: ['', Validators.required],
    comments: ['', Validators.required],
    document: [null]
  });

  // Estado calculado
  readonly isReadOnly = computed(() => this.preliminaryDraft()?.state === stateList.APROBADO);

  readonly currentDocument = computed(() => {
    const documents = this.preliminaryDraft()?.documents || [];
    if (documents.length === 0) return null;
    return [...documents].sort((a, b) => {
      const dateA = this.parseDate(a.uploadDate);
      const dateB = this.parseDate(b.uploadDate);
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    })[0];
  });

  readonly documentUploadDate = computed(() => {
    const uploadDate = this.currentDocument()?.uploadDate;
    const parsedDate = this.parseDate(uploadDate);
    return parsedDate ? parsedDate.toLocaleDateString('es-ES') : 'No disponible';
  });

  // Métodos auxiliares de información de usuario
  getStudentNames(): string {
    const proposalData = this.preliminaryDraft()?.proposalData;
    return proposalData ? this.userService.getAuthorsNames(proposalData.authors) : '';
  }

  getDirectorName(): string {
    const director = this.preliminaryDraft()?.proposalData?.director;
    return director?.id ? this.userService.getUserFullName(director.id) : '';
  }

  getCodirectorName(): string {
    const codirector = this.preliminaryDraft()?.proposalData?.codirector;
    return codirector?.id ? this.userService.getUserFullName(codirector.id) : '';
  }

  getAdvisorName(): string {
    const advisor = this.preliminaryDraft()?.proposalData?.advisor;
    return advisor?.id ? this.userService.getUserFullName(advisor.id) : '';
  }

  // Manejo de archivos subidos
  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedSignedFile.set(event);
    this.isUploadModalOpen.set(false);
  }

  handleAnnotatedFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedAnnotatedFile.set(event);
    this.isAnnotatedUploadModalOpen.set(false);
    this.notificationService.show({
      title: 'Feedback adjunto',
      message: 'El documento con anotaciones se ha cargado correctamente.',
      type: NotificationType.INFO
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.evaluationForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  // Validación y construcción de payload
  validateAndGetPayload(): { formValues: any; file: File; annotatedFile?: File } | null {
    const fileData = this.uploadedSignedFile();
    const annotatedData = this.uploadedAnnotatedFile();

    if (this.evaluationForm.invalid || !fileData) {
      this.evaluationForm.markAllAsTouched();
      this.showValidationErrorNotification(!fileData);
      return null;
    }

    return {
      formValues: this.evaluationForm.value,
      file: fileData.file,
      annotatedFile: annotatedData?.file
    };
  }

  private showValidationErrorNotification(missingFile: boolean): void {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message: missingFile
        ? 'Debe adjuntar el Formato B firmado para guardar la evaluación.'
        : 'Por favor, complete el veredicto y las observaciones.',
      type: NotificationType.ERROR
    });
  }

  private parseDate(dateValue: string | Date | null | undefined): Date | null {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    if (typeof dateValue === 'string') {
      const cleanDateStr = dateValue.replace(/\s+/g, '');
      const standardDate = new Date(cleanDateStr);
      if (!isNaN(standardDate.getTime())) {
        return standardDate;
      }
      const parts = cleanDateStr.split('-');
      if (parts.length === 3) {
        const day = +parts[0];
        const month = +parts[1] - 1;
        const year = +parts[2];
        const manualDate = new Date(year, month, day);
        if (!isNaN(manualDate.getTime())) {
          return manualDate;
        }
      }
    }
    return null;
  }
}
