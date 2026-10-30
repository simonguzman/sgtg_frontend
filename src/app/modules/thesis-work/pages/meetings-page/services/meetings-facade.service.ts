import { computed, inject, Injectable, signal } from '@angular/core';
import { first } from 'rxjs';
import { stateList } from '../../../../../core/enums/state.enum';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';
import { Meeting, ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisWorkMeetingService } from '../../../services/thesis-work-meeting.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';

/** Etapas en las que el director agenda las reuniones (como los informes mensuales). */
const ETAPAS_CON_REUNIONES = ['EN_CURSO', 'PRORROGA'];

export interface MeetingTableRow {
  id: string;
  meeting: string;
  suggestedDate: string;
  scheduled: string;
  place: string;
  report: string;
  status: stateList;
  allowedActions: string[];
  original: Meeting;
}

/** Fecha y hora de una reunión, ej. "12 - 05 - 2027, 10:00 a. m." */
export function formatMeetingDateTime(fecha: Date): string {
  const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${formatThesisDate(fecha)}, ${hora}`;
}

/**
 * Reuniones de seguimiento del trabajo (una por cada mes del plazo). Las ven
 * todos los participantes; el director las agenda mientras el trabajo está en
 * curso o en prórroga y registra que se realizaron. La tabla se actualiza con
 * el almacén de trabajos de grado.
 */
@Injectable()
export class MeetingsFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly meetingService = inject(ThesisWorkMeetingService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly thesisWorkId = signal<string | null>(null);
  /** Mientras se guarda, no se envía otra operación */
  readonly isSubmitting = signal(false);

  readonly thesisWork = computed<ThesisWork | undefined>(() =>
    this.thesisWorkService.allThesisWorks().find(thesis => thesis.thesisWorkId === this.thesisWorkId())
  );

  readonly meetings = computed<Meeting[]>(() => this.thesisWork()?.meetings ?? []);

  readonly isDirector = computed(() => {
    const userId = this.authService.currentUser()?.id;
    return !!userId && this.thesisWork()?.preliminaryDraftData?.proposalData?.director?.id === userId;
  });

  /** El director agenda en curso o en prórroga, con el trabajo activo */
  readonly canSchedule = computed(() => this.isDirector() && !this.thesisWork()?.isArchived
    && ETAPAS_CON_REUNIONES.includes(this.thesisWork()?.stage ?? ''));

  readonly summary = computed(() => {
    const meetings = this.meetings();
    return {
      total: meetings.length,
      held: meetings.filter(meeting => meeting.held).length,
      withReport: meetings.filter(meeting => meeting.hasReport).length
    };
  });

  readonly rows = computed<MeetingTableRow[]>(() => this.meetings().map(meeting => this.toRow(meeting)));

  private toRow(meeting: Meeting): MeetingTableRow {
    const allowedActions = ['view-details'];
    const pendiente = !meeting.held && meeting.status !== stateList.EN_SUSPENSION;
    if (this.canSchedule() && pendiente) allowedActions.push('schedule');
    // Se registra desde el día de la reunión (lo valida el backend con su fecha)
    if (this.isDirector() && !this.thesisWork()?.isArchived && meeting.scheduledAt && !meeting.held) {
      allowedActions.push('register-held');
    }
    return {
      id: String(meeting.number),
      meeting: `Reunión ${meeting.number}`,
      suggestedDate: meeting.suggestedDate ? formatThesisDate(meeting.suggestedDate) : 'Al reanudar el trabajo',
      scheduled: meeting.scheduledAt ? formatMeetingDateTime(meeting.scheduledAt) : 'Sin agendar',
      place: meeting.place ?? '—',
      report: meeting.hasReport ? `Informe ${meeting.number} radicado` : 'Pendiente',
      status: meeting.status,
      allowedActions,
      original: meeting
    };
  }

  schedule(meeting: Meeting, dateTime: Date, place: string, onSuccess: () => void): void {
    const id = this.thesisWorkId();
    if (!id || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.meetingService.scheduleMeeting(id, meeting.number, dateTime, place).pipe(first()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notify('Reunión agendada', `Se agendó la reunión ${meeting.number} y se notificó a los participantes.`,
          NotificationType.CONFIRMATION);
        onSuccess();
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        this.notify('No se agendó la reunión', apiErrorMessage(err, 'No se pudo agendar la reunión. Intente de nuevo.'),
          NotificationType.ERROR);
      }
    });
  }

  registerHeld(meeting: Meeting, observations: string, onSuccess: () => void): void {
    const id = this.thesisWorkId();
    if (!id || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.meetingService.registerMeetingHeld(id, meeting.number, observations).pipe(first()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notify('Reunión registrada', `La reunión ${meeting.number} quedó registrada como realizada.`,
          NotificationType.CONFIRMATION);
        onSuccess();
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        this.notify('No se registró la reunión',
          apiErrorMessage(err, 'No se pudo registrar la reunión. Intente de nuevo.'), NotificationType.ERROR);
      }
    });
  }

  private notify(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
