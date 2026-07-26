import { inject, Injectable } from '@angular/core';

// ─── Importaciones de tus interfaces (Ajusta las rutas según tu proyecto) ────
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';
import { User } from '../../../../users/interfaces/user.interface';

// ─── Enums y Modelos de Vista ────────────────────────────────────────────────
import { stateList } from '../../../../../core/enums/state.enum';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { UserService } from '../../../../users/services/user.service';
import {
  SustentationDetailsView,
  SustentationDocumentView,
  JurorVerdictView,
  SpecialRequestView
} from '../models/sustentation-details.model';

@Injectable({ providedIn: 'root' })
export class SustentationDetailsMapperService {
  private readonly userService = inject(UserService);

  public mapToView(work: ThesisWork, sustentationId: string): SustentationDetailsView | null {
    // Buscamos la sustentación usando el tipo estricto SustentationRegistry
    const sustentation = work.sustentations?.find((s: SustentationRegistry) => s.id === sustentationId);
    if (!sustentation) return null;

    const proposal = work.preliminaryDraftData.proposalData;
    const adminStatus = sustentation.status;
    const isPostponed = adminStatus === SustentationStatus.APLAZADA;

    const authorsList: User[] = proposal.authors ?? [];

    return {
      title: proposal.title || 'Sin título',
      description: proposal.description || 'Sin descripción',
      modality: proposal.modality || 'No definida',
      state: work.state,
      authors: this.userService.getAuthorsNames(authorsList as any) || 'No asignados', // Nota: Si tu UserService sigue pidiendo 'any', déjalo o actualiza el service para que reciba User[]

      director: proposal.director?.id ? this.userService.getUserFullName(proposal.director.id) : 'No asignado',
      codirector: proposal.codirector?.id ? this.userService.getUserFullName(proposal.codirector.id) : undefined,
      advisor: proposal.advisor?.id ? this.userService.getUserFullName(proposal.advisor.id) : undefined,
      assignedJurors: this.mapAssignedJurors(sustentation.assignedJurors),

      sustentationDate: sustentation.sustentationDate || null,
      location: sustentation.location || 'No definido',

      administrativeStatus: adminStatus || 'No definido',
      isAdministrativelyPostponed: isPostponed,
      isAdministrativelyCanceled: adminStatus === SustentationStatus.CANCELADA,
      postponementReason: isPostponed ? this.getPostponementReason(work.specialRequests) : null,
      approvedSpecialRequests: this.getApprovedSpecialRequests(work.specialRequests),

      monograph: this.extractDocument(work, 'MONOGRAFIA'),
      annexes: this.extractDocument(work, 'ANEXOS'),
      formatEDocument: sustentation.formatEDocument ? {
        name: sustentation.formatEDocument.name || 'Formato_E.pdf',
        url: sustentation.formatEDocument.url,
        description: 'Formato E • Documento de programación avalado por el consejo'
      } : null,

      verdicts: this.mapVerdicts(sustentation.verdicts),
      showCorrectedDocumentsButton: this.shouldShowCorrectedDocs(work, sustentation)
    };
  }

  private mapAssignedJurors(jurors: User[] = []): string {
    if (!jurors.length) return 'No asignados';
    return jurors.map(j => this.userService.getUserFullName(j.id)).join(' y ');
  }

  private getPostponementReason(requests: SpecialRequest[] = []): SpecialRequestView | null {
    const reprogramming = requests
      .filter(req => req.requestType === SpecialRequestType.NUEVA_SUSTENTACION && req.status === stateList.APROBADO)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    if (!reprogramming.length) return null;
    return {
      type: reprogramming[0].requestType,
      description: reprogramming[0].description,
      resolutionDetails: reprogramming[0].resolutionDetails
    };
  }

  private getApprovedSpecialRequests(requests: SpecialRequest[] = []): SpecialRequestView[] {
    return requests
      .filter(req => req.status === stateList.APROBADO)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
      .map(req => ({
        type: req.requestType,
        description: req.description,
        resolutionDetails: req.resolutionDetails
      }));
  }

  private extractDocument(work: ThesisWork, type: 'MONOGRAFIA' | 'ANEXOS'): SustentationDocumentView | null {
    if (!work.finalDeliveries?.length) return null;
    const latestDelivery = [...work.finalDeliveries].sort((a, b) => {
        // Aseguramos que uploadDate se maneje correctamente, sin importar si viene como string o Date
        const dateA = new Date(a.uploadDate).getTime();
        const dateB = new Date(b.uploadDate).getTime();
        return dateB - dateA;
    })[0];

    const doc = type === 'MONOGRAFIA' ? latestDelivery?.monograph : latestDelivery?.annexes;
    if (!doc) return null;

    return {
      name: doc.name || (type === 'MONOGRAFIA' ? 'Monografía.pdf' : 'Anexos.zip'),
      url: doc.url,
      description: type === 'MONOGRAFIA' ? 'Monografía • Cargado en entrega final' : 'Anexos • Cargado en entrega final'
    };
  }

  private mapVerdicts(verdicts: JurorVerdict[] = []): JurorVerdictView[] {
    return verdicts.map(v => ({
      jurorName: this.userService.getUserFullName(v.jurorId),
      evaluationDate: v.evaluationDate,
      verdict: v.veredict,
      observations: v.observations || 'Sin observaciones adicionales.',
      statusColorClass: this.getVerdictColor(v.veredict),
      attachedDocument: v.attachedDocument ? {
        name: v.attachedDocument.name || 'Acta_Sustentacion.pdf',
        url: v.attachedDocument.url,
        description: 'Acta firmada y cargada por este calificador'
      } : null
    }));
  }

  // Ahora utilizamos tu stateList directamente para evaluar el veredicto
  private getVerdictColor(verdict: string): string {
    switch (verdict) {
      case stateList.APROBADO:
        return 'border-l-green-500';
      case stateList.APROBADO_CON_OBSERVACIONES:
        return 'border-l-amber-500';
      case stateList.APLAZADO:
        return 'border-l-orange-500';
      case stateList.NO_APROBADO:
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  }

  private shouldShowCorrectedDocs(work: ThesisWork, sustentation: SustentationRegistry): boolean {
    const hadObservaciones = sustentation.verdicts?.some((v: JurorVerdict) => v.veredict === stateList.APROBADO_CON_OBSERVACIONES);
    const hasDeliveries = (work.correctedDeliveries?.length ?? 0) > 0;
    return !!hadObservaciones || hasDeliveries;
  }
}
