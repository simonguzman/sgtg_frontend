import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

@Injectable()
export class RegisterSustentationFormService {
  private readonly fb                  = inject(FormBuilder);
  // UserService se conserva: getEligibleJurors necesita la lista completa
  // de usuarios (users()), algo que el formateador compartido no expone
  // — su contrato es solo formateo, no acceso a la colección cruda.
  private readonly userService         = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly documentResolver    = inject(ThesisFinalDeliveryDocumentResolverService);
  private readonly participants        = inject(ThesisParticipantsFormatterService);

  readonly form = this.fb.nonNullable.group({
    sustentationDate: ['', Validators.required],
    location:         ['', Validators.required],
    juror1:           ['', Validators.required],
    juror2:           ['', Validators.required]
  });

  getEligibleJurors(thesisWork: ThesisWork): User[] {
    const allUsers = this.userService.users();
    if (!thesisWork?.preliminaryDraftData?.proposalData) return [];

    const proposal             = thesisWork.preliminaryDraftData.proposalData;
    const preliminaryDraftData = thesisWork.preliminaryDraftData;
    const forbiddenIds         = new Set<string>();

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

  // Se conserva local (no delegado): formatea un User ya en mano —jurados
  // candidatos de una lista fresca de userService.users()— caso distinto
  // al de "buscar por ID" que resuelve el formateador compartido.
  getMemberFullName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(Boolean)
      .join(' ');
  }

  getStudentNames(thesisWork: ThesisWork): string {
    return this.participants.getStudentNames(thesisWork);
  }

  // ← FIX de consistencia: antes el componente llamaba getMemberFullName()
  // pasando el objeto User embebido en proposalData (director/codirector/
  // advisor), lo que podía mostrar datos desactualizados si el usuario
  // cambió su nombre después de que la propuesta fue creada (los updates
  // de usuario son inmutables, así que ese objeto embebido no se refresca
  // solo). Ahora se resuelve por ID contra la lista viva de usuarios,
  // igual que en los otros 7 formularios del módulo.
  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }

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
