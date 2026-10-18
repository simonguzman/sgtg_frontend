import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ProposalStorageService } from './proposal-storage.service';
import { ProposalRulesService } from './proposal-rules.service';
import { ProposalDocumentService } from './proposal-document.service';
import { ProposalApiService } from './proposal-api.service';

import { Proposal } from '../interfaces/proposal.interface';
import { stateList } from '../../../core/enums/state.enum';
import { FileDocument } from '../../../core/interfaces/file-document.interface';

@Injectable({
  providedIn: 'root'
})
export class ProposalService {
  private readonly storage = inject(ProposalStorageService);
  private readonly rulesService = inject(ProposalRulesService);
  private readonly documentService = inject(ProposalDocumentService);
  private readonly apiService = inject(ProposalApiService); // Inyectamos el nuevo servicio

  readonly proposals = this.storage.proposals;
  readonly allProposals = this.storage.allProposals;

  // ==========================================
  // DELEGACIÓN: QUERIES & MUTATIONS (API)
  // ==========================================
  getProposalById(id: string): Observable<Proposal | undefined> {
    return this.apiService.getProposalById(id);
  }

  createProposal(proposal: Proposal): Observable<Proposal> {
    return this.apiService.createProposal(proposal);
  }

  updateProposal(id: string, changes: Partial<Proposal>): Observable<Proposal> {
    return this.apiService.updateProposal(id, changes);
  }

  annulProposal(id: string, justification: string): Observable<Proposal> {
    return this.apiService.annulProposal(id, justification);
  }

  // ==========================================
  // DELEGACIÓN: REGLAS DE NEGOCIO
  // ==========================================
  validateProposalRules(proposal: Partial<Proposal>): string | null {
    return this.rulesService.validateProposalRules(proposal);
  }

  // ==========================================
  // DELEGACIÓN: DOCUMENTOS Y EVALUACIONES
  // ==========================================
  /** Concepto del Comité de Programa con el acta firmada. */
  registerCommitteeDecision(proposalId: string, veredict: stateList, observations: string,
    signedFile: File): Observable<Proposal> {
    return this.documentService.registerCommitteeDecision(proposalId, veredict, observations, signedFile);
  }

  /** Nueva versión del formato A. */
  uploadCorrection(proposalId: string, file: File): Observable<Proposal> {
    return this.documentService.uploadCorrection(proposalId, file);
  }

  getDocumentsByProposalId(id: string): FileDocument[] {
    const proposal = this.storage.getProposalsListSnapshot().find(proposal => proposal.id === id);
    return proposal?.documents || [];
  }
}
