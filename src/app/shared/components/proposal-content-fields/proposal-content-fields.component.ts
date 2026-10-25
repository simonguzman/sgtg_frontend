import { Component, computed, input } from '@angular/core';
import { ReadonlyFieldComponent } from '../readonly-field/readonly-field.component';
import { Proposal } from '../../../modules/proposal/interfaces/proposal.interface';
import { proposalContent } from '../work-details/work-details.builder';

/**
 * Lo registrado en la propuesta, de solo lectura: objetivo general, objetivos
 * específicos, descripción, línea de investigación y organización. Los campos
 * opcionales que no se registraron no se muestran. Va en los formularios
 * junto al título y los participantes.
 */
@Component({
  selector: 'app-proposal-content-fields',
  standalone: true,
  imports: [ReadonlyFieldComponent],
  templateUrl: './proposal-content-fields.component.html'
})
export class ProposalContentFieldsComponent {
  proposal = input<Proposal | null | undefined>(null);

  readonly content = computed(() => {
    const proposal = this.proposal();
    return proposal ? proposalContent(proposal) : null;
  });
}
