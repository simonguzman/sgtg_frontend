import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

// Servicios de Core y Shared
import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/Breadcrumb.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

// Interfaces y Enums
import { Document } from '../../../../core/interfaces/Document.interface';
import { DocumentType } from '../../../../core/interfaces/Document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

// Componentes Reutilizables
import { Column, TableComponent } from "../../../../shared/components/table-component/table-component.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";

@Component({
  selector: 'app-corrected-documents-page',
  templateUrl: './corrected-documents-page.component.html',
  styleUrls: ['./corrected-documents-page.component.css'],
  standalone: true,
  imports: [TableComponent, ButtonComponent]
})
export class CorrectedDocumentsPageComponent implements OnInit {
  // --- Inyección de Dependencias ---
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly titleService = inject(Title);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  // --- Estado de la Página ---
  thesisWorkId = signal<string | null>(null);

  // --- Configuración de la Tabla ---
  protected columns: Column[] = [
    { field: 'name', header: 'Nombre del Documento', type: 'text', width: '40%' },
    { field: 'date', header: 'Fecha de Carga', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones',
      header: 'Acciones',
      type: 'actions',
      width: '20%',
      actions: [
        { action: 'download', label: 'Descargar', icon: 'download', variant: 'primary', disabled: false }
      ]
    }
  ];

  constructor() {
    setTimeout(() => {
      this.breadcrumbService.setDynamicBreadcrumb('Documentos corregidos');
      this.breadcrumbService.setDynamicTitle('Trabajo de Grado - Documentos Corregidos');
      this.titleService.setTitle('Trabajo de Grado - Documentos Corregidos');
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ||
               this.route.parent?.snapshot.paramMap.get('id') ||
               this.route.parent?.parent?.snapshot.paramMap.get('id');

    if (id) {
      this.thesisWorkId.set(id);
    } else {
      this.notificationService.show({
        title: 'Error de navegación',
        message: 'No se pudo identificar el código del trabajo de grado actual.',
        type: NotificationType.ERROR
      });
      this.goBack();
    }
  }

  // --- Selectores Reactivos (Computed Signals) ---

  private readonly currentThesisWork = computed(() => {
    const id = this.thesisWorkId();
    return id ? this.thesisWorkService.thesisWorks().find(w => w.thesisWorkId === id) : null;
  });

  // Valida si el usuario en sesión es el Director del proyecto
  isDirector = computed(() => {
    const thesis = this.currentThesisWork();
    const user = this.authService.currentUser();
    if (!thesis || !user) return false;
    return thesis.preliminaryDraftData?.proposalData?.director?.id === user.id;
  });

  // Valida si el usuario en sesión es un Jurado asignado
  isJuror = computed(() => {
    const thesis = this.currentThesisWork();
    const user = this.authService.currentUser();
    if (!thesis || !user || !thesis.sustentations?.[0]) return false;
    return thesis.sustentations?.[0].assignedJurors?.some(juror => juror.id === user.id) ?? false;
  });

  // =========================================================================
  // 🚀 NUEVA REGLA DE NEGOCIO: ¿Ya se evaluaron las correcciones?
  // =========================================================================
  // Si el estado macro del proyecto ya no es EN_REVISION (por ejemplo, pasó a APROBADO,
  // APROBADO_CON_OBSERVACIONES, APLAZADO, etc.), significa que un jurado ya asentó el dictamen.
  isAlreadyEvaluated = computed(() => {
    const thesis = this.currentThesisWork();
    if (!thesis) return false;

    // 1. Check por histórico: ¿Ya se registró alguna evaluación formal?
    const hasEvaluations = (thesis.evaluations?.length ?? 0) > 0;

    // 2. Check por documento: ¿El documento de evaluación (Formato G) ya fue aprobado/revisado?
    const hasFormatoGEvaluated = thesis.documents?.some(doc =>
      doc.type === DocumentType.CORRECCION &&
      doc.name.includes('Formato G') &&
      doc.status !== stateList.EN_REVISION
    ) ?? false;

    // Si cualquiera de las dos condiciones se cumple, se bloquea el flujo de carga y evaluación
    return hasEvaluations || hasFormatoGEvaluated;
  });

  // Mapea y filtra los documentos de tipo CORRECCION
  tableData = computed(() => {
    const thesis = this.currentThesisWork();
    if (!thesis || !thesis.documents) return [];

    const correctedDocs = thesis.documents.filter(
      (doc: Document) => doc.type === DocumentType.CORRECCION
    );

    return correctedDocs.map(doc => ({
      id: doc.id,
      name: doc.name,
      date: doc.uploadDate || 'Sin fecha',
      status: doc.status || stateList.EN_REVISION,
      allowedActions: ['download'],
      url: doc.url
    }));
  });

  // --- Controladores de Interacción y Acciones ---

  handleTableAction(event: { action: string; row: any }): void {
    if (event.action === 'download') {
      if (!event.row.url) {
        this.notificationService.show({
          title: 'Error de descarga',
          message: 'No existe un enlace de descarga válido para este archivo.',
          type: NotificationType.ERROR
        });
        return;
      }
      this.downloadService.download(event.row.url, `${event.row.name}.pdf`);
    }
  }

  // --- Navegación ---

  navigateToUploadCorrections(): void {
    this.router.navigate(['upload_corrections'], { relativeTo: this.route });
  }

  navigateToEvaluateCorrections(): void {
    this.router.navigate(['evaluate_corrections'], { relativeTo: this.route });
  }

  goBack(): void {
    // 🚀 Sube dos niveles: sale del path '' y luego sale de 'corrected_documents'
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  hasUploadedCorrections = computed(() => {
    return this.tableData().length > 0;
  });
}
