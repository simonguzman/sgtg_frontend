import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { LoadedProposalsFacadeService } from './services/loaded-proposals-facade.service';
import { DOCUMENTS_COLUMNS, DocumentTableRow } from './models/loaded-proposals-page.model';

@Component({
  selector: 'app-loaded-proposals-page',
  imports: [TableComponent, FileUploadModalComponent, ConfirmationActionModalComponent],
  templateUrl: './loaded-proposals-page.component.html',
  styleUrls: ['./loaded-proposals-page.component.css']
})
export class LoadedProposalsPageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(LoadedProposalsFacadeService);

  readonly columns = DOCUMENTS_COLUMNS;

  readonly proposalId = signal<string | null>(null);
  readonly uploadState = signal<{ fileName: string; file: File } | null>(null);
  readonly fileModalOpen = signal(false);
  readonly confirmModalOpen = signal(false);

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
    if (!event.row.allowedActions.includes(event.action)) return;
    switch (event.action) {
      case 'download':
        this.facade.handleDownload(event.row);
        break;
      case 'evaluate':
        this.router.navigate(['evaluate_proposal'], { relativeTo: this.route });
        break;
    }
  }

  handleHeaderButton(): void {
    if (!this.facade.canUpload(this.proposalId())) return;
    this.fileModalOpen.set(true);
  }

  onFileSelected(event: { fileName: string; file: File }): void {
    this.uploadState.set(event);
    this.fileModalOpen.set(false);
    this.confirmModalOpen.set(true);
  }

  confirmUpload(): void {
    const fileData = this.uploadState();
    const id = this.proposalId();
    if (!fileData || !id) return;

    this.facade.upload(
      id,
      fileData,
      () => {
        this.confirmModalOpen.set(false);
        this.uploadState.set(null);
      },
      () => {  }
    );
  }

  cancelUpload(): void {
    this.confirmModalOpen.set(false);
    this.uploadState.set(null);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
