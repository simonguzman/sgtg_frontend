import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { DatePicker } from 'primeng/datepicker';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { Column, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { Meeting } from '../../interfaces/thesis-work.interface';
import { formatThesisDate } from '../../helpers/thesis-date.helper';
import { formatMeetingDateTime, MeetingsFacadeService, MeetingTableRow } from './services/meetings-facade.service';

const COLUMNS: Column[] = [
  { field: 'meeting', header: 'Reunión', type: 'text', width: '12%' },
  { field: 'suggestedDate', header: 'Fecha sugerida', type: 'text', width: '14%' },
  { field: 'scheduled', header: 'Agendada para', type: 'text', width: '18%' },
  { field: 'place', header: 'Lugar o enlace', type: 'text', width: '18%' },
  { field: 'report', header: 'Informe del mes', type: 'text', width: '14%' },
  { field: 'status', header: 'Estado', type: 'state', width: '12%' },
  {
    field: 'acciones', header: 'Acciones', type: 'actions', width: '12%',
    actions: [
      { action: 'view-details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
      { action: 'schedule', label: 'Agendar reunión', icon: 'event', variant: 'primary', disabled: false },
      { action: 'register-held', label: 'Registrar como realizada', icon: 'task_alt', variant: 'primary', disabled: false }
    ]
  }
];

/**
 * Reuniones de seguimiento del plazo de ejecución: una por cada mes (6, 9 o 12
 * según el plazo, más los meses de la prórroga). Cada una se asocia al informe
 * mensual de ese mes; el director la agenda y registra que se realizó.
 */
@Component({
  selector: 'app-meetings-page',
  standalone: true,
  imports: [TableComponent, InfoBannerComponent, ButtonComponent, DialogModule, DatePicker, FormsModule],
  providers: [MeetingsFacadeService],
  templateUrl: './meetings-page.component.html',
  styleUrls: ['./meetings-page.component.css']
})
export class MeetingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  protected readonly facade = inject(MeetingsFacadeService);

  protected readonly columns = COLUMNS;
  protected readonly formatThesisDate = formatThesisDate;
  protected readonly formatMeetingDateTime = formatMeetingDateTime;

  /** Reunión que se agenda, que se registra como realizada o cuyos detalles se ven */
  readonly scheduleTarget = signal<Meeting | null>(null);
  readonly heldTarget = signal<Meeting | null>(null);
  readonly detailTarget = signal<Meeting | null>(null);

  scheduleDate: Date | null = null;
  schedulePlace = '';
  heldObservations = '';

  ngOnInit(): void {
    this.facade.thesisWorkId.set(this.thesisWorkIdFromRoute());
  }

  private thesisWorkIdFromRoute(): string | null {
    let snapshot: ActivatedRouteSnapshot | null = this.route.snapshot;
    while (snapshot) {
      if (snapshot.paramMap.has('id')) return snapshot.paramMap.get('id');
      snapshot = snapshot.parent;
    }
    return null;
  }

  handleTableAction(event: { action: string; row: MeetingTableRow }): void {
    if (!event.row.allowedActions.includes(event.action)) return;
    const meeting = event.row.original;
    switch (event.action) {
      case 'view-details':
        this.detailTarget.set(meeting);
        break;
      case 'schedule':
        // Al reprogramar se parte de lo agendado; si no, de la fecha sugerida a las 10:00
        this.scheduleDate = meeting.scheduledAt ? new Date(meeting.scheduledAt) : this.suggestedAtTen(meeting);
        this.schedulePlace = meeting.place ?? '';
        this.scheduleTarget.set(meeting);
        break;
      case 'register-held':
        this.heldObservations = '';
        this.heldTarget.set(meeting);
        break;
    }
  }

  private suggestedAtTen(meeting: Meeting): Date | null {
    if (!meeting.suggestedDate) return null;
    const fecha = new Date(meeting.suggestedDate);
    fecha.setHours(10, 0, 0, 0);
    return fecha;
  }

  get canSaveSchedule(): boolean {
    return !!this.scheduleDate && !!this.schedulePlace.trim() && !this.facade.isSubmitting();
  }

  confirmSchedule(): void {
    const meeting = this.scheduleTarget();
    if (!meeting || !this.scheduleDate || !this.canSaveSchedule) return;
    this.facade.schedule(meeting, this.scheduleDate, this.schedulePlace, () => this.scheduleTarget.set(null));
  }

  confirmHeld(): void {
    const meeting = this.heldTarget();
    if (!meeting) return;
    this.facade.registerHeld(meeting, this.heldObservations, () => this.heldTarget.set(null));
  }

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['loaded_documents'],
      { relativeTo: this.route.parent, queryParams: { tab: 'AVANCES' } }));
  }
}
