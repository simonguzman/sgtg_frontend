import { Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { EvaluateCorrectionsFormService } from './services/evaluate-corrections-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { CorrectedDelivery } from '../../interfaces/corrected-delivery.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../core/enums/state.enum';

@Component({
  selector: 'app-evaluate-corrections-form',
  templateUrl: './evaluate-corrections-form.component.html',
  styleUrls: ['./evaluate-corrections-form.component.css'],
  standalone: true,
  imports: [ButtonComponent, InfoBannerComponent, ReadonlyFieldComponent],
  providers: [EvaluateCorrectionsFormService]
})
export class EvaluateCorrectionsFormComponent {
  protected readonly formService = inject(EvaluateCorrectionsFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  /** Verificación del coordinador: si los ajustes cumplen y sus observaciones (obligatorias si no cumplen) */
  @Output() onSubmitEvaluation = new EventEmitter<{ fulfills: boolean; observations: string }>();
  @Output() onGoBack = new EventEmitter<void>();

  readonly selectedVerdict = signal<stateList | null>(null);
  readonly observations = signal<string>('');
  readonly isSubmitAttempted = signal<boolean>(false);

  get states(): typeof stateList { return stateList; }

  readonly correctedDeliveriesList = computed<CorrectedDelivery[]>(() =>
    this.thesisWork?.correctedDeliveries ?? []
  );

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }
  getAssignedJurors(): string { return this.formService.getAssignedJurors(this.thesisWork); }

  downloadDocument(document: FileDocument): void {
    void this.formService.downloadDocument(document);
  }

  onObservationsChange(event: Event): void {
    this.observations.set((event.target as HTMLTextAreaElement).value);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const verdict = this.selectedVerdict();

    if (!verdict) { this.formService.notifyMissingVerdict(); return; }
    const fulfills = verdict === stateList.APROBADO;
    if (!fulfills && !this.formService.isObservationsValid(this.observations())) {
      this.formService.notifyInvalidObservations();
      return;
    }
    this.onSubmitEvaluation.emit({ fulfills, observations: this.observations() });
  }
}
