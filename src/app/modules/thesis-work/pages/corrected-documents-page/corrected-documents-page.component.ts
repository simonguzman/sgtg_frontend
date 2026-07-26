import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { RegisterInformationModalComponent } from '../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { CorrectedDocumentsFacadeService } from './services/corrected-documents-facade.service';
import { CORRECTED_DOCUMENTS_COLUMNS, CorrectedDeliveryTableRow } from './models/corrected-documents-page.model';
import { CorrectedDelivery } from '../../interfaces/corrected-delivery.interface';
import { ensureDate } from '../../helpers/thesis-date.helper';

@Component({
  selector: 'app-corrected-documents-page',
  templateUrl: './corrected-documents-page.component.html',
  styleUrls: ['./corrected-documents-page.component.css'],
  standalone: true,
  imports: [TableComponent, ButtonComponent, RegisterInformationModalComponent, InfoBannerComponent]
})
export class CorrectedDocumentsPageComponent implements OnInit, OnDestroy {
  private readonly route             = inject(ActivatedRoute);
  private readonly router            = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  protected readonly facade          = inject(CorrectedDocumentsFacadeService);
  // ← titleService eliminado: se inyectaba pero nunca se usaba en ningún método.

  readonly columns = CORRECTED_DOCUMENTS_COLUMNS;

  readonly thesisWorkId       = signal<string | null>(null);
  readonly isDetailsModalOpen = signal<boolean>(false);
  // ← Fix: any → CorrectedDelivery
  readonly selectedDelivery   = signal<CorrectedDelivery | null>(null);
  readonly isArchived         = signal<boolean>(false);

  ngOnInit(): void {
    this.isArchived.set(
      this.router.url.includes('/history') ||
      this.router.url.includes('/historial') ||
      !!this.route.snapshot.data['isArchived']
    );

    const id = this.route.snapshot.paramMap.get('id')
      ?? this.route.parent?.snapshot.paramMap.get('id')
      ?? this.route.parent?.parent?.snapshot.paramMap.get('id');

    if (!id) {
      this.facade.showNavigationError();
      this.goBack();
      return;
    }
    this.thesisWorkId.set(id);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  // ── Computed reactivos: delegan la lógica pura a la fachada ───────────────
  readonly currentThesisWork = computed(() =>
    this.facade.findThesisWork(this.thesisWorkId(), this.thesisWorkService.thesisWorks())
  );

  readonly isDirector = computed(() => this.facade.isDirector(this.currentThesisWork()));
  readonly isJuror     = computed(() => this.facade.isJuror(this.currentThesisWork()));

  // ← hasUploadedCorrections eliminado: no se referenciaba en ningún lado del
  // template — era código muerto.

  readonly canDirectorUpload = computed(() =>
    this.facade.canDirectorUpload(this.currentThesisWork(), this.isDirector(), this.isArchived())
  );

  readonly canJurorEvaluate = computed(() =>
    this.facade.canJurorEvaluate(this.currentThesisWork(), this.isJuror(), this.isArchived())
  );

  readonly tableData = computed<CorrectedDeliveryTableRow[]>(() =>
    this.facade.buildTableData(this.currentThesisWork())
  );

  readonly selectedDeliveryDocuments = computed<string[]>(() =>
    this.facade.getDeliveryDocumentNames(this.selectedDelivery())
  );

  readonly studentName    = computed(() => this.facade.getStudentName(this.currentThesisWork()));
  readonly directorName   = computed(() => this.facade.getDirectorName(this.currentThesisWork()));
  readonly codirectorName = computed(() => this.facade.getCodirectorName(this.currentThesisWork()));
  readonly advisorName    = computed(() => this.facade.getAdvisorName(this.currentThesisWork()));
  readonly modalityName   = computed(() =>
    this.currentThesisWork()?.preliminaryDraftData?.proposalData?.modality ?? 'Sin modalidad'
  );

  // ← Ahora importado del helper compartido en vez de reimplementarse aquí
  // (duplicaba exactamente la misma lógica de LoadedDocumentsThesisWorkPageComponent).
  ensureDate = ensureDate;

  handleTableAction(event: { action: string; row: CorrectedDeliveryTableRow }): void {
    if (event.action === 'view-details') {
      this.selectedDelivery.set(event.row.rawDelivery);
      this.isDetailsModalOpen.set(true);
    }
  }

  downloadDocumentByName(fileName: string): void {
    this.facade.downloadDocumentByName(this.selectedDelivery(), fileName);
  }

  navigateToUploadCorrections(): void {
    this.router.navigate(['upload_corrections'], { relativeTo: this.route });
  }

  navigateToEvaluateCorrections(): void {
    this.router.navigate(['evaluate_corrections'], { relativeTo: this.route });
  }

  goBack(): void {
    const id            = this.thesisWorkId();
    const sustentationId = this.currentThesisWork()?.sustentations?.[0]?.id;
    const currentUrl    = this.router.url;
    const baseUrlSegment = currentUrl.split('/details')[0] || '/thesis-work';

    if (!id) {
      this.router.navigate([baseUrlSegment]);
      return;
    }
    if (sustentationId) {
      this.router.navigate([baseUrlSegment, 'details', id, 'view_sustentation_details', sustentationId]);
    } else {
      this.router.navigate([baseUrlSegment, 'details', id, 'loaded_documents']);
    }
  }
}
