// src/app/shared/components/notifications/integration/notification-flow.integration.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

// Importamos las piezas REALES
import { NotificationContainerComponent } from '../components/notification-container/notification-container.component';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '../models/notification.model';

describe('Integración [Shared]: Flujo E2E de Notificaciones (Servicio ➔ Contenedor ➔ Ítem)', () => {
  let component: NotificationContainerComponent;
  let fixture: ComponentFixture<NotificationContainerComponent>;
  let service: NotificationService;

  beforeAll(() => {
    // Soporte para generación de UUIDs nativos en el entorno de pruebas de JSDOM
    if (!window.crypto) { (window as any).crypto = {}; }
    if (!window.crypto.randomUUID) {
      let counter = 0;
      window.crypto.randomUUID = () => `12345678-1234-1234-1234-${String(counter++).padStart(12, '0')}`;
    }
  });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      // Al importar el contenedor, automáticamente trae el NotificationItemComponent real
      imports: [NotificationContainerComponent],
      providers: [NotificationService] // Inyectamos el servicio real
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationContainerComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(NotificationService);

    // Disparamos la detección de cambios inicial para anclar el contenedor al DOM
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('FLUJO AUTOMÁTICO: debe renderizar la notificación en el DOM y desaparecerla tras 5 segundos', fakeAsync(() => {
    // 1. Act: El servicio real dispara una notificación
    service.info('Sincronización', 'Datos actualizados');

    // 2. Angular actualiza el DOM
    fixture.detectChanges();

    // 3. Assert (Renderizado): Verificamos que el Ítem REAL se dibujó con las clases correctas
    let notificationEl = fixture.debugElement.query(By.css('.notification'));
    let titleEl = fixture.debugElement.query(By.css('.notification__title'));

    expect(notificationEl).toBeTruthy();
    expect(notificationEl.nativeElement.classList.contains('notification--info')).toBe(true);
    expect(titleEl.nativeElement.textContent.trim()).toBe('Sincronización');

    // 4. Act: Avanzamos el tiempo 4.9 segundos (aún no debe desaparecer)
    tick(4900);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.notification'))).toBeTruthy();

    // 5. Act: Avanzamos el milisegundo final (alcanzamos los 5000ms)
    tick(100);
    fixture.detectChanges();

    // 6. Assert (Auto-Dismiss): El DOM debe estar vacío y el signal del servicio también
    expect(fixture.debugElement.query(By.css('.notification'))).toBeFalsy();
    expect(service.notifications()).toHaveLength(0);
  }));

  it('FLUJO MANUAL: debe desaparecer inmediatamente cuando el usuario hace clic en el botón cerrar', fakeAsync(() => {
    // 1. Act: Disparamos una alerta de error
    service.error('Error Crítico', 'Falla en el servidor');
    fixture.detectChanges();

    // Verificamos que está en el DOM
    expect(fixture.debugElement.query(By.css('.notification'))).toBeTruthy();
    expect(service.notifications()).toHaveLength(1);

    // 2. Interacción del usuario: Buscamos el botón de la X real y le hacemos clic
    const closeButton = fixture.debugElement.query(By.css('.notification__close'));
    closeButton.triggerEventHandler('click', null);

    // 3. Reflejamos el cambio en el DOM
    fixture.detectChanges();

    // 4. Assert: El elemento fue destruido inmediatamente sin esperar el temporizador
    expect(fixture.debugElement.query(By.css('.notification'))).toBeFalsy();
    expect(service.notifications()).toHaveLength(0);

    // Limpiamos la cola de timers de RxJS que quedó huérfana tras cerrar manualmente
    // (el setTimeout de 10s del error) para que Jest no se queje.
    tick(10000);
  }));

  it('ORDENAMIENTO LIFO: debe apilar múltiples notificaciones ordenando la más reciente arriba', fakeAsync(() => {
    // 1. Disparamos tres notificaciones en orden
    service.success('Uno', 'Primero');
    service.security('Dos', 'Segundo');
    service.info('Tres', 'Tercero');

    fixture.detectChanges();

    // 2. Capturamos todos los títulos renderizados en el DOM
    const titles = fixture.debugElement.queryAll(By.css('.notification__title'))
      .map(el => el.nativeElement.textContent.trim());

    // 3. Assert: La última en dispararse ("Tres") debe ser la primera en el DOM (índice 0)
    expect(titles).toHaveLength(3);
    expect(titles[0]).toBe('Tres');
    expect(titles[1]).toBe('Dos');
    expect(titles[2]).toBe('Uno');

    // Limpieza de temporizadores
    tick(5000);
  }));
});
