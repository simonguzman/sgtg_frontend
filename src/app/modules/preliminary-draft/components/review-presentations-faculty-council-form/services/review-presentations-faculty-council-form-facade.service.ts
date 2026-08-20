import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { SaveEvaluationPayload } from '../models/council-evaluation.model';

const RESULT_TO_STATE: Record<string, stateList> = {
  'Aprobado': stateList.APROBADO,
  'No aprobado': stateList.NO_APROBADO
};

export interface EvaluatorSignedDocumentView extends FormattedDocument {
  evaluator: string;
}

@Injectable()
export class ReviewPresentationsFacultyCouncilFormFacadeService {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly userService = inject(UserService);

  readonly preliminaryDraft = signal<PreliminaryDraft | null>(null);
  readonly uploadedSignedFile = signal<{ fileName: string; file: File } | null>(null);
  readonly isUploadModalOpen = signal(false);

  readonly evaluationForm = this.fb.group({
    result: ['', Validators.required],
    comments: ['', Validators.required],
    maximumDeliveryDate: [null as Date | null],
    document: [null]
  });

  readonly isReadOnly = computed(() => this.preliminaryDraft()?.state === stateList.APROBADO);

  readonly signedProposalDocument = computed<FormattedDocument | undefined>(() => {
    const proposal = this.preliminaryDraft()?.proposalData;
    if (!proposal?.evaluations?.length) return undefined;
    const approvedEvaluation = [...proposal.evaluations]
      .reverse()
      .find(
        (evaluation) =>
          evaluation.veredict === stateList.APROBADO ||
          evaluation.veredict === stateList.APROBADO_CON_OBSERVACIONES
      );
    return approvedEvaluation?.signedDocuments?.[0];
  });

  readonly approvedPreliminaryDraftDocument = computed<FileDocument | undefined>(() =>
    this.preliminaryDraft()?.documents.find(
      (document) => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION
    )
  );

  readonly presentationDocument = computed<FileDocument | undefined>(() =>
    this.preliminaryDraft()?.documents.find((document) => document.type === DocumentType.FORMATO_C)
  );

  // ← FIX (re-aplicado): antes solo {name, evaluator} — sin url el botón
  // "Descargar" de este documento no tiene nada real que descargar.
  readonly evaluationFiles = computed<EvaluatorSignedDocumentView[]>(() =>
    this.preliminaryDraft()?.evaluations.filter((evaluation) => evaluation.veredict === stateList.APROBADO)
      .map((evaluation) => {
        const doc = evaluation.signedDocuments?.[0];
        return {
          name: doc?.name || 'Evaluación firmada',
          url: doc?.url || '',
          evaluator: evaluation.evaluatorName
        };
      }) || []
  );

  readonly documentUploadDate = computed(() => {
    const firstDocument = this.preliminaryDraft()?.documents[0];
    return this.parseAndFormatDate(firstDocument?.uploadDate);
  });

  initFormEffects(): void {
    if (this.isReadOnly()) {
      this.evaluationForm.disable({ emitEvent: false });
      return;
    }
    this.evaluationForm.get('result')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const dateControl = this.evaluationForm.get('maximumDeliveryDate');
        if (value === 'Aprobado') {
          dateControl?.setValidators([Validators.required]);
        } else {
          dateControl?.clearValidators();
          dateControl?.setValue(null, { onlySelf: true, emitEvent: false });
        }
        dateControl?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.evaluationForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedSignedFile.set(event);
    this.isUploadModalOpen.set(false);
  }

  // ← FIX (re-aplicado): `as CouncilEvaluationFormValues` era un cast
  // ciego. Con el modelo ya estricto (result: stateList), un string
  // crudo del radio button no encaja sin este mapeo explícito.
  validateAndGetPayload(): SaveEvaluationPayload | null {
    const fileData = this.uploadedSignedFile();
    if (this.evaluationForm.invalid || !fileData) {
      this.evaluationForm.markAllAsTouched();
      this.showValidationErrorNotification(!fileData);
      return null;
    }

    const raw = this.evaluationForm.getRawValue();
    const mappedResult = RESULT_TO_STATE[raw.result ?? ''];
    if (!mappedResult) {
      this.showValidationErrorNotification(false);
      return null;
    }

    return {
      formValues: {
        result: mappedResult,
        comments: raw.comments ?? '',
        maximumDeliveryDate: raw.maximumDeliveryDate ?? null,
        document: null
      },
      file: fileData.file
    };
  }

  getStudentNames(): string {
    const authors = this.preliminaryDraft()?.proposalData?.authors;
    return authors ? this.userService.getAuthorsNames(authors) : '';
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

  private showValidationErrorNotification(missingFile: boolean): void {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message: missingFile
        ? 'Es obligatorio adjuntar el documento de evaluación firmado.'
        : 'Por favor, complete todos los campos requeridos antes de continuar.',
      type: NotificationType.ERROR
    });
  }

  private parseAndFormatDate(rawDate?: string | Date): string {
    if (!rawDate) return 'No disponible';
    if (rawDate instanceof Date) return rawDate.toLocaleDateString('es-ES');
    const cleanDateStr = rawDate.replace(/\s+/g, '');
    const standardDate = new Date(cleanDateStr);
    if (!isNaN(standardDate.getTime())) return standardDate.toLocaleDateString('es-ES');
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const manualDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      if (!isNaN(manualDate.getTime())) return manualDate.toLocaleDateString('es-ES');
    }
    return 'Fecha inválida';
  }
}
