import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MeetingsPageComponent } from './meetings-page.component';
import { MeetingsFacadeService, MeetingTableRow } from './services/meetings-facade.service';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';
import { stateList } from '../../../../core/enums/state.enum';
import { Meeting } from '../../interfaces/thesis-work.interface';

const reunion = (overrides: Partial<Meeting> = {}): Meeting => ({
  number: 3, suggestedDate: new Date(2026, 5, 20), scheduledAt: null, place: null, held: false,
  observations: null, hasReport: false, status: stateList.PENDIENTE, ...overrides
});

const fila = (meeting: Meeting, allowedActions: string[]): MeetingTableRow => ({
  id: String(meeting.number), meeting: `Reunión ${meeting.number}`, suggestedDate: '', scheduled: '', place: '',
  report: '', status: meeting.status, allowedActions, original: meeting
});

describe('MeetingsPageComponent', () => {
  let component: MeetingsPageComponent;
  let fixture: ComponentFixture<MeetingsPageComponent>;
  let facade: {
    thesisWorkId: ReturnType<typeof signal<string | null>>;
    isSubmitting: ReturnType<typeof signal<boolean>>;
    thesisWork: () => undefined;
    rows: () => MeetingTableRow[];
    summary: () => { total: number; held: number; withReport: number };
    schedule: jest.Mock;
    registerHeld: jest.Mock;
  };
  let navigation: { back: jest.Mock };

  beforeEach(async () => {
    facade = {
      thesisWorkId: signal<string | null>(null),
      isSubmitting: signal(false),
      thesisWork: () => undefined,
      rows: () => [],
      summary: () => ({ total: 0, held: 0, withReport: 0 }),
      schedule: jest.fn(),
      registerHeld: jest.fn()
    };
    navigation = { back: jest.fn() };
    const parent = { snapshot: { paramMap: convertToParamMap({ id: '15' }), parent: null } };

    await TestBed.configureTestingModule({
      imports: [MeetingsPageComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}), parent: parent.snapshot },
          parent } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: NavigationHistoryService, useValue: navigation }
      ]
    })
      .overrideComponent(MeetingsPageComponent, { set: { providers: [{ provide: MeetingsFacadeService, useValue: facade }] } })
      .compileComponents();

    fixture = TestBed.createComponent(MeetingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('toma el trabajo de la ruta padre', () => {
    expect(facade.thesisWorkId()).toBe('15');
  });

  it('al agendar parte de la fecha sugerida a las 10:00 y guarda con el lugar', () => {
    const pendiente = reunion();
    component.handleTableAction({ action: 'schedule', row: fila(pendiente, ['view-details', 'schedule']) });

    expect(component.scheduleTarget()).toBe(pendiente);
    expect(component.scheduleDate).toEqual(new Date(2026, 5, 20, 10, 0));
    expect(component.canSaveSchedule).toBe(false);

    component.schedulePlace = 'Sala 2';
    component.confirmSchedule();
    expect(facade.schedule).toHaveBeenCalledWith(pendiente, new Date(2026, 5, 20, 10, 0), 'Sala 2', expect.any(Function));
  });

  it('al reprogramar parte de lo agendado', () => {
    const agendada = reunion({ scheduledAt: new Date(2026, 5, 21, 15, 30), place: 'Sala 4', status: stateList.AGENDADA });
    component.handleTableAction({ action: 'schedule', row: fila(agendada, ['view-details', 'schedule']) });
    expect(component.scheduleDate).toEqual(new Date(2026, 5, 21, 15, 30));
    expect(component.schedulePlace).toBe('Sala 4');
  });

  it('registra como realizada con las observaciones', () => {
    const agendada = reunion({ scheduledAt: new Date(2026, 5, 21, 15, 30), status: stateList.AGENDADA });
    component.handleTableAction({ action: 'register-held', row: fila(agendada, ['view-details', 'register-held']) });
    component.heldObservations = 'Temas tratados';
    component.confirmHeld();
    expect(facade.registerHeld).toHaveBeenCalledWith(agendada, 'Temas tratados', expect.any(Function));
  });

  it('ignora una acción que la fila no permite', () => {
    component.handleTableAction({ action: 'schedule', row: fila(reunion(), ['view-details']) });
    expect(component.scheduleTarget()).toBeNull();
  });

  it('regresar sigue el historial y, sin él, va a la pestaña de informes', () => {
    component.goBack();
    expect(navigation.back).toHaveBeenCalled();
  });
});
