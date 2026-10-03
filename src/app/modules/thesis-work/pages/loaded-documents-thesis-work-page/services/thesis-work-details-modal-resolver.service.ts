import { Injectable } from '@angular/core';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

@Injectable({ providedIn: 'root' })
export class ThesisWorkDetailsModalResolverService {

  public resolve(rowId: string, activeTab: string, thesis: ThesisWork): Advance | null {
    switch (activeTab) {
      case 'AVANCES': return this.resolveAdvance(rowId, thesis);
      case 'ENTREGA FINAL': return this.resolveDelivery(rowId, thesis);
      case 'PAZ Y SALVO': return this.resolvePazYSalvo(rowId, thesis);
      case 'CORRESPONDENCIA': return this.resolveCorrespondence(rowId, thesis);
      case 'SOLICITUDES': return this.resolveSpecialRequest(rowId, thesis);
      default: return null;
    }
  }

  private resolveAdvance(rowId: string, thesis: ThesisWork): Advance | null {
    return thesis.advances?.find(advance => advance.id === rowId) ?? null;
  }

  private resolveDelivery(rowId: string, thesis: ThesisWork): Advance | null {
    const delivery = thesis.finalDeliveries?.find(d => d.id === rowId);
    if (!delivery) return null;

    const docs: FileDocument[] = [delivery.monograph, delivery.formatE];
    if (delivery.annexes) docs.push(delivery.annexes);

    return {
      id: delivery.id,
      title: 'Entrega Final del Trabajo de Grado',
      comments: 'Documentos oficiales cargados para el proceso de revisión y sustentación.',
      uploadDate: delivery.uploadDate,
      studentId: '',
      status: delivery.status ?? stateList.EN_REVISION,
      documents: docs
    };
  }

  private resolvePazYSalvo(rowId: string, thesis: ThesisWork): Advance | null {
    const pyS = thesis.pazYSalvos?.find(p => p.document.id === rowId);
    if (!pyS) return null;

    let comments = `Aprobación Académica: ${pyS.academicApproved ? '✅ Sí' : '❌ No'}`;
    if (pyS.academicComments)  comments += `\nObs: ${pyS.academicComments}`;
    comments += `\n\nAprobación Financiera: ${pyS.financialApproved ? '✅ Sí' : '❌ No'}`;
    if (pyS.financialComments) comments += `\nObs: ${pyS.financialComments}`;

    return {
      id: pyS.id,
      title: 'Registro de Paz y Salvo Institucional',
      comments,
      uploadDate: pyS.registrationDate,
      studentId: '',
      status: pyS.document.status ?? stateList.EN_REVISION,
      documents: [pyS.document]
    };
  }

  private resolveCorrespondence(rowId: string, thesis: ThesisWork): Advance | null {
    const document = thesis.documents?.find(document => document.id === rowId);
    if (!document) return null;

    return {
      id: document.id,
      title: 'Resolución / Correspondencia Final Oficial',
      comments: 'Documento oficial cargado por el Jurado Evaluador (Formato_H) que ratifica y da por terminado formalmente el proceso del trabajo de grado.',
      uploadDate: document.uploadDate,
      studentId: '',
      status: document.status ?? stateList.APROBADO,
      documents: [document]
    };
  }

  private resolveSpecialRequest(rowId: string, thesis: ThesisWork): Advance | null {
    const request = thesis.specialRequests?.find((r: SpecialRequest) => r.id === rowId);
    if (!request) return null;

    const parts: string[] = [request.description];
    if (request.resolutionDetails) parts.push(`Resolución del comité: ${request.resolutionDetails}`);
    if (request.grantedDeadline) {
      parts.push(`Fecha concedida: ${formatThesisDate(new Date(request.grantedDeadline))}`);
    }

    return {
      id: request.id,
      title: request.requestType,
      comments: parts.join('\n\n'),
      uploadDate: request.requestDate,
      studentId: request.directorId,
      status: request.status,
      documents: []
    };
  }
}
