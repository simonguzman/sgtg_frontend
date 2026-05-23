import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TabConfiguration, ThesisEvaluationContext } from './tabs-logic/tab-config.interface';
import { AdvancesTabConfig } from './tabs-logic/advaces.tab';
import { UserRoleType } from '../../../../core/models/user-role';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/Breadcrumb.service';
import { Title } from '@angular/platform-browser';
import { TabItem, TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { stateList } from '../../../../core/enums/state.enum';
import { FinalDeliveryTabConfig } from './tabs-logic/final-delivery.tab';
import { PazYSalvoTabConfig } from './tabs-logic/paz_y_salvo.tab';
import { SustentationTabConfig } from './tabs-logic/sustentation.tab';
import { CorrespondenceTabConfig } from './tabs-logic/correspondence.tab';
import { SpecialRequestTabConfig } from './tabs-logic/special-request.tab';
import { RegisterInformationModalComponent } from "../../../../shared/components/modals/register-information-modal/register-information-modal.component";
import { UserService } from '../../../users/services/user.service';
import { Advance } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-loaded-documents-thesis-work-page',
  templateUrl: './loaded-documents-thesis-work-page.component.html',
  styleUrls: ['./loaded-documents-thesis-work-page.component.css'],
  imports: [FileUploadModalComponent, ConfirmationActionModalComponent, TableComponent, TabsComponent, RegisterInformationModalComponent]
})
export class LoadedDocumentsThesisWorkPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly titleService = inject(Title);

  readonly tabsConfig: TabItem[] = [
    { label: 'Avances', value: 'AVANCES' },
    { label: 'Entrega final', value: 'ENTREGA FINAL' },
    { label: 'Paz y salvo', value: 'PAZ Y SALVO' },
    { label: 'Sustentación', value: 'SUSTENTACION' },
    { label: 'Correspondencia', value: 'CORRESPONDENCIA' },
    { label: 'Solicitudes especiales', value: 'SOLICITUDES' },
  ];

  private readonly tabStrategies: Record<string, TabConfiguration> = {
    'AVANCES': AdvancesTabConfig,
    'ENTREGA FINAL': FinalDeliveryTabConfig,
    'PAZ Y SALVO': PazYSalvoTabConfig,
    'SUSTENTACION': SustentationTabConfig,
    'CORRESPONDENCIA': CorrespondenceTabConfig,
    'SOLICITUDES': SpecialRequestTabConfig
  };

  activeTab = signal<string>('AVANCES');
  thesisWorkId = signal<string | null>(null);

  isUploadModalOpen = signal(false);
  isConfirmModalOpen = signal(false);
  uploadContext = signal<{ fileName: string, file: File } | null>(null);
  isDetailsModalOpen = signal(false);
  selectedAdvance = signal<Advance | null>(null);

  // Fallback seguro de fecha para evitar la inicialización nativa directa en el HTML
  readonly defaultFallbackDate = new Date();

  constructor() {
    effect(() => {
      const matchTab = this.tabsConfig.find(t => t.value === this.activeTab());
      const tabLabel = matchTab ? matchTab.label : 'Documentos';
      setTimeout(() => {
        this.breadcrumbService.setDynamicBreadcrumb(tabLabel);
        this.breadcrumbService.setDynamicTitle(`Trabajo de Grado - ${tabLabel}`);
        this.titleService.setTitle(`Trabajo de Grado - ${tabLabel}`);
      });
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (id) this.thesisWorkId.set(id);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  private readonly currentThesisWork = computed(() => {
    const id = this.thesisWorkId();
    return id ? this.thesisWorkService.thesisWorks().find(w => w.thesisWorkId === id) : null;
  });

  currentStrategy = computed<TabConfiguration>(() => {
    return this.tabStrategies[this.activeTab()] || AdvancesTabConfig;
  });

  evaluationContext = computed<ThesisEvaluationContext>(() => {
    const thesis = this.currentThesisWork();
    const user = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
    const isDecanatura = this.authService.hasAnyRole([UserRoleType.DECANATURA]);
    const isConsejo = this.authService.hasAnyRole([UserRoleType.CONSEJO]);

    const baseContext: ThesisEvaluationContext = {
      thesisWork: thesis ?? null,
      currentUser: user,
      isAdmin,
      isDecanatura,
      isConsejo,
      isStudent: thesis?.preliminaryDraftData?.proposalData?.authors?.some(
        (a: { id?: string } | string) => (typeof a === 'string' ? a : a.id) === user?.id
      ) ?? false,
      isDirector: thesis?.preliminaryDraftData?.proposalData?.director?.id === user?.id,
      isCodirector: thesis?.preliminaryDraftData?.proposalData?.codirector?.id === user?.id,
      isAdvisor: thesis?.preliminaryDraftData?.proposalData?.advisor?.id === user?.id,
      isJuror: thesis?.sustentations?.[0]?.assignedJurors?.some(
        (j: User) => j.id === user?.id
      ) ?? false,
      latestAdvanceId: null,
      isLatestAdvancePending: false
    };

    return this.currentStrategy().enrichEvaluationContext(baseContext);
  });

  currentColumns = computed(() => this.currentStrategy().columns);

  currentHeaderButtons = computed(() => this.currentStrategy().getHeaderButtons(this.evaluationContext()));

  currentTableData = computed(() => {
    const context = this.evaluationContext();
    const thesis = context.thesisWork;
    if (!thesis) return [];

    const docs = this.activeTab() === 'AVANCES' ? [] : (thesis.documents || []);
    return this.currentStrategy().getTableData(docs, context);
  });

  // ==========================================
  // 🧠 PROCESADORES REACTIVOS PARA EL MODAL DE DETALLES
  // ==========================================
  selectedAdvanceDocuments = computed<string[]>(() => {
    const advance = this.selectedAdvance();
    return advance?.documents?.map((d: Document) => d.name) || [];
  });

  studentName = computed<string>(() => {
    const authors = this.evaluationContext()
      .thesisWork
      ?.preliminaryDraftData
      ?.proposalData
      ?.authors;

    return this.userService.getAuthorsNames(authors) || 'Sin estudiante';
  });

  directorName = computed<string>(() => {
    const director = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.director;
    return this.getUserFullName(director) || 'Sin director';
  });

  codirectorName = computed<string | undefined>(() => {
    const codirector = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.codirector;
    return this.getUserFullName(codirector);
  });

  advisorName = computed<string | undefined>(() => {
    const advisor = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.advisor;
    return this.getUserFullName(advisor);
  });

  modalityName = computed<string>(() => {
    return this.evaluationContext()
      .thesisWork
      ?.preliminaryDraftData
      ?.proposalData
      ?.modality || 'Sin modalidad';
  });

  private getUserFullName(user?: User): string | undefined {
    if (!user) return undefined;

    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }

  // ==========================================
  // 🚀 MANEJO DE ACCIONES Y EVENTOS
  // ==========================================
  handleHeaderButton(button: TableButton): void {
    if (button.label?.toLowerCase().includes('cargar') || button.label?.toLowerCase().includes('registrar')) {
      if (this.activeTab() === 'AVANCES') {
        this.router.navigate(['upload_advance'], { relativeTo: this.route });
      } else if (this.activeTab() === 'ENTREGA FINAL') {
        this.router.navigate(['upload_final_delivery'], { relativeTo: this.route });
      } else if (this.activeTab() === 'PAZ Y SALVO') {
        this.router.navigate(['register_paz_y_salvo'], { relativeTo: this.route });
      } else if (this.activeTab() === 'SUSTENTACION') {
        this.router.navigate(['register_sustentation'], { relativeTo: this.route });
      } else if (this.activeTab() === 'CORRESPONDENCIA') {
        this.router.navigate(['register_correspondence'], { relativeTo: this.route });
      } else if (this.activeTab() === 'SOLICITUDES') {
        this.router.navigate(['register_special_request'], { relativeTo: this.route });
      } else {
        this.isUploadModalOpen.set(true);
      }
    }
  }

  handleTableAction(event: { action: string; row: Record<string, unknown> }): void {
    const rowAllowedActions = event.row['allowedActions'] as string[] | undefined;
    const rowId = event.row['id'] as string;

    if (rowAllowedActions && !rowAllowedActions.includes(event.action)) {
      this.showRestrictedActionNotification();
      return;
    }

    switch (event.action) {
      case 'download':
        this.handleDownload(event.row as unknown as Document);
        break;

      case 'evaluate-advance':
        this.router.navigate(['evaluate_advance', rowId], { relativeTo: this.route });
        break;

      case 'evaluate_special_request':
        this.router.navigate([`./evaluate_special_request`, rowId], { relativeTo: this.route });
        break;

      case 'view_sustentation_details':
        this.router.navigate([event.action, rowId], { relativeTo: this.route });
        break;
      case 'evaluate_sustentation':
        this.router.navigate([event.action, rowId], { relativeTo: this.route });
        break;
      case 'view-details':
        this.openDetailsModal(rowId);
        break;
      default:
        this.router.navigate([event.action], { relativeTo: this.route });
        break;
    }
  }

  onFileSelected(event: { fileName: string; file: File }): void {
    this.uploadContext.set(event);
    this.isUploadModalOpen.set(false);
    this.isConfirmModalOpen.set(true);
  }

  confirmUpload(): void {
    const selectedFileData = this.uploadContext();
    const thesisId = this.thesisWorkId();
    if (!selectedFileData || !thesisId) return;

    this.showProcessingNotification();

    const newDocumentRecord: Document = {
      id: crypto.randomUUID(),
      name: selectedFileData.fileName.replace('.pdf', ''),
      url: '',
      uploadDate: this.formatDate(new Date()),
      type: this.currentStrategy().modalConfig.uploadDocumentType,
      status: stateList.EN_REVISION
    };

    this.thesisWorkService.uploadDocumentMock(thesisId, newDocumentRecord).subscribe({
      next: () => {
        this.showSuccessNotification();
        this.cancelUpload();
      },
      error: (err) => {
        console.error('Error detectado en la carga de archivos:', err);
        this.showErrorNotification();
      }
    });
  }

  cancelUpload(): void {
    this.isConfirmModalOpen.set(false);
    this.uploadContext.set(null);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  ensureDate(date: Date | string | undefined | null): Date {
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date;
    }
    if (typeof date === 'string' && date.trim() !== '') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    // Si todo falla, devolvemos la fecha actual para que el pipe no rompa
    return new Date();
  }

  modalDetailsHeader = computed<string>(() => {
    if (this.activeTab() === 'AVANCES') return 'Detalles del avance';
    if (this.activeTab() === 'ENTREGA FINAL') return 'Detalles de la Entrega Final';
    if (this.activeTab() === 'PAZ Y SALVO') return 'Detalles de Paz y Salvo';
    return 'Detalles del Registro';
  });

  modalDetailsSubtitle = computed<string>(() => {
    if (this.activeTab() === 'AVANCES') return 'Información del avance cargado';
    if (this.activeTab() === 'ENTREGA FINAL') return 'Información de los documentos de entrega final';
    if (this.activeTab() === 'PAZ Y SALVO') return 'Información de aprobaciones académicas y financieras';
    return 'Información del documento cargado';
  });

  downloadDocumentByName(fileName: string): void {
    let targetDocument: Document | undefined;
    // 🟢 Si estamos en Avances, buscamos dentro del avance seleccionado
    if (this.activeTab() === 'AVANCES') {
      targetDocument = this.selectedAdvance()?.documents?.find(
        (doc: Document) => doc.name === fileName
      );
    }
    // 🔵 Para cualquier otra pestaña, buscamos en los documentos globales del Trabajo de Grado
    else {
      targetDocument = this.currentThesisWork()?.documents?.find(
        (doc: Document) => doc.name === fileName
      );
    }
    // Ejecutamos la descarga si encontramos el documento
    if (targetDocument) {
      this.handleDownload(targetDocument);
    } else {
      // 👈 SOLUCIÓN: Casteo explícito a 'as Document' para silenciar el compilador en el fallback
      this.handleDownload({
        name: fileName,
        url: ''
      } as Document);
    }
  }

  private openDetailsModal(rowId: string): void {
    const thesis = this.currentThesisWork();
    if (!thesis) return;

    // 🟢 LÓGICA PARA LA PESTAÑA DE AVANCES
    if (this.activeTab() === 'AVANCES') {
      const advance = thesis.advances?.find(a => a.id === rowId);

      if (advance) {
        this.selectedAdvance.set(advance);
        this.isDetailsModalOpen.set(true);
      } else {
        this.showNotFoundError();
      }
    }
    // 🔵 LÓGICA PARA LA PESTAÑA DE ENTREGA FINAL
    else if (this.activeTab() === 'ENTREGA FINAL') {
      // Simplemente buscamos por el ID del contenedor
      const delivery = thesis.finalDeliveries?.find(d => d.id === rowId);

      if (!delivery) {
        this.showNotFoundError();
        return;
      }

      // Agrupamos los documentos de forma limpia
      const finalDeliveryDocs: Document[] = [delivery.monograph, delivery.formatE];
      if (delivery.annexes) {
        finalDeliveryDocs.push(delivery.annexes);
      }

      // Mapeamos a la interfaz Advance para que el modal lo lea
      const deliveryMock: Advance = {
        id: delivery.id,
        title: 'Entrega Final del Trabajo de Grado',
        comments: 'Documentos oficiales cargados para el proceso de revisión y sustentación.',
        uploadDate: delivery.uploadDate,
        studentId: '',
        status: delivery.status || stateList.EN_REVISION,
        documents: finalDeliveryDocs // 👈 Archivos listos y ordenados
      };

      this.selectedAdvance.set(deliveryMock);
      this.isDetailsModalOpen.set(true);
    }
    // 🟠 NUEVA LÓGICA PARA LA PESTAÑA DE PAZ Y SALVO
    else if (this.activeTab() === 'PAZ Y SALVO') {

      // 👈 Cambio: Buscamos en el historial el registro cuyo documento coincida con el rowId
      const pyS = thesis.pazYSalvos?.find(p => p.document.id === rowId);

      // Verificamos que el registro exista
      if (!pyS) {
        this.showNotFoundError();
        return;
      }

      // Construimos un string amigable con los comentarios de las dos aprobaciones
      let formatComments = `Aprobación Académica: ${pyS.academicApproved ? '✅ Sí' : '❌ No'}`;
      if (pyS.academicComments) formatComments += `\nObs: ${pyS.academicComments}`;

      formatComments += `\n\nAprobación Financiera: ${pyS.financialApproved ? '✅ Sí' : '❌ No'}`;
      if (pyS.financialComments) formatComments += `\nObs: ${pyS.financialComments}`;

      // Patrón Adaptador: Mapeamos el PazYSalvoRegistry a la interfaz Advance
      const pazYSalvoMock: Advance = {
        id: pyS.id,
        title: 'Registro de Paz y Salvo Institucional',
        comments: formatComments,
        uploadDate: pyS.registrationDate,
        studentId: '', // El HTML usa el computed studentName()
        status: pyS.document.status || stateList.EN_REVISION,
        documents: [pyS.document]
      };

      this.selectedAdvance.set(pazYSalvoMock);
      this.isDetailsModalOpen.set(true);
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');
  }

  private handleDownload(doc: Document): void {
    if (!doc.url) {
      this.notificationService.show({ title: 'Error de descarga', message: 'No existe una URL válida vinculada a este archivo.', type: NotificationType.ERROR });
      return;
    }
    this.downloadService.download(doc.url, `${doc.name}.pdf`);
  }

  private showNotFoundError(): void {
    this.notificationService.show({ title: 'Registro no encontrado', message: 'No fue posible cargar los detalles de este registro.', type: NotificationType.ERROR });
  }

  private showProcessingNotification() {
    this.notificationService.show({ title: 'Subiendo documento', message: 'Procesando el archivo PDF y actualizando los registros...', type: NotificationType.INFO });
  }

  private showSuccessNotification() {
    this.notificationService.show({ title: '¡Carga exitosa!', message: 'El documento se cargó correctamente y el flujo de estados ha sido actualizado.', type: NotificationType.CONFIRMATION });
  }

  private showErrorNotification() {
    this.notificationService.show({ title: 'Error de carga', message: 'Hubo un problema al subir el archivo. Inténtelo de nuevo.', type: NotificationType.ERROR });
  }

  private showRestrictedActionNotification() {
    this.notificationService.show({ title: 'Acción no permitida', message: 'Su usuario no posee los privilegios necesarios para ejecutar esta evaluación.', type: NotificationType.ERROR });
  }
}
