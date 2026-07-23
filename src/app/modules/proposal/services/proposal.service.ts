import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ProposalStorageService } from './proposal-storage.service';
import { ProposalRulesService } from './proposal-rules.service';
import { ProposalDocumentService } from './proposal-document.service';
import { ProposalApiService } from './proposal-api.service';

import { Proposal } from '../interfaces/proposal.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
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
  getProposalByIdMock(id: string): Observable<Proposal | undefined> {
    return this.apiService.getProposalByIdMock(id);
  }

  createProposalMock(proposal: Proposal): Observable<Proposal> {
    return this.apiService.createProposalMock(proposal);
  }

  updateProposalMock(id: string, changes: Partial<Proposal>): Observable<Proposal> {
    return this.apiService.updateProposalMock(id, changes);
  }

  deleteProposalMock(id: string): Observable<boolean> {
    return this.apiService.deleteProposalMock(id);
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
  addEvaluationMock(proposalId: string, evaluation: Evaluation): Observable<Proposal> {
    return this.documentService.addEvaluationMock(proposalId, evaluation);
  }

  uploadCorrectionMock(proposalId: string, newDocument: FileDocument): Observable<Proposal> {
    return this.documentService.uploadCorrectionMock(proposalId, newDocument);
  }

  getDocumentsByProposalId(id: string): FileDocument[] {
    const proposal = this.storage.getProposalsListSnapshot().find(proposal => proposal.id === id);
    return proposal?.documents || [];
  }
}
