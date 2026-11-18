import { inject, Injectable } from '@angular/core';
import { UserService } from '../../users/services/user.service';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../interfaces/sustentation-registry.interface';

/**
 * Centraliza el formateo de nombres de participantes (director, codirector,
 * asesor, estudiantes, jurados) que se repetía de forma idéntica en varios
 * servicios del módulo de Trabajo de Grado.
 * Cualquier ajuste futuro a estas reglas se hace en un solo lugar (SRP).
 */
@Injectable({ providedIn: 'root' })
export class ThesisParticipantsFormatterService {
  private readonly userService = inject(UserService);

  /** Nombres de los estudiantes del trabajo. */
  getStudentNames(thesisWork: ThesisWork | null | undefined): string {
    return this.userService.getAuthorsNames(
      thesisWork?.preliminaryDraftData?.proposalData?.authors
    );
  }

  /** Nombre del director. */
  getDirectorName(thesisWork: ThesisWork | null | undefined): string {
    const id = thesisWork?.preliminaryDraftData?.proposalData?.director?.id;
    return id ? this.userService.getUserFullName(id) : 'No asignado';
  }

  /** Nombre del codirector, o vacío si no tiene. */
  getCodirectorName(thesisWork: ThesisWork | null | undefined): string {
    return this.getMemberName(thesisWork?.preliminaryDraftData?.proposalData?.codirector?.id);
  }

  /** Nombre del asesor, o vacío si no tiene. */
  getAdvisorName(thesisWork: ThesisWork | null | undefined): string {
    return this.getMemberName(thesisWork?.preliminaryDraftData?.proposalData?.advisor?.id);
  }

  /** Nombre completo de un participante por su id. */
  getMemberName(id: string | undefined): string {
    return id ? this.userService.getUserFullName(id) : '';
  }

  /** Jurados asignados a la sesión de sustentación actual. */
  getAssignedJurors(sustentation: SustentationRegistry | null | undefined): string {
    const jurors = sustentation?.assignedJurors ?? [];
    if (jurors.length === 0) return 'No asignados';

    return jurors.map(j => this.userService.getUserFullName(j.id)).join(' y ');
  }
}
