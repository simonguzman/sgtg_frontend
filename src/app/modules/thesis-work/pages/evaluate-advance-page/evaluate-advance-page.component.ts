import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';
import { EvaluateAdvanceFacadeService } from './services/evaluate-advance-facade.service';
import { EvaluateAdvanceFormComponent } from '../../components/evaluate-advance-form/evaluate-advance-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';

@Component({
  selector: 'app-evaluate-advance-page',
  imports: [EvaluateAdvanceFormComponent, ConfirmationActionModalComponent],
  templateUrl: './evaluate-advance-page.component.html',
  styleUrls: ['./evaluate-advance-page.component.css']
})
export class EvaluateAdvancePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
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
  /** true si el usuario en sesión ya revisó el informe (una revisión por revisor). */
  readonly alreadyEvaluated = computed<boolean>(() => {
    const userId = this.authService.currentUser()?.id;
    const advId = this.advanceId();
    return (this.thesisWorkState()?.evaluations ?? [])
      .some(evaluation => evaluation.advanceId === advId && evaluation.evaluatorId === userId);
  });
  readonly isSaving = signal(false);

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
    if (!data || !thesisWork || !advance) return;
    this.isSaving.set(true);
    this.facade.saveEvaluation(
      thesisWork, advance, data,
      () => {
        this.isSaving.set(false);
        this.isConfirmModalOpen.set(false);
        this.navigateBack();
      },
      () => {
        this.isSaving.set(false);
        this.isConfirmModalOpen.set(false);
      }
    );
  }

  downloadCurrentAdvance(document: FormattedDocument): void {
    void this.facade.downloadAdvance(document);
  }

  navigateBack(): void {
    this.navigation.back(() => this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent }));
  }
}
