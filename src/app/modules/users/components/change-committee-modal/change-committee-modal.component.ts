import { Component, computed, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { UsersFacadeService } from '../../pages/users-page/services/users-facade.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { User } from '../../interfaces/user.interface';

/**
 * Cambio del Comité de programa de un departamento (uno por departamento): el
 * docente elegido lo recibe y quien lo tenía lo pierde. El Comité lo usa para
 * cederlo; el jefe, el Consejo, Decanatura y el administrador, para nombrarlo.
 * Solo se ofrecen docentes del mismo departamento; el backend lo vuelve a validar.
 */
@Component({
  selector: 'app-change-committee-modal',
  imports: [DialogModule, FormsModule, ButtonComponent, SearchableSelectComponent],
  templateUrl: './change-committee-modal.component.html'
})
export class ChangeCommitteeModalComponent implements OnChanges {
  private readonly facade = inject(UsersFacadeService);
  private readonly authService = inject(AuthService);

  /**
   * Si la ventana está abierta. El p-dialog se crea la primera vez que se abre ({@link yaSeAbrio}): las
   * páginas tienen varias ventanas que casi nunca se abren y crearlas todas al cargar hacía más lenta la página.
   */
  @Input() set isOpen(valor: boolean) {
    this._isOpen = valor;
    if (valor) this.yaSeAbrio = true;
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  private _isOpen = false;
  /** Se abrió al menos una vez: desde entonces el p-dialog existe (y se conserva para la animación de cierre). */
  yaSeAbrio = false;
  @Output() onClose = new EventEmitter<void>();

  readonly departments = this.facade.committeeDepartments;
  readonly departmentId = signal<number | null>(null);
  readonly candidateId = signal<string | null>(null);
  readonly saving = signal(false);

  /** El usuario de la sesión es el Comité: cede el suyo */
  readonly cedes = computed(() => this.authService.hasAnyRole([UserRoleType.COMITE]));
  readonly current = computed(() => this.facade.committeeOf(this.departmentId()));
  readonly candidates = computed(() => this.facade.committeeCandidates(this.departmentId()));
  /** Docentes del departamento para el buscador: se escribe el nombre en lugar de recorrer la lista */
  readonly candidateOptions = computed<SelectOption[]>(() =>
    this.candidates().map(candidate => ({ id: candidate.id, label: this.fullName(candidate) })));
  readonly selfIsCurrent = computed(() => !!this.current() && this.current()?.id === this.authService.currentUser()?.id);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen']?.currentValue) return;
    // El Comité y el jefe solo tienen su departamento: queda elegido
    const departamentos = this.departments();
    this.departmentId.set(departamentos.length === 1 ? departamentos[0].id : null);
    this.candidateId.set(null);
    this.saving.set(false);
  }

  fullName(user: User): string {
    return [user.firstName, user.secondName, user.lastName, user.secondLastName].filter(Boolean).join(' ');
  }

  selectDepartment(value: string): void {
    this.departmentId.set(value ? Number(value) : null);
    this.candidateId.set(null);
  }

  selectCandidate(value: string): void {
    this.candidateId.set(value || null);
  }

  close(): void {
    this.onClose.emit();
  }

  confirm(): void {
    const candidato = this.candidateId();
    if (!candidato || this.saving()) return;
    this.saving.set(true);
    this.facade.changeCommittee(candidato, () => this.close(), () => this.saving.set(false));
  }
}
