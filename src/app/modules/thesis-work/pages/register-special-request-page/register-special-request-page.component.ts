import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { RegisterSpecialRequestFacadeService } from './services/register-special-request-facade.service';
import { RegisterSpecialRequestFormComponent } from '../../components/register-special-request-form/register-special-request-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({
  selector: 'app-register-special-request-page',
  templateUrl: './register-special-request-page.component.html',
  styleUrls: ['./register-special-request-page.component.css'],
  imports: [RegisterSpecialRequestFormComponent, ConfirmationActionModalComponent]
})
export class RegisterSpecialRequestPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  protected readonly facade = inject(RegisterSpecialRequestFacadeService);

  readonly isLoading         = signal(true);
  readonly isSubmitting      = signal(false);
  readonly thesisWorkData    = signal<ThesisWork | undefined>(undefined);
  readonly isConfirmModalOpen = signal(false);
  readonly pendingData       = signal<{ requestType: SpecialRequestType; comments: string } | null>(null);

  ngOnInit(): void {
    const thesisId = this.route.snapshot.paramMap.get('id') ?? this.route.parent?.snapshot.paramMap.get('id');
    if (!thesisId) { this.goBack(); return; }

    this.facade.loadThesisWork(
      thesisId,
      (work) => { this.thesisWorkData.set(work); this.isLoading.set(false); },
      ()     => { this.isLoading.set(false); this.goBack(); },
      ()     => { this.isLoading.set(false); }
    );
  }

  handleRequestConfirmation(event: { requestType: SpecialRequestType; comments: string }): void {
    this.pendingData.set(event);
    this.isConfirmModalOpen.set(true);
  }

  processSaveRequest(): void {
    const data        = this.pendingData();
    const currentWork = this.thesisWorkData();
    if (!data || !currentWork) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processSaveRequest(
      currentWork.thesisWorkId, data,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => { this.isSubmitting.set(false); }
    );
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
