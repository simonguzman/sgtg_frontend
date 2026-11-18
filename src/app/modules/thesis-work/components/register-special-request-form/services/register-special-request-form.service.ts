import { inject, Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';

/** Meses de prórroga que permite el reglamento. */
export const EXTENSION_MONTHS = [1, 2, 3];

/**
 * Formulario de solicitudes del director. Los campos que se piden dependen
 * del tipo: el cambio de título y objetivos pide el título, los objetivos y
 * la justificación; la prórroga, los meses y el documento; la suspensión, la
 * reanudación y la cancelación, solo el documento.
 */
@Injectable()
export class RegisterSpecialRequestFormService {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  /** Tipo de solicitud, documento y datos propios de cada tipo (meses de prórroga, título y objetivos nuevos). */
  public readonly form = this.fb.nonNullable.group({
    requestType: ['' as SpecialRequestType | '', [Validators.required]],
    title: [''],
    objectives: this.fb.array<FormControl<string>>([]),
    justification: [''],
    months: [1]
  });

  /** Campos de los objetivos nuevos del cambio de título y objetivos. */
  get objectives(): FormArray<FormControl<string>> {
    return this.form.controls.objectives;
  }

  /** Carga el título y los objetivos vigentes para editarlos (el primero es el general). */
  public loadCurrentDescription(thesisWork: ThesisWork): void {
    const proposal = thesisWork.preliminaryDraftData.proposalData;
    this.form.controls.title.setValue(proposal.title ?? '');
    this.objectives.clear();
    const objectives = proposal.objectives?.length ? proposal.objectives : [''];
    objectives.forEach(objective => this.addObjective(objective));
  }

  /** Agrega un campo de objetivo. */
  public addObjective(value = ''): void {
    this.objectives.push(this.fb.nonNullable.control(value));
  }

  /** Quita un objetivo; el objetivo general no se quita. */
  public removeObjective(index: number): void {
    if (index > 0) this.objectives.removeAt(index);
  }

  /** Nombres de los estudiantes del trabajo. */
  public getStudentNames(thesisWork: ThesisWork): string {
    return this.participants.getStudentNames(thesisWork);
  }

  /** Nombre del director. */
  public getDirectorName(thesisWork: ThesisWork): string {
    return this.participants.getDirectorName(thesisWork);
  }

  /** Nombre del codirector, o vacío si no tiene. */
  public getCodirectorName(thesisWork: ThesisWork): string {
    return this.participants.getCodirectorName(thesisWork);
  }

  /** Nombre del asesor, o vacío si no tiene. */
  public getAdvisorName(thesisWork: ThesisWork): string {
    return this.participants.getAdvisorName(thesisWork);
  }

  /** Muestra el aviso «Formulario incompleto». */
  public notifyIncompleteForm(message = 'Por favor, seleccione un tipo de solicitud y complete los datos requeridos.'): void {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message,
      type: NotificationType.ERROR
    });
  }
}
