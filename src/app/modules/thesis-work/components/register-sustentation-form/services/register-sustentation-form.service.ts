import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';

@Injectable()
export class RegisterSustentationFormService {
  private readonly fb                  = inject(FormBuilder);
  private readonly userService         = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly documentResolver    = inject(ThesisFinalDeliveryDocumentResolverService);

  // ← Fix: nonNullable.group para que getRawValue() coincida exactamente con
  // SustentationFormPayload sin necesitar cast `as SustentationFormPayload`.
  readonly form = this.fb.nonNullable.group({
    sustentationDate: ['', Validators.required],
    location:         ['', Validators.required],
    juror1:           ['', Validators.required],
    juror2:           ['', Validators.required]
  });

  /**
   * Regla de negocio: un jurado no puede ser director, codirector, asesor,
   * autor, evaluador del anteproyecto, ni tener rol de Jefe de Departamento o Consejo.
   * Se centraliza aquí porque es lógica de dominio, no de presentación.
   */
  getEligibleJurors(thesisWork: ThesisWork): User[] {
    const allUsers = this.userService.users();
    if (!thesisWork?.preliminaryDraftData?.proposalData) return [];

    const proposal            = thesisWork.preliminaryDraftData.proposalData;
    const preliminaryDraftData = thesisWork.preliminaryDraftData;
    const forbiddenIds        = new Set<string>();

    if (proposal.director?.id)   forbiddenIds.add(proposal.director.id);
    if (proposal.codirector?.id) forbiddenIds.add(proposal.codirector.id);
    if (proposal.advisor?.id)    forbiddenIds.add(proposal.advisor.id);

    proposal.authors?.forEach(author => {
      const id = typeof author === 'string' ? author : (author as User)?.id;
      if (id) forbiddenIds.add(id);
    });

    preliminaryDraftData.evaluations?.forEach(evaluation => {
      if (evaluation.evaluatorId) forbiddenIds.add(evaluation.evaluatorId);
    });

    return allUsers.filter(user => {
      const isDocente        = user.roles?.includes(UserRoleType.DOCENTE);
      const isNotParticipant = !forbiddenIds.has(user.id);
      const hasConflictRole  = user.roles?.some(role =>
        role === UserRoleType.JEFE_DEP || role === UserRoleType.CONSEJO
      );
      return isDocente && isNotParticipant && !hasConflictRole;
    });
  }

  getMemberFullName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(Boolean)
      .join(' ');
  }

  // ← Fix: eliminado el cast `ids as string[]`. UserService.getAuthorsNames ya
  // acepta (string | User)[], así que pasar `authors` directamente es correcto
  // y evita perder información si el arreglo contiene objetos User.
  getAuthorsNames(authors: (string | User)[] | undefined): string {
    return this.userService.getAuthorsNames(authors) || 'No asignado';
  }

  getExistingDocument(thesisWork: ThesisWork, type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();

    if (targetType === 'FORMATO_G') {
      return this.documentResolver.resolveLatestPazYSalvoDocument(thesisWork);
    }

    const normalizedType = targetType === 'FORMATO' ? 'FORMATO_E' : targetType;
    if (normalizedType === 'MONOGRAFIA' || normalizedType === 'FORMATO_E' || normalizedType === 'ANEXOS') {
      return this.documentResolver.resolveLatestFinalDeliveryDocument(thesisWork, normalizedType);
    }
    return null;
  }

  notifyIncompleteForm(): void {
    this.notificationService.show({
      title:   'Formulario incompleto',
      message: 'Debe diligenciar todos los campos y adjuntar el Formato_E.',
      type:    NotificationType.ERROR
    });
  }
}
