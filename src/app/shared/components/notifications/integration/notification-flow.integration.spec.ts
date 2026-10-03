import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NotificationContainerComponent } from '../components/notification-container/notification-container.component';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '../models/notification.model';

describe('Integración [Shared]: Flujo E2E de Notificaciones (Servicio ➔ Contenedor ➔ Ítem)', () => {
  let component: NotificationContainerComponent;
  let fixture: ComponentFixture<NotificationContainerComponent>;
  let service: NotificationService;

  beforeAll(() => {
    if (!window.crypto) { (window as any).crypto = {}; }
    if (!window.crypto.randomUUID) {
      let counter = 0;
      window.crypto.randomUUID = () => `12345678-1234-1234-1234-${String(counter++).padStart(12, '0')}`;
    }
  });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [NotificationContainerComponent],
      providers: [NotificationService]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationContainerComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('FLUJO AUTOMÁTICO: debe renderizar la notificación en el DOM y desaparecerla tras 5 segundos', fakeAsync(() => {
    service.info('Sincronización', 'Datos actualizados');
    fixture.detectChanges();
    let notificationEl = fixture.debugElement.query(By.css('.notification'));
    let titleEl = fixture.debugElement.query(By.css('.notification__title'));

    expect(notificationEl).toBeTruthy();
    expect(notificationEl.nativeElement.classList.contains('notification--info')).toBe(true);
    expect(titleEl.nativeElement.textContent.trim()).toBe('Sincronización');

    tick(4900);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.notification'))).toBeTruthy();

    tick(100);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.notification'))).toBeFalsy();
    expect(service.notifications()).toHaveLength(0);
  }));

  it('FLUJO MANUAL: debe desaparecer inmediatamente cuando el usuario hace clic en el botón cerrar', fakeAsync(() => {
    service.error('Error Crítico', 'Falla en el servidor');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.notification'))).toBeTruthy();
    expect(service.notifications()).toHaveLength(1);

    const closeButton = fixture.debugElement.query(By.css('.notification__close'));
    closeButton.triggerEventHandler('click', null);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.notification'))).toBeFalsy();
    expect(service.notifications()).toHaveLength(0);
    tick(10000);
  }));

  it('ORDENAMIENTO LIFO: debe apilar múltiples notificaciones ordenando la más reciente arriba', fakeAsync(() => {
    service.success('Uno', 'Primero');
    service.security('Dos', 'Segundo');
    service.info('Tres', 'Tercero');

    fixture.detectChanges();
    const titles = fixture.debugElement.queryAll(By.css('.notification__title'))
      .map(el => el.nativeElement.textContent.trim());

    expect(titles).toHaveLength(3);
    expect(titles[0]).toBe('Tres');
    expect(titles[1]).toBe('Dos');
    expect(titles[2]).toBe('Uno');
    tick(5000);
  }));
});
