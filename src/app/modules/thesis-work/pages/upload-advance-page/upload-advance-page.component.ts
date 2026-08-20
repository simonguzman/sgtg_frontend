import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { UploadAdvancePayload } from '../../interfaces/advance-playload.interface';
import { UploadAdvancePageFacadeService } from './services/upload-advance-page-facade.service';
import { UploadAdvanceFormComponent } from '../../components/upload-advance-form/upload-advance-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({
  selector: 'app-upload-advance-page',
  imports: [UploadAdvanceFormComponent, ConfirmationActionModalComponent],
  templateUrl: './upload-advance-page.component.html',
  styleUrls: ['./upload-advance-page.component.css']
})
export class UploadAdvancePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  protected readonly facade = inject(UploadAdvancePageFacadeService);

  readonly thesisWorkState = signal<ThesisWork | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly pendingAdvanceData = signal<UploadAdvancePayload | null>(null);

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;
    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (!id) {
      this.facade.showNavigationError();
      this.navigateBack();
      return;
    }

    this.facade.loadThesisWork(
      id,
      (thesisWork) => this.thesisWorkState.set(thesisWork),
      () => this.navigateBack()
    );
  }

  handleSaveRequest(data: UploadAdvancePayload): void {
    this.pendingAdvanceData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processAdvance(): void {
    const data = this.pendingAdvanceData();
    const thesis = this.thesisWorkState();
    const user = this.authService.currentUser();
    if (!data || !thesis || !user) return;
    this.isSaving.set(true);
    // ← void: processAdvance() ahora es async.
    void this.facade.processAdvance(
      thesis.thesisWorkId,
      user.id,
      data,
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

  navigateBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
