import { inject, Injectable } from '@angular/core';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { UserService } from '../../../../users/services/user.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import {
  SustentationDetailsView,
  SustentationDocumentView,
  JurorVerdictView,
  SpecialRequestView
} from '../models/sustentation-details.model';

@Injectable({ providedIn: 'root' })
export class SustentationDetailsMapperService {
  // Se conserva: mapVerdicts necesita getUserFullName(jurorId) directo —
  // jurados de veredictos individuales, caso que el formateador compartido
  // no cubre (su getAssignedJurors trabaja sobre la sustentación completa).
  private readonly userService      = inject(UserService);
  private readonly participants     = inject(ThesisParticipantsFormatterService);
  private readonly documentResolver = inject(ThesisFinalDeliveryDocumentResolverService);

  public mapToView(work: ThesisWork, sustentationId: string): SustentationDetailsView | null {
    const sustentation = work.sustentations?.find((s: SustentationRegistry) => s.id === sustentationId);
    if (!sustentation) return null;

    const proposal    = work.preliminaryDraftData.proposalData;
    const adminStatus = sustentation.status;
    const isPostponed = adminStatus === SustentationStatus.APLAZADA;

    return {
      title: proposal.title || 'Sin título',
      description: proposal.description || 'Sin descripción',
      modality: proposal.modality || 'No definida',
      state: work.state,
      // ← Fix: se elimina el cast `as any` (innecesario — User[] ya es
      // asignable a (string | User)[]) y el fallback `|| 'No asignados'`
      // muerto (getAuthorsNames nunca retorna vacío).
      authors: this.participants.getStudentNames(work),
      // ← Delegados al formateador compartido — este mapper YA hacía lookup
      // por ID correctamente (a diferencia de otros lugares del módulo),
      // así que aquí el cambio es puro DRY, sin corrección de comportamiento.
      director: this.participants.getDirectorName(work),
      codirector: this.participants.getCodirectorName(work) || undefined,
      advisor: this.participants.getAdvisorName(work) || undefined,
      assignedJurors: this.participants.getAssignedJurors(sustentation),
      sustentationDate: sustentation.sustentationDate || null,
      location: sustentation.location || 'No definido',
      administrativeStatus: adminStatus || 'No definido',
      isAdministrativelyPostponed: isPostponed,
      isAdministrativelyCanceled: adminStatus === SustentationStatus.CANCELADA,
      postponementReason: isPostponed ? this.getPostponementReason(work.specialRequests) : null,
      approvedSpecialRequests: this.getApprovedSpecialRequests(work.specialRequests),
      // ← Delegados al resolver compartido: elimina la tercera copia de la
      // lógica "ordenar finalDeliveries por fecha desc, tomar el más reciente".
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
    const doc = this.documentResolver.resolveLatestFinalDeliveryDocument(work, type);
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
