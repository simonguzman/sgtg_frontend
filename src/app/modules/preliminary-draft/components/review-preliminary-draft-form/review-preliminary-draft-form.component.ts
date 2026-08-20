import { Component, effect, inject, input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { PendingReviewData } from '../../interfaces/review-preliminary-draft-payload.interface';
import { ReviewPreliminaryDraftFormFacadeService } from './services/review-preliminary-draft-form-facade.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";

@Component({
  selector: 'app-review-preliminary-draft-form',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FileUploadModalComponent, InfoBannerComponent],
  providers: [ReviewPreliminaryDraftFormFacadeService],
  templateUrl: './review-preliminary-draft-form.component.html',
  styleUrls: ['./review-preliminary-draft-form.component.css']
})
export class ReviewPreliminaryDraftFormComponent {
  readonly facade = inject(ReviewPreliminaryDraftFormFacadeService);

  preliminaryDraft = input.required<PreliminaryDraft>();
  isSubmitting = input<boolean>(false);

  // ← FIX: antes EventEmitter<{ formValues: any; ... }>. Ahora reutiliza
  // PendingReviewData, la misma interfaz que
  // ReviewPreliminaryDraftPageFacadeService.handleRequestConfirmation ya exige.
  @Output() onSaveEvaluation = new EventEmitter<PendingReviewData>();
  @Output() onDownloadPreliminaryDraft = new EventEmitter<void>();

  constructor() {
    effect(() => {
      this.facade.preliminaryDraft.set(this.preliminaryDraft());
    }, { allowSignalWrites: true });
  }

  submit(): void {
    const payload = this.facade.validateAndGetPayload();
    if (payload) {
      this.onSaveEvaluation.emit(payload);
    }
  }
}
