// src/app/modules/proposal/services/proposal-rules.service.ts
import { inject, Injectable } from '@angular/core';
import { ProposalStorageService } from './proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { Proposal } from '../interfaces/proposal.interface';
import { stateList } from '../../../core/enums/state.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { FileDocument } from '../../../core/interfaces/file-document.interface';

/** Versiones del formato A de la propuesta (sin la carta de aceptación), de la más antigua a la más reciente. */
export function versionesDePropuesta(proposal: Pick<Proposal, 'documents'> | null | undefined): FileDocument[] {
  return (proposal?.documents ?? [])
    .filter(documento => documento.type === DocumentType.PROPUESTA || documento.type === DocumentType.CORRECCION)
    .sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
}

/** Última versión radicada de la propuesta, null si no hay ninguna. */
export function versionActual(proposal: Pick<Proposal, 'documents'> | null | undefined): FileDocument | null {
  const versiones = versionesDePropuesta(proposal);
  return versiones.length > 0 ? versiones[versiones.length - 1] : null;
}

/** Versión que el Comité debe evaluar (estado En revisión); si no hay, la última radicada. */
export function versionEnRevision(proposal: Pick<Proposal, 'documents'> | null | undefined): FileDocument | null {
  const enRevision = versionesDePropuesta(proposal).filter(documento => documento.status === stateList.EN_REVISION);
  return enRevision.length > 0 ? enRevision[enRevision.length - 1] : versionActual(proposal);
}

/**
 * La propuesta solo se corrige antes de radicar el formato A o después de
 * que el Comité no la apruebe (misma regla del backend).
 */
export function propuestaEditable(proposal: Pick<Proposal, 'state' | 'documents'>): boolean {
  return proposal.state === stateList.NO_APROBADO || !proposal.documents?.length;
}

@Injectable({
  providedIn: 'root'
})
export class ProposalRulesService {
  private readonly storage = inject(ProposalStorageService);
  private readonly userService = inject(UserService);

  validateProposalRules(proposal: Partial<Proposal>): string | null {
    if (proposal.director?.id && proposal.director.id === proposal.codirector?.id) {
      return 'Un docente no puede ser Director y Codirector simultáneamente.';
    }

    if (proposal.authors && proposal.authors.length > 0) {
      for (const author of proposal.authors) {
        const activeCount = this.storage.getProposalsListSnapshot().filter(activeProposal =>
          activeProposal.authors?.some(authorProposal => authorProposal.id === author.id) && activeProposal.id !== proposal.id
        ).length;

        if (activeCount >= 2) {
          const studentName = this.userService.getUserFullName(author.id);
          return `El estudiante ${studentName} ya tiene 2 propuestas registradas (límite máximo institucional).`;
        }
      }
    }
    return null;
  }
}
