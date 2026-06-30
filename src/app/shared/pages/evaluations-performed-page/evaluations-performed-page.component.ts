import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

// Interfaces & Models
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { NotificationType } from '../../components/notifications/models/notification.model';
import { Document, DocumentType } from '../../../core/interfaces/Document.interface';
import { Column, TableComponent } from '../../components/table-component/table-component.component';
import { User } from '../../../modules/users/interfaces/user.interface';
import { ThesisWork } from '../../../modules/thesis-work/interfaces/thesis-work.interface';

// Services
import { ProposalService } from '../../../modules/proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../modules/preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../modules/thesis-work/services/thesis-work.service';
import { FileDownloadService } from '../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../components/notifications/services/notification.service';
import { UserService } from '../../../modules/users/services/user.service';

// Components
import { EvaluationModalComponent } from '../../components/modals/evaluation-modal/evaluation-modal.component';
import { stateList } from '../../../core/enums/state.enum';

const EVALUATIONS_COLUMNS: Column[] = [
  { field: 'evaluatorName',      header: 'Nombre',               type: 'text',   width: '20%' },
  { field: 'evaluatorRole',      header: 'Rol',                  type: 'text',   width: '20%' },
  { field: 'documentTargetName', header: 'Documento evaluado',   type: 'text',   width: '25%' },
  { field: 'veredict',           header: 'Resultado',            type: 'state',  width: '20%' },
  {
    field: 'acciones',
    header: 'Detalles',
    type: 'actions',
    width: '15%',
    actions: [
      { action: 'view_details', label: 'Ver detalles', variant: 'primary', disabled: false }
    ]
  }
];

