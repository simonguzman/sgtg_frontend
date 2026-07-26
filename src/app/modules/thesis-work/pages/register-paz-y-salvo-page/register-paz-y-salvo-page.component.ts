import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../interfaces/paz-y-salvo-playload.interface';
import { RegisterPazYSalvoFacadeService } from './services/register-paz-y-salvo-facade.service';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterPazYSalvoFormComponent } from '../../components/register-paz-y-salvo-form/register-paz-y-salvo-form.component';

@Component({
  selector: 'app-register-paz-y-salvo-page',
  imports: [ConfirmationActionModalComponent, RegisterPazYSalvoFormComponent],
  templateUrl: './register-paz-y-salvo-page.component.html',
  styleUrls: ['./register-paz-y-salvo-page.component.css']
})
export class RegisterPazYSalvoPageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(RegisterPazYSalvoFacadeService);

  readonly thesisWorkState    = signal<ThesisWork | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly isSubmitting       = signal(false);
  // ← Fix: any → tipo concreto
  readonly pendingData        = signal<{ payload: PazYSalvoPayload; file: File } | null>(null);

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;
    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (!id) { this.goBack(); return; }

    this.facade.loadThesisWork(
      id,
      (work) => this.thesisWorkState.set(work),
      ()     => this.goBack()
    );
  }

  // ← Fix: any → { payload: PazYSalvoPayload; file: File }
  handleRequestConfirmation(data: { payload: PazYSalvoPayload; file: File }): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processPazYSalvo(): void {
    const data     = this.pendingData();
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

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
