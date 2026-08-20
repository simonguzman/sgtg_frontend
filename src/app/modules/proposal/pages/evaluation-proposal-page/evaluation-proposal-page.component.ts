import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Proposal } from '../../interfaces/proposal.interface';
import { EvaluationProposalFacadeService, SaveProposalEvaluationEvent } from './services/evaluation-proposal-facade.service';
import { EvaluationProposalFormComponent } from '../../components/evaluation-proposal-form/evaluation-proposal-form.component';

@Component({
  selector: 'app-evaluation-proposal-page',
  standalone: true,
  imports: [EvaluationProposalFormComponent],
  templateUrl: './evaluation-proposal-page.component.html'
})
export class EvaluationProposalPageComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly location = inject(Location);
  protected readonly facade = inject(EvaluationProposalFacadeService);

  readonly proposal = signal<Proposal | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')
             ?? this.route.parent?.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }

    this.facade.load(
      id,
      (data) => this.proposal.set(data),
      () => this.goBack()
    );
  }

  // ← void agregado: downloadOriginalDocument() ahora es async (fix del
  // turno anterior). Mismo patrón de "void explícito" ya usado en el
  // resto de páginas — el facade maneja éxito/error con sus propias
  // notificaciones, aquí no hace falta esperar el resultado.
  downloadOriginalDocument(): void {
    const proposal = this.proposal();
    if (proposal) void this.facade.downloadOriginalDocument(proposal);
  }

  // ← FIX CENTRAL: la firma cambia de { result, comments, signedFileName }
  // a SaveProposalEvaluationEvent ({ result, comments, file: File }).
  // Sin este cambio el proyecto simplemente no compila — el facade ya
  // exige un File real desde el turno anterior.
  handleSaveEvaluation(event: SaveProposalEvaluationEvent): void {
    const proposal = this.proposal();
    if (!proposal) return;
    void this.facade.saveEvaluation(event, proposal, this.route, () => {});
  }

  goBack(): void {
    this.location.back();
  }
}
