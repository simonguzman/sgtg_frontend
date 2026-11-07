import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { SpecialRequestDecision } from '../../services/thesis-work-special-request.service';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { EvaluateSpecialRequestFacadeService } from './services/evaluate-special-request-facade.service';
import { EvaluateSpecialRequestFormComponent } from '../../components/evaluate-special-request-form/evaluate-special-request-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';
import { stateList } from '../../../../core/enums/state.enum';

@Component({
  selector: 'app-evaluate-special-request-page',
  templateUrl: './evaluate-special-request-page.component.html',
  styleUrls: ['./evaluate-special-request-page.component.css'],
  imports: [EvaluateSpecialRequestFormComponent, ConfirmationActionModalComponent]
})
export class EvaluateSpecialRequestPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  protected readonly facade = inject(EvaluateSpecialRequestFacadeService);

  readonly thesisWorkState = signal<ThesisWork | null>(null);
  readonly specialRequestState = signal<SpecialRequest | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly pendingData = signal<SpecialRequestDecision | null>(null);
  /** Lo que se confirma depende de quién decide: el concepto de pertinencia del Comité o la decisión del Consejo */
  readonly confirmationMessage = computed(() => {
    if (this.specialRequestState()?.pendingWith !== 'COMITE') {
      return '¿Está seguro de registrar la decisión del Consejo sobre esta solicitud? Se notificará a los '
        + 'participantes y se actualizará el trabajo de grado.';
    }
    return this.pendingData()?.status === stateList.APROBADO
      ? '¿Está seguro de registrar el cambio de título y objetivos como pertinente? La solicitud pasará al Consejo de Facultad para su decisión.'
      : '¿Está seguro de registrar el cambio de título y objetivos como no pertinente? La solicitud se cerrará y se notificará '
        + 'al director y a los estudiantes con sus observaciones.';
  });

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('requestId');
    let thesisId = this.route.snapshot.paramMap.get('id');
    let currentRoute = this.route.parent;
    while (!thesisId && currentRoute) {
      thesisId = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (!thesisId || !requestId) {
      console.warn('Faltan parámetros en la URL:', { thesisId, requestId });
      this.goBack();
      return;
    }

    this.facade.loadThesisWorkAndRequest(
      thesisId, requestId,
      (thesisWork, request) => {
        this.thesisWorkState.set(thesisWork);
        this.specialRequestState.set(request);
      },
      () => this.goBack()
    );
  }

  handleSaveTriggered(data: SpecialRequestDecision): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processSpecialRequestEvaluation(): void {
    const data = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    const request = this.specialRequestState();
    if (!data || !thesisId || !request) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processEvaluation(
      thesisId, request, data,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => { this.isSubmitting.set(false); }
    );
  }

  downloadDocument(document: FileDocument): void {
    void this.facade.downloadDocument(document);
  }

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent, queryParams: { tab: 'SOLICITUDES' } }));
  }
}
