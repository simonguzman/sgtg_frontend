import { inject, Injectable } from '@angular/core';
import { UserService } from '../../users/services/user.service';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../interfaces/sustentation-registry.interface';
import { User } from '../../users/interfaces/user.interface';

/**
 * Centraliza el formateo de nombres de participantes (director, codirector,
 * asesor, estudiantes, jurados) que se repetía de forma idéntica en 8
 * servicios de formulario distintos del módulo de Trabajo de Grado.
 * Cualquier ajuste futuro a estas reglas se hace en un solo lugar.
 */
@Injectable({ providedIn: 'root' })
export class ThesisParticipantsFormatterService {
  private readonly userService = inject(UserService);

  getStudentNames(thesisWork: ThesisWork | null | undefined): string {
    return this.userService.getAuthorsNames(
      thesisWork?.preliminaryDraftData?.proposalData?.authors
    );
  }

  getDirectorName(thesisWork: ThesisWork | null | undefined): string {
    const id = thesisWork?.preliminaryDraftData?.proposalData?.director?.id;
    return id ? this.userService.getUserFullName(id) : 'No asignado';
  }

  getCodirectorName(thesisWork: ThesisWork | null | undefined): string {
    return this.getMemberName(thesisWork?.preliminaryDraftData?.proposalData?.codirector?.id);
  }

  getAdvisorName(thesisWork: ThesisWork | null | undefined): string {
    return this.getMemberName(thesisWork?.preliminaryDraftData?.proposalData?.advisor?.id);
  }

  getMemberName(id: string | undefined): string {
    return id ? this.userService.getUserFullName(id) : '';
  }

  getAssignedJurors(sustentation: SustentationRegistry | null | undefined): string {
    const jurors = sustentation?.assignedJurors ?? [];
    if (jurors.length === 0) return 'No asignados';
    return jurors.map((j: User) => this.userService.getUserFullName(j.id)).join(' y ');
  }
}
