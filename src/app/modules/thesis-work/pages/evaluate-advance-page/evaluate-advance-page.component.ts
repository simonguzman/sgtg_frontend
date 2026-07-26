import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { SubmitAdvanceEvaluationPayload } from '../../interfaces/advance-playload.interface';
import { EvaluateAdvanceFacadeService } from './services/evaluate-advance-facade.service';
import { EvaluateAdvanceFormComponent } from '../../components/evaluate-advance-form/evaluate-advance-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({
  selector: 'app-evaluate-advance-page',
  imports: [EvaluateAdvanceFormComponent, ConfirmationActionModalComponent],
  templateUrl: './evaluate-advance-page.component.html',
  styleUrls: ['./evaluate-advance-page.component.css']
})
export class EvaluateAdvancePageComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly authService = inject(AuthService);
  protected readonly facade    = inject(EvaluateAdvanceFacadeService);

  // ── Estado de UI ──────────────────────────────────────────────────────────
  readonly thesisWorkState    = signal<ThesisWork | null>(null);
  readonly advanceId          = signal<string | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly pendingReviewData  = signal<SubmitAdvanceEvaluationPayload | null>(null);

  // currentAdvance: computed que depende de signals del componente — queda aquí
  readonly currentAdvance = computed<Advance | null>(() => {
    const work  = this.thesisWorkState();
    const advId = this.advanceId();
    if (!work || !advId || !work.advances) return null;
    return work.advances.find(a => a.id === advId) ?? null;
  });

  ngOnInit(): void {
    // Resolución de IDs: el thesis ID puede estar en un ancestro de la ruta
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
      (work) => this.thesisWorkState.set(work),
      ()     => { /* la fachada ya notificó */ }
    );
  }

  handleRequestConfirmation(data: SubmitAdvanceEvaluationPayload): void {
    this.pendingReviewData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processAdvanceEvaluation(): void {
    const data    = this.pendingReviewData();
    const work    = this.thesisWorkState();
    const advance = this.currentAdvance();
    const user    = this.authService.currentUser();
    if (!data || !work || !advance || !user) return;

    this.facade.saveEvaluation(
      work, advance, user, data,
      () => {
        this.isConfirmModalOpen.set(false);
        this.navigateBack();
      },
      () => { /* la fachada ya notificó */ }
    );
  }

  downloadCurrentAdvance(): void {
    const advance = this.currentAdvance();
    if (advance) this.facade.downloadAdvance(advance);
  }

  navigateBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
