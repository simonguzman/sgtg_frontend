import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';
import { EvaluateAdvanceFacadeService } from './services/evaluate-advance-facade.service';
import { EvaluateAdvanceFormComponent } from '../../components/evaluate-advance-form/evaluate-advance-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

@Component({
  selector: 'app-evaluate-advance-page',
  imports: [EvaluateAdvanceFormComponent, ConfirmationActionModalComponent],
  templateUrl: './evaluate-advance-page.component.html',
  styleUrls: ['./evaluate-advance-page.component.css']
})
export class EvaluateAdvancePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  protected readonly facade = inject(EvaluateAdvanceFacadeService);

  readonly thesisWorkState = signal<ThesisWork | null>(null);
  readonly advanceId = signal<string | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly pendingReviewData  = signal<SubmitAdvanceEvaluationPayload | null>(null);
  readonly currentAdvance = computed<Advance | null>(() => {
    const thesisWork  = this.thesisWorkState();
    const advId = this.advanceId();
    if (!thesisWork || !advId || !thesisWork.advances) return null;
    return thesisWork.advances.find(advance => advance.id === advId) ?? null;
  });

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let thesisId: string | null = null;
    while (currentRoute && !thesisId) {
      thesisId = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }
    const advId = this.route.snapshot.paramMap.get('advanceId');

    if (!thesisId || !advId) {
      this.facade.showNavigationError();
      return;
    }

    this.advanceId.set(advId);
    this.facade.loadThesisWork(
      thesisId,
      (thesisWork) => this.thesisWorkState.set(thesisWork),
      () => { }
    );
  }

  handleRequestConfirmation(data: SubmitAdvanceEvaluationPayload): void {
    this.pendingReviewData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processAdvanceEvaluation(): void {
    const data = this.pendingReviewData();
    const thesisWork = this.thesisWorkState();
    const advance = this.currentAdvance();
    const user = this.authService.currentUser();
    if (!data || !thesisWork || !advance || !user) return;
    // ← void: saveEvaluation() ahora es async.
    void this.facade.saveEvaluation(
      thesisWork, advance, user, data,
      () => {
        this.isConfirmModalOpen.set(false);
        this.navigateBack();
      },
      () => { }
    );
  }

  downloadCurrentAdvance(doc: FileDocument): void {
    void this.facade.downloadAdvance(doc);
  }

  navigateBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
