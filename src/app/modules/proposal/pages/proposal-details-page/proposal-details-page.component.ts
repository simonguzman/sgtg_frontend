import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Proposal } from '../../interfaces/proposal.interface';
import { ProposalDetailsFacadeService } from './services/proposal-details-facade.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

@Component({
  selector: 'app-proposal-details-page',
  imports: [ButtonComponent],
  templateUrl: './proposal-details-page.component.html',
  styleUrls: ['./proposal-details-page.component.css']
})
export class ProposalDetailsPageComponent implements OnInit {
  // route sigue siendo necesario en el componente porque las dos
  // navegaciones relativas (evaluations_performed / loaded_proposals)
  // requieren { relativeTo: route }, que es específico del árbol de rutas
  // de este componente y no puede resolverse desde la fachada.
  protected readonly route  = inject(ActivatedRoute);
  private   readonly router = inject(Router);
  protected readonly facade = inject(ProposalDetailsFacadeService);

  readonly proposal = signal<Proposal | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')
             ?? this.route.parent?.snapshot.paramMap.get('id');

    if (!id) {
      this.facade.handleMissingId(() => this.facade.goBack());
      return;
    }

    this.facade.load(
      id,
      (data) => this.proposal.set(data),
      ()     => this.facade.goBack(),
      ()     => this.facade.goBack()
    );
  }

  // Métodos de navegación relativa: dependen de ActivatedRoute,
  // por eso viven en el componente y no en la fachada.
  navigateToEvaluations(): void {
    this.router.navigate(['evaluations_performed'], { relativeTo: this.route });
  }

  navigateToLoadedProposals(): void {
    this.router.navigate(['loaded_proposals'], { relativeTo: this.route });
  }
}
