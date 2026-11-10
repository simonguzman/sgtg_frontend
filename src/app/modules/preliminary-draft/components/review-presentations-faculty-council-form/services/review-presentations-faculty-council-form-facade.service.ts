import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
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
import { formatDisplayDate, sumarMeses } from '../../../../../core/utils/date-utils';
import { versionVigente } from '../../../services/preliminary-draft-rules';
import { cartaDeAceptacion } from '../../../../proposal/services/proposal-rules.service';
import { resolveApprovedEvaluationDocument } from '../../../../../core/utils/evaluation-utils';

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
    /** Al aprobar: fecha de la reunión del Consejo, desde la que corre el plazo */
    startDate: [null as Date | null],
    /** Al aprobar: fecha máxima de entrega, entre 3 y 9 meses después de la reunión */
    endDate: [null as Date | null],
    document: [null]
  });

  /** Fecha de la reunión elegida (para el rango de la fecha máxima de entrega) */
  private readonly startDateValue = signal<Date | null>(null);

  readonly isReadOnly = computed(() => this.preliminaryDraft()?.state === stateList.APROBADO);

  /**
   * Fechas que puede fijar el Consejo (las calcula el backend con su reloj): su
   * reunión va desde la remisión con el formato C hasta hoy, y la fecha máxima de
   * entrega queda entre 3 y 9 meses después de la reunión.
   */
  readonly councilTerm = computed(() => this.preliminaryDraft()?.councilTerm ?? null);
  readonly startDateMin = computed(() => this.councilTerm()?.startMin ?? null);
  /** Hoy según el backend (su reloj puede estar adelantado): el calendario abre en ese mes */
  readonly startDateMax = computed(() => this.councilTerm()?.startMax ?? null);
  readonly endDateMin = computed(() => this.limiteDeEntrega('minMonths'));
  readonly endDateMax = computed(() => this.limiteDeEntrega('maxMonths'));

  /** Texto de ayuda con el rango de la fecha máxima de entrega para la reunión elegida */
  readonly endDateHint = computed(() => {
    const min = this.endDateMin();
    const max = this.endDateMax();
    const term = this.councilTerm();
    if (!min || !max || !term) return 'Primero elija la fecha de la reunión del Consejo.';
    return `Entre el ${formatDisplayDate(min)} y el ${formatDisplayDate(max)} (de ${term.minMonths} a ${term.maxMonths} meses).`;
  });

  /** Duración del plazo elegido, p. ej. "6 meses" o "6 meses y 10 días" */
  readonly termLength = signal<string | null>(null);

  /**
   * Formato A firmado por el Comité: el del concepto pertinente más reciente. El
   * concepto del Comité llega como Pertinente (no como Aprobado), igual que en
   * las demás vistas.
   */
  readonly signedProposalDocument = computed<FormattedDocument | undefined>(() =>
    resolveApprovedEvaluationDocument(this.preliminaryDraft()?.proposalData?.evaluations) ?? undefined
  );

  /** Carta de aceptación de la organización (solo práctica profesional), la versión vigente */
  readonly acceptanceLetter = computed<FileDocument | undefined>(() =>
    cartaDeAceptacion(this.preliminaryDraft()?.proposalData) ?? undefined
  );

  /** La versión vigente del anteproyecto: la que se remitió al Consejo */
  readonly approvedPreliminaryDraftDocument = computed<FileDocument | undefined>(() =>
    versionVigente(this.preliminaryDraft()) ?? undefined
  );

  /** El formato C de la última remisión */
  readonly presentationDocument = computed<FileDocument | undefined>(() =>
    [...(this.preliminaryDraft()?.documents ?? [])]
      .filter((document) => document.type === DocumentType.FORMATO_C)
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0]
  );

  /** Los conceptos aprobatorios sobre la versión vigente (los de versiones anteriores ya no aplican) */
  readonly evaluationFiles = computed<EvaluatorSignedDocumentView[]>(() =>
    this.preliminaryDraft()?.evaluations.filter((evaluation) => evaluation.veredict === stateList.APROBADO
        && evaluation.documentId === this.approvedPreliminaryDraftDocument()?.id)
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
    // Fecha de la versión vigente (la que se remitió), no de la primera
    const currentVersion = versionVigente(this.preliminaryDraft());
    return this.parseAndFormatDate(currentVersion?.uploadDate);
  });

  initFormEffects(): void {
    if (this.isReadOnly()) {
      this.evaluationForm.disable({ emitEvent: false });
      return;
    }
    const startControl = this.evaluationForm.controls.startDate;
    const endControl = this.evaluationForm.controls.endDate;
    this.evaluationForm.get('result')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value === 'Aprobado') {
          startControl.setValidators([Validators.required, control => this.dentroDe(control, this.startDateMin(),
            this.startDateMax(), 'inicioFueraDeRango')]);
          endControl.setValidators([Validators.required, control => this.dentroDe(control, this.endDateMin(),
            this.endDateMax(), 'entregaFueraDeRango')]);
        } else {
          startControl.clearValidators();
          endControl.clearValidators();
          startControl.setValue(null, { emitEvent: false });
          endControl.setValue(null, { emitEvent: false });
          this.startDateValue.set(null);
          this.termLength.set(null);
        }
        startControl.updateValueAndValidity({ emitEvent: false });
        // La fecha de entrega se elige después de la reunión (su rango depende de ella)
        if (value === 'Aprobado' && !startControl.value) endControl.disable({ emitEvent: false });
        endControl.updateValueAndValidity({ emitEvent: false });
      });
    startControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(start => {
      this.startDateValue.set(start ?? null);
      if (start) endControl.enable({ emitEvent: false });
      else endControl.disable({ emitEvent: false });
      // Si la fecha de entrega ya no cabe en el rango de la nueva reunión, se vuelve a elegir
      endControl.updateValueAndValidity();
      if (endControl.hasError('entregaFueraDeRango')) endControl.setValue(null);
      this.termLength.set(this.duracion(start, endControl.value));
    });
    endControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(end => this.termLength.set(this.duracion(startControl.value, end)));
  }

  /** Fecha más cercana o más lejana de entrega para la reunión elegida; null sin reunión */
  private limiteDeEntrega(limite: 'minMonths' | 'maxMonths'): Date | null {
    const start = this.startDateValue();
    const term = this.councilTerm();
    return start && term ? sumarMeses(start, term[limite]) : null;
  }

  /** El valor (una fecha) debe estar entre min y max, ambos incluidos (por día) */
  private dentroDe(control: AbstractControl, min: Date | null, max: Date | null, error: string): ValidationErrors | null {
    const valor = control.value as Date | null;
    if (!valor) return null;
    const dia = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
    const fuera = (min && dia(valor) < dia(min)) || (max && dia(valor) > dia(max));
    return fuera ? { [error]: true } : null;
  }

  /** Meses y días entre la reunión y la fecha de entrega, como los cuenta el backend */
  private duracion(start: Date | null, end: Date | null): string | null {
    if (!start || !end) return null;
    let meses = 0;
    while (sumarMeses(start, meses + 1) <= end) meses++;
    const dias = Math.round((end.getTime() - sumarMeses(start, meses).getTime()) / 86_400_000);
    const textoMeses = `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    return dias ? `${textoMeses} y ${dias} ${dias === 1 ? 'día' : 'días'}` : textoMeses;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.evaluationForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedSignedFile.set(event);
    this.isUploadModalOpen.set(false);
  }

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
        startDate: raw.startDate ?? null,
        endDate: raw.endDate ?? null,
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
    if (!Number.isNaN(standardDate.getTime())) return standardDate.toLocaleDateString('es-ES');
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const manualDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      if (!Number.isNaN(manualDate.getTime())) return manualDate.toLocaleDateString('es-ES');
    }
    return 'Fecha inválida';
  }
}
