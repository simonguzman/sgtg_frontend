import { Component, Input } from '@angular/core';
import { PASSWORD_REQUIREMENTS } from '../../../core/utils/password-policy';

/** Lista de requisitos de una contraseña nueva, marcando los que ya cumple lo escrito. */
@Component({
  selector: 'app-password-requirements',
  standalone: true,
  templateUrl: './password-requirements.component.html'
})
export class PasswordRequirementsComponent {
  @Input() password: string | null | undefined = '';

  readonly requisitos = PASSWORD_REQUIREMENTS;

  cumple(indice: number): boolean {
    return this.requisitos[indice].cumple(this.password ?? '');
  }
}
