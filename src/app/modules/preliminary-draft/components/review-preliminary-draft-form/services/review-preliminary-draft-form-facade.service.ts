import { computed, inject, Injectable, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { PendingReviewData } from '../../../interfaces/review-preliminary-draft-payload.interface';

// Mismo patrón que RESULT_TO_STATE en EvaluationProposalFacadeService: el
// FormBuilder (sin .nonNullable, igual que EvaluationProposalFormService)
// devuelve `result` como string | null, sin relación estática con
// stateList. Este mapeo es lo que convierte ese string suelto en un
// valor de enum real, en vez de forzarlo con un cast o dejarlo pasar
// como any.
const RESULT_TO_STATE: Record<string, stateList> = {
  'Aprobado': stateList.APROBADO,
  'No aprobado': stateList.NO_APROBADO
};

@Injectable()
export class ReviewPreliminaryDraftFormFacadeService {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  readonly userService = inject(UserService);

  readonly preliminaryDraft = signal<PreliminaryDraft | null>(null);
  readonly uploadedSignedFile = signal<{ fileName: string; file: File } | null>(null);
  readonly uploadedAnnotatedFile = signal<{ fileName: string; file: File } | null>(null);
  readonly isUploadModalOpen = signal(false);
  readonly isAnnotatedUploadModalOpen = signal(false);

  // ← `document: [null]` eliminado: control muerto — nunca se leía ni se
  // asignaba en ningún punto de este facade ni del componente. El File
  // real siempre viajó por los signals uploadedSignedFile/uploadedAnnotatedFile.
  readonly evaluationForm = this.fb.group({
    result: ['', Validators.required],
    comments: ['', Validators.required]
  });

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

  // ← FIX CENTRAL: antes `{ formValues: any; ... }` — el `any` dejaba
  // pasar `result` como string crudo hasta el facade de página, que lo
  // asignaba directo a Evaluation.veredict sin ninguna verificación.
  // Ahora devuelve PendingReviewData tal cual, con result ya mapeado a
  // un valor real de stateList.
  validateAndGetPayload(): PendingReviewData | null {
    const fileData = this.uploadedSignedFile();
    const annotatedData = this.uploadedAnnotatedFile();

    if (this.evaluationForm.invalid || !fileData) {
      this.evaluationForm.markAllAsTouched();
      this.showValidationErrorNotification(!fileData);
      return null;
    }

    const raw = this.evaluationForm.getRawValue();
    const mappedResult = RESULT_TO_STATE[raw.result ?? ''];
    if (!mappedResult) {
      // Defensivo: no debería alcanzarse con los 2 radio buttons fijos
      // del template, pero evita enviar un veredicto sin sentido si en
      // el futuro se agrega una opción sin actualizar este mapeo.
      this.showValidationErrorNotification(false);
      return null;
    }

    return {
      formValues: {
        result: mappedResult,
        comments: raw.comments ?? ''
      },
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
      if (!isNaN(standardDate.getTime())) return standardDate;
      const parts = cleanDateStr.split('-');
      if (parts.length === 3) {
        const day = +parts[0];
        const month = +parts[1] - 1;
        const year = +parts[2];
        const manualDate = new Date(year, month, day);
        if (!isNaN(manualDate.getTime())) return manualDate;
      }
    }
    return null;
  }
}
