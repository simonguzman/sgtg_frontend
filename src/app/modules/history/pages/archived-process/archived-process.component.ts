import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserService } from '../../../users/services/user.service';
import { ProposalService } from '../../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../thesis-work/services/thesis-work.service';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { User } from '../../../users/interfaces/user.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

@Component({
  selector: 'app-archived-process',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './archived-process.component.html',
  styleUrls: ['./archived-process.component.css']
})
export class ArchivedProcessComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);

  // Inyección de los 3 servicios para buscar en el historial
  private readonly proposalService = inject(ProposalService);
  private readonly draftService = inject(PreliminaryDraftService);
  private readonly thesisService = inject(ThesisWorkService);

  // Estados
  processType = signal<string>('');
  processId = signal<string>('');

  // Almacenará el registro crudo encontrado
  rawData = signal<any>(null);

  constructor() {
    // Sincronización dinámica de Breadcrumbs y Título
    effect(() => {
      const typeStr = this.processType().toUpperCase() || 'DOCUMENTO';
      setTimeout(() => {
        this.breadcrumbService.setDynamicBreadcrumb(`Detalle de ${typeStr}`);
        this.breadcrumbService.setDynamicTitle(`Historial - ${typeStr}`);
        this.titleService.setTitle(`Historial - ${typeStr}`);
      });
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const type = params.get('type');
      const id = params.get('id');

      if (type && id) {
        this.processType.set(type);
        this.processId.set(id);
        this.loadArchivedData(type, id);
      } else {
        this.goBack();
      }
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  private loadArchivedData(type: string, id: string): void {
    let data = null;
    switch (type.toLowerCase()) {
      case 'propuestas':
        data = this.proposalService.proposals().find(p => p.id === id);
        break;
      case 'anteproyectos':
        data = this.draftService.preliminaryDrafts().find(d => d.preliminaryDraftId === id);
        break;
      case 'trabajos':
        data = this.thesisService.thesisWorks().find(t => t.thesisWorkId === id);
        break;
    }

    if (data) {
      this.rawData.set(data);
    } else {
      this.notificationService.show({
        title: 'Registro no encontrado',
        message: 'No se pudo cargar la información histórica solicitada.',
        type: NotificationType.ERROR
      });
      this.goBack();
    }
  }

  // --- Computeds para extraer la información normalizada ---

  // Obtiene la propuesta base sin importar en qué etapa se archivó
  baseProposal = computed(() => {
    const data = this.rawData();
    if (!data) return null;
    if (this.processType() === 'propuestas') return data;
    if (this.processType() === 'anteproyectos') return data.proposalData;
    if (this.processType() === 'trabajos') return data.preliminaryDraftData?.proposalData;
    return null;
  });

  title = computed(() => this.baseProposal()?.title || 'Sin título registrado');
  modality = computed(() => this.baseProposal()?.modality || 'No definida');
  status = computed(() => this.rawData()?.state || 'Desconocido');

  studentName = computed<string>(() => {
    const authors = this.baseProposal()?.authors;
    return this.userService.getAuthorsNames(authors) || 'Sin estudiante asignado';
  });

  directorName = computed<string>(() => {
    const director = this.baseProposal()?.director;
    return this.getUserFullName(director) || 'Sin director asignado';
  });

  codirectorName = computed<string | undefined>(() => {
    const codirector = this.baseProposal()?.codirector;
    return this.getUserFullName(codirector);
  });

  advisorName = computed<string | undefined>(() => {
    const advisor = this.baseProposal()?.advisor;
    return this.getUserFullName(advisor);
  });

  // Extrae todos los documentos disponibles del registro para mostrarlos en una lista
  historicalDocuments = computed<FileDocument[]>(() => {
    const data = this.rawData();
    if (!data) return [];

    let docs: FileDocument[] = [];
    if (data.documents && Array.isArray(data.documents)) {
      docs = [...data.documents];
    }
    // Si es un trabajo de grado, extraemos anexos o monografías finales
    if (this.processType() === 'trabajos' && data.finalDeliveries) {
      data.finalDeliveries.forEach((delivery: any) => {
        if (delivery.monograph) docs.push(delivery.monograph);
        if (delivery.formatE) docs.push(delivery.formatE);
        if (delivery.annexes) docs.push(delivery.annexes);
      });
    }
    return docs;
  });

  private getUserFullName(user?: User): string | undefined {
    if (!user) return undefined;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }

  downloadDocument(document: FileDocument): void {
    if (!document.url) {
      this.notificationService.show({
        title: 'Error de descarga',
        message: 'No existe una URL válida vinculada a este archivo histórico.',
        type: NotificationType.ERROR
      });
      return;
    }
    this.downloadService.download(document.url, `${document.name}.pdf`);
  }

  goBack(): void {
    this.router.navigate(['/history']);
  }
}
