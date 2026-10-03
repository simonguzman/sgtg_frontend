import { Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { EvaluateSpecialRequestFormService } from './services/evaluate-special-request-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { stateList } from '../../../../core/enums/state.enum';

type SpecialRequestVerdict = stateList.APROBADO | stateList.NO_APROBADO;

@Component({
  selector: 'app-evaluate-special-request-form',
  templateUrl: './evaluate-special-request-form.component.html',
  styleUrls: ['./evaluate-special-request-form.component.css'],
  imports: [ButtonComponent, DatePicker, FormsModule, InfoBannerComponent],
  providers: [EvaluateSpecialRequestFormService]
})
export class EvaluateSpecialRequestFormComponent {
  protected readonly formService = inject(EvaluateSpecialRequestFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input({ required: true }) specialRequest!: SpecialRequest;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ status: SpecialRequestVerdict; resolutionDetails: string; grantedDeadline?: Date }>();
  @Output() onBack = new EventEmitter<void>();

  readonly verdictSelected  = signal<SpecialRequestVerdict | null>(null);
  readonly observations = signal<string>('');
  readonly grantedDeadline  = signal<Date | null>(null);
  readonly isSubmitAttempted = signal(false);

  get states(): typeof stateList { return stateList; }

  readonly requiresNewDeadline = computed(() => {
    const isApproved = this.verdictSelected() === stateList.APROBADO;
    const type = this.getRequestType();
    return isApproved && (type === SpecialRequestType.PRORROGA || type === SpecialRequestType.SUSPENSION);
  });

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  getRequestType(): SpecialRequestType {
    return this.specialRequest.requestType;
  }

  onObservationsChange(event: Event): void {
    this.observations.set((event.target as HTMLTextAreaElement).value);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const verdict = this.verdictSelected();

    if (!verdict) {
      this.formService.notifyMissingVerdict();
      return;
    }
    if (this.requiresNewDeadline() && !this.grantedDeadline()) {
      this.formService.notifyMissingDeadline();
      return;
    }

    this.onSave.emit({
      status: verdict,
      resolutionDetails: this.observations(),
      grantedDeadline: this.grantedDeadline() ?? undefined
    });
  }
}
