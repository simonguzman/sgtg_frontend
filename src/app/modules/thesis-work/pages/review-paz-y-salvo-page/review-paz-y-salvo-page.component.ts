import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoReviewPayload } from '../../interfaces/paz-y-salvo-review.interface';
import { ReviewPazYSalvoFacadeService } from './services/review-paz-y-salvo-facade.service';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ReviewPazYSalvoFormComponent } from '../../components/review-paz-y-salvo-form/review-paz-y-salvo-form.component';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

/** Decanatura revisa el paz y salvo (formato F) de la sustentación solicitada. */
@Component({
  selector: 'app-review-paz-y-salvo-page',
  imports: [ConfirmationActionModalComponent, ReviewPazYSalvoFormComponent],
  templateUrl: './review-paz-y-salvo-page.component.html',
  styleUrls: ['./review-paz-y-salvo-page.component.css']
})
export class ReviewPazYSalvoPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(ReviewPazYSalvoFacadeService);

  readonly thesisWorkState = signal<ThesisWork | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly pendingData = signal<{ payload: PazYSalvoReviewPayload; file: File } | null>(null);

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;
    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (!id) {
      this.facade.showNavigationError();
      this.goBack();
      return;
    }

    this.facade.loadThesisWork(
      id,
      (thesisWork) => this.thesisWorkState.set(thesisWork),
      () => this.goBack()
    );
  }

  handleRequestConfirmation(data: { payload: PazYSalvoReviewPayload; file: File }): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processPazYSalvo(): void {
    const data = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!data || !thesisId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processPazYSalvo(
      thesisId,
      data.payload,
      data.file,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => { this.isSubmitting.set(false); }
    );
  }

  downloadDocument(document: FileDocument): void {
    void this.facade.downloadDocument(document);
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
