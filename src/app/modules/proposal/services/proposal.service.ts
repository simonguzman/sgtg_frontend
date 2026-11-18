import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ProposalStorageService } from './proposal-storage.service';
import { ProposalRulesService } from './proposal-rules.service';
import { ProposalDocumentService } from './proposal-document.service';
import { ProposalApiService } from './proposal-api.service';

import { Proposal } from '../interfaces/proposal.interface';
import { stateList } from '../../../core/enums/state.enum';

/**
 * Fachada del módulo de propuestas: reúne el almacén, las llamadas al backend, las reglas y los documentos.
 */
@Injectable({
  providedIn: 'root'
})
export class ProposalService {
  private readonly storage = inject(ProposalStorageService);
  private readonly rulesService = inject(ProposalRulesService);
  private readonly documentService = inject(ProposalDocumentService);
  private readonly apiService = inject(ProposalApiService);

  /** Propuestas activas visibles para el usuario. */
  readonly proposals = this.storage.proposals;
  /** Todas las propuestas del almacén, también las archivadas. */
  readonly allProposals = this.storage.allProposals;

  /** Propuesta por id, de memoria o del backend. */
  getProposalById(id: string): Observable<Proposal | undefined> {
    return this.apiService.getProposalById(id);
  }

  /** Registra una propuesta. */
  createProposal(proposal: Proposal): Observable<Proposal> {
    return this.apiService.createProposal(proposal);
  }

  /** Corrige una propuesta. */
  updateProposal(id: string, changes: Partial<Proposal>): Observable<Proposal> {
    return this.apiService.updateProposal(id, changes);
  }

  /** Anula el trabajo de la propuesta. */
  annulProposal(id: string, justification: string): Observable<Proposal> {
    return this.apiService.annulProposal(id, justification);
  }

  /** @returns el primer error de las reglas de la propuesta, o null si las cumple */
  validateProposalRules(proposal: Partial<Proposal>): string | null {
    return this.rulesService.validateProposalRules(proposal);
  }

  /** Concepto del Comité de Programa con el acta firmada. */
  registerCommitteeDecision(proposalId: string, veredict: stateList, observations: string,
    signedFile: File): Observable<Proposal> {
    return this.documentService.registerCommitteeDecision(proposalId, veredict, observations, signedFile);
  }

  /** Nueva versión del formato A (en práctica profesional, con la nueva carta de aceptación). */
  uploadCorrection(proposalId: string, file: File, acceptanceLetter: File | null = null): Observable<Proposal> {
    return this.documentService.uploadCorrection(proposalId, file, acceptanceLetter);
  }
}
