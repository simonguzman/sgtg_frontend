import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { LoadedDocumentsPreliminaryDraftFacadeService } from './services/loaded-documents-preliminary-draft-facade.service';
import { LoadedDocumentsPreliminaryDraftMapperService } from './services/loaded-documents-preliminary-draft-mapper.service';

@Component({
  selector: 'app-loaded-documents-preliminary-draft-page',
  templateUrl: './loaded-documents-preliminary-draft-page.component.html',
  styleUrls: ['./loaded-documents-preliminary-draft-page.component.css'],
  standalone: true,
  imports: [FileUploadModalComponent, ConfirmationActionModalComponent, TableComponent, TabsComponent],
  // Proveemos los servicios aquí para atarlos al ciclo de vida del componente
  providers: [LoadedDocumentsPreliminaryDraftFacadeService, LoadedDocumentsPreliminaryDraftMapperService]
})
export class LoadedDocumentsPreliminaryDraftPageComponent implements OnInit, OnDestroy {
  // Inyectamos el facade público para usarlo directamente en el HTML
  public readonly facade = inject(LoadedDocumentsPreliminaryDraftFacadeService);

  ngOnInit(): void {
    this.facade.init();
  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }
}
