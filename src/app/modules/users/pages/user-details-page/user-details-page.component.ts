import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { UserDetailsFacadeService } from './services/user-details-facade.service';
import { DocumentTypePipe } from '../../pipes/document-type.pipe';
import { CONTRACT_TYPE_LABELS } from '../../enum/contract-type.enum';
import { UserState } from '../../enum/user-state.enum';

/**
 * Detalle de un usuario (administrador) y "Mi perfil": datos personales,
 * institucionales y el perfil académico registrado (vinculación y
 * departamento del docente, programa del estudiante), si lo tiene.
 */
@Component({
  selector: 'app-user-details-page',
  standalone: true,
  imports: [ButtonComponent, DocumentTypePipe],
  providers: [UserDetailsFacadeService],
  templateUrl: './user-details-page.component.html',
  styleUrls: ['./user-details-page.component.css']
})
export class UserDetailsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  public readonly facade = inject(UserDetailsFacadeService);

  protected readonly contractTypeLabel = computed(() => {
    const contractType = this.facade.user()?.contractType;
    return contractType ? CONTRACT_TYPE_LABELS[contractType] : '';
  });

  /** Código tal como lo guarda el backend (ej. `ADMIN`); si no llegó, el numérico. */
  protected readonly code = computed(() => {
    const user = this.facade.user();
    return user?.code ?? String(user?.codeNumber ?? '');
  });

  protected readonly isActive = computed(() => this.facade.user()?.state === UserState.active);

  /** El usuario tiene perfil académico registrado (docente o estudiante). */
  protected readonly hasAcademicProfile = computed(() => {
    const user = this.facade.user();
    return !!(user?.contractType || user?.department || user?.program);
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.facade.loadUser(id);
  }
}
