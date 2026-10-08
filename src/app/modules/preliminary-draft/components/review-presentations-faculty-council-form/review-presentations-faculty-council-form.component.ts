import { Component, effect, inject, input, output, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { ReviewPresentationsFacultyCouncilFormFacadeService } from './services/review-presentations-faculty-council-form-facade.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
import { SaveEvaluationPayload } from './models/council-evaluation.model';

@Component({
  selector: 'app-review-presentations-faculty-council-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent, ReadonlyFieldComponent, DatePicker],
  providers: [ReviewPresentationsFacultyCouncilFormFacadeService],
  templateUrl: './review-presentations-faculty-council-form.component.html',
  styleUrls: ['./review-presentations-faculty-council-form.component.css']
})
export class ReviewPresentationsFacultyCouncilFormComponent implements OnInit {
  readonly facade = inject(ReviewPresentationsFacultyCouncilFormFacadeService);
  preliminaryDraft = input.required<PreliminaryDraft>();
  isSubmitting = input<boolean>(false);
  onSaveEvaluation = output<SaveEvaluationPayload>();
  onDownloadFile = output<FormattedDocument>();

  constructor() {
    effect(() => {
      this.facade.preliminaryDraft.set(this.preliminaryDraft());
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.facade.initFormEffects();
  }

  submit(): void {
    const payload = this.facade.validateAndGetPayload();
    if (payload) this.onSaveEvaluation.emit(payload);
  }
}
