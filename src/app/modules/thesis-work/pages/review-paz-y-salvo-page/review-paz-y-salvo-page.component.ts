import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoReview, ReviewPazYSalvoFacadeService } from './services/review-paz-y-salvo-facade.service';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

/**
 * Decanatura revisa el paz y salvo (formato F) de la sustentación solicitada:
 * lo aprueba o no, siempre con el documento; si no lo aprueba, con observaciones.
 */
@Component({
  selector: 'app-review-paz-y-salvo-page',
  templateUrl: './review-paz-y-salvo-page.component.html',
  standalone: true,
  imports: [ConfirmationActionModalComponent, ButtonComponent]
})
export class ReviewPazYSalvoPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(ReviewPazYSalvoFacadeService);

  readonly thesisWork = signal<ThesisWork | null>(null);
  readonly approved = signal<boolean | null>(null);
  readonly observations = signal('');
  readonly formatF = signal<File | null>(null);
  readonly submitted = signal(false);
  readonly isSubmitting = signal(false);
  readonly isConfirmModalOpen = signal(false);

  readonly title = computed(() => this.thesisWork()?.preliminaryDraftData?.proposalData?.title ?? '');
  readonly missingDecision = computed(() => this.submitted() && this.approved() === null);
  readonly missingFile = computed(() => this.submitted() && !this.formatF());
  readonly missingObservations = computed(() =>
    this.submitted() && this.approved() === false && !this.observations().trim());

  ngOnInit(): void {
    let current: ActivatedRoute | null = this.route;
    let id: string | null = null;
    while (current && !id) {
      id = current.snapshot.paramMap.get('id');
      current = current.parent;
    }
    if (!id) {
      this.facade.showNavigationError();
      this.goBack();
      return;
    }
    this.facade.loadThesisWork(id, work => this.thesisWork.set(work), () => this.goBack());
  }

  selectFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.formatF.set(file);
  }

  submit(): void {
    this.submitted.set(true);
    if (this.missingDecision() || this.missingFile() || this.missingObservations()) return;
    this.isConfirmModalOpen.set(true);
  }

  confirm(): void {
    const work = this.thesisWork();
    const formatF = this.formatF();
    const approved = this.approved();
    if (!work || !formatF || approved === null) return;
    const review: PazYSalvoReview = { approved, observations: this.observations(), formatF };
    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);
    this.facade.save(work.thesisWorkId, review,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => this.isSubmitting.set(false));
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
