import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterInformationModalComponent } from '../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { LoadedProposalsFacadeService } from './services/loaded-proposals-facade.service';
import { DOCUMENTS_COLUMNS, DocumentTableRow, ProposalRegistrationDetails } from './models/loaded-proposals-page.model';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';

@Component({
  selector: 'app-loaded-proposals-page',
  imports: [TableComponent, FileUploadModalComponent, ConfirmationActionModalComponent, RegisterInformationModalComponent],
  templateUrl: './loaded-proposals-page.component.html',
  styleUrls: ['./loaded-proposals-page.component.css']
})
export class LoadedProposalsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  protected readonly facade = inject(LoadedProposalsFacadeService);

  readonly columns = DOCUMENTS_COLUMNS;
  protected readonly today = new Date();
  readonly proposalId = signal<string | null>(null);
  readonly uploadState = signal<{ fileName: string; file: File } | null>(null);
  readonly fileModalOpen = signal(false);
  /** Nueva carta de aceptación (práctica profesional), que acompaña a la propuesta corregida */
  readonly letterState = signal<{ fileName: string; file: File } | null>(null);
  readonly letterModalOpen = signal(false);
  /** Mientras se carga la corrección no se abre otra carga (se enviaría dos veces) */
  readonly isUploading = signal(false);
  readonly requiresAcceptanceLetter = computed(() => this.facade.requiresAcceptanceLetter(this.proposalId()));
  readonly confirmDescription = computed(() => this.requiresAcceptanceLetter()
    ? '¿Está seguro de cargar esta corrección? Se cargará la nueva carta de aceptación y la propuesta pasará a \'En revisión\'.'
    : '¿Está seguro de cargar esta corrección? El estado cambiará a \'En revisión\'.');
  readonly confirmModalOpen = signal(false);
  /** Registro abierto en el modal de detalles */
  readonly selectedRow = signal<DocumentTableRow | null>(null);

  readonly registrationDetails = computed<ProposalRegistrationDetails | null>(() =>
    this.facade.buildRegistrationDetails(this.proposalId(), this.selectedRow())
  );

  readonly registrationDocumentNames = computed<string[]>(() =>
    this.registrationDetails()?.documents.map(document => document.name) ?? []
  );

  readonly documentsTableData = computed<DocumentTableRow[]>(() =>
    this.facade.buildDocumentsTableData(this.proposalId())
  );

  readonly headerButtons = computed<TableButton[]>(() =>
    this.facade.buildHeaderButtons(this.proposalId())
  );

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    if (id) this.proposalId.set(id);
  }

  handleTableAction(event: { action: string; row: DocumentTableRow }): void {
    if (!event.row.allowedActions.includes(event.action)) {
      this.facade.showRestrictedActionNotification();
      return;
    }
    switch (event.action) {
      case 'view-details':
        this.selectedRow.set(event.row);
        break;
      case 'evaluate':
        this.router.navigate(['evaluate_proposal'], { relativeTo: this.route });
        break;
    }
  }

  handleHeaderButton(button: TableButton): void {
    if (button.action !== 'upload_correction' || this.isUploading()) return;
    if (!this.facade.canUpload(this.proposalId())) return;
    this.fileModalOpen.set(true);
  }

  onFileSelected(event: { fileName: string; file: File }): void {
    this.uploadState.set(event);
    this.fileModalOpen.set(false);
    // En práctica profesional, después del formato A se pide la nueva carta de aceptación
    if (this.requiresAcceptanceLetter()) this.letterModalOpen.set(true);
    else this.confirmModalOpen.set(true);
  }

  onLetterSelected(event: { fileName: string; file: File }): void {
    this.letterState.set(event);
    this.letterModalOpen.set(false);
    this.confirmModalOpen.set(true);
  }

  /** Sin la nueva carta no se carga la corrección de una práctica profesional */
  closeLetterModal(): void {
    this.letterModalOpen.set(false);
    if (this.letterState()) return;
    this.uploadState.set(null);
    this.facade.showAcceptanceLetterRequiredNotification();
  }

  confirmUpload(): void {
    const fileData = this.uploadState();
    const id = this.proposalId();
    if (!fileData || !id || this.isUploading()) return;

    this.isUploading.set(true);
    void this.facade.upload(
      id,
      fileData,
      () => {
        this.isUploading.set(false);
        this.confirmModalOpen.set(false);
        this.uploadState.set(null);
        this.letterState.set(null);
      },
      () => this.isUploading.set(false),
      this.letterState()?.file ?? null
    );
  }

  downloadRegistrationDocument(fileName: string): void {
    void this.facade.downloadRegistrationDocument(fileName, this.selectedRow());
  }

  closeDetails(): void {
    this.selectedRow.set(null);
  }

  cancelUpload(): void {
    this.confirmModalOpen.set(false);
    this.uploadState.set(null);
    this.letterState.set(null);
  }

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['../'], { relativeTo: this.route }));
  }
}