@Component({
  selector: 'app-evaluations-performed-page',
  standalone: true,
  imports: [TableComponent, EvaluationModalComponent],
  templateUrl: './evaluations-performed-page.component.html',
  styleUrls: ['./evaluations-performed-page.component.css']
})
export class EvaluationsPerformedPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly proposalService = inject(ProposalService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);

  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  private readonly params = toSignal(this.route.paramMap);
  private readonly parentParams = toSignal(this.route.parent?.paramMap || this.route.paramMap);

  private readonly contextId = computed(() =>
    this.params()?.get('id') || this.parentParams()?.get('id')
  );

  protected readonly columns = EVALUATIONS_COLUMNS;

  // 🚀 Computed principal más limpio y delegando responsabilidades
  protected evaluationsWithPermissions = computed(() => {
    const id = this.contextId();
    if (!id) return [];

    const currentUrl = this.router.url;
    const sessionUser = this.userService.currentUser();

    let mappedEvaluations: any[] = [];

    if (currentUrl.includes('proposal')) {
      mappedEvaluations = this.processProposalEvaluations(id);
    } else if (currentUrl.includes('preliminary-draft')) {
      mappedEvaluations = this.processDraftEvaluations(id);
    } else if (currentUrl.includes('thesis')) {
      mappedEvaluations = this.processThesisEvaluations(id, sessionUser);
    }

    // Ordenamiento global descendente
    return mappedEvaluations.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  modalState = signal<{ open: boolean; evaluation: Evaluation | any }>({
    open: false, evaluation: null
  });

  ngOnInit(): void {
    if (!this.contextId()) {
      this.handleError('No se pudo identificar el registro.');
    }
  }

  // ==========================================
  // 🧠 LÓGICA DE MAPEO AISLADA
  // ==========================================

  private processProposalEvaluations(id: string): any[] {
    const proposal = this.proposalService.allProposals().find(p => p.id === id);
    if (!proposal) return [];

    return this.formatEvaluationsForTable(
      proposal.evaluations || [],
      proposal.documents || [],
      proposal.title
    );
  }

  private processDraftEvaluations(id: string): any[] {
    const draft = this.preliminaryDraftService.allPreliminaryDrafts().find(d => d.preliminaryDraftId === id);
    if (!draft) return [];

    return this.formatEvaluationsForTable(
      draft.evaluations || [],
      draft.documents || [],
      draft.proposalData.title
    );
  }

  private processThesisEvaluations(id: string, sessionUser: User | null): any[] {
    const thesis = this.thesisWorkService.allThesisWorks().find((t: ThesisWork) => t.thesisWorkId === id);
    if (!thesis) return [];

    const defaultTitle = thesis.preliminaryDraftData?.proposalData?.title || 'Trabajo de Grado';
    let rawEvaluations: any[] = [...(thesis.evaluations || [])];

    // 1. Integración limpia de Paz y Salvo
    if (thesis.pazYSalvos?.length) {
      thesis.pazYSalvos.forEach((pys) => {
        const isFullyApproved = pys.academicApproved && pys.financialApproved;
        const adminName = sessionUser?.roles.includes('Administrador' as any)
          ? `${sessionUser.firstName} ${sessionUser.lastName}`.trim()
          : 'Revisión Institucional';

        rawEvaluations.push({
          id: pys.id,
          documentId: pys.document?.id,
          date: pys.registrationDate,
          evaluatorName: adminName,
          evaluatorRole: 'Administración',
          veredict: isFullyApproved ? stateList.APROBADO : stateList.NO_APROBADO,
          observations: `Académico: ${pys.academicComments || 'Aprobado'} \nFinanciero: ${pys.financialComments || 'Aprobado'}`,
          // 👈 Inyectamos el documento directamente para evitar búsquedas fallidas
          signedDocuments: pys.document ? [pys.document] : []
        });
      });
    }

    // 2. Integración de Sustentaciones
    if (thesis.sustentations?.length) {
      thesis.sustentations.forEach((sust) => {
        sust.verdicts?.forEach((verdict) => {
          const jurorName = sessionUser?.roles.includes('Jurado' as any)
            ? `${sessionUser.firstName} ${sessionUser.lastName}`.trim()
            : 'Jurado';

          rawEvaluations.push({
            id: verdict.jurorId || crypto.randomUUID(),
            documentId: 'sustentacion-final',
            date: sust.sustentationDate || new Date(),
            evaluatorName: jurorName,
            evaluatorRole: 'Jurado',
            veredict: verdict.veredict || stateList.EN_REVISION,
            observations: verdict.observations || 'Sin observaciones.',
            documentTargetName: 'Acta de Sustentación'
          });
        });
      });
    }

    return this.formatEvaluationsForTable(rawEvaluations, thesis.documents || [], defaultTitle);
  }

  // Normaliza cualquier evaluación al formato que espera la tabla y el modal
  private formatEvaluationsForTable(evaluations: any[], globalDocuments: Document[], defaultTitle: string): any[] {
    return evaluations.map(evaluation => {
      const targetDocument = globalDocuments.find(doc => doc.id === evaluation.documentId);
      const isCouncil = evaluation.evaluatorName?.toLowerCase().includes('consejo') || evaluation.evaluatorRole === 'Consejo';

      const evaluatorName = evaluation.evaluatorName || (isCouncil ? 'Consejo de Facultad' : 'Evaluador');
      const evaluatorRole = evaluation.evaluatorRole || (isCouncil ? 'Consejo' : 'Evaluador');

      // --- LÓGICA ESTRICTA CON LOS NUEVOS FORMATOS ---
      let docName = evaluation.documentTargetName || targetDocument?.name;

      if (!docName) {
        if (isCouncil) {
          // El consejo evalúa la presentación/aval (Formato C)
          docName = globalDocuments.find(d => d.type === DocumentType.FORMATO_C)?.name || 'Presentación al consejo de facultad';
        } else {
          // Los jurados evalúan el anteproyecto (Formato B)
          docName = globalDocuments.find(d => d.type === DocumentType.FORMATO_B)?.name || defaultTitle;
        }
      }

      // Si la evaluación ya trae signedDocuments (como Paz y Salvo), los usamos. Si no, usamos el targetDocument global.
      const docsForModal = (evaluation.signedDocuments && evaluation.signedDocuments.length > 0)
        ? evaluation.signedDocuments
        : (targetDocument ? [{ name: targetDocument.name, url: targetDocument.url }] : []);

      return {
        ...evaluation,
        evaluatorName,
        evaluatorRole,
        observations: evaluation.observations || evaluation.comments || 'Sin observaciones registradas.',
        documentTargetName: docName,
        signedDocuments: docsForModal,
        allowedActions: ['view_details']
      };
    });
  }

  // ==========================================
  // 🕹️ ACCIONES DE LA INTERFAZ
  // ==========================================

  handleTableAction(event: { action: string; row: any }): void {
    if (event.action === 'view_details') {
      this.modalState.set({ open: true, evaluation: event.row });
    }
  }

  closeModal(): void {
    this.modalState.set({ open: false, evaluation: null });
  }

  handleDownload(fileName: string): void {
    if (!fileName) {
      this.showNotification('Error', 'No se pudo localizar el documento.', NotificationType.ERROR);
      return;
    }
    this.showNotification('Descarga', 'Iniciando descarga...', NotificationType.INFO);
    this.downloadService.download(`assets/evaluaciones/${fileName}`, fileName);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }

  private handleError(message: string): void {
    this.showNotification('Atención', message, NotificationType.ERROR);
    this.router.navigate(['/']);
  }
}
