import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

import { NotificationContainerComponent } from './notification-container.component';
import { NotificationService } from '../../services/notification.service';
import { Notification, NotificationType } from '../../models/notification.model';

// ── Componentes Originales a Remover (Shallow Testing) ───────────────────────
import { NotificationItemComponent } from '../notification-item/notification-item.component';

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-notification-item', standalone: true, template: '' })
class MockNotificationItemComponent {
  // En los Mocks es perfectamente válido usar @Input tradicional por simplicidad,
  // aunque el componente real use inputs basados en Signals. La plantilla de Angular
  // enlazará correctamente los datos ([notification]="notif") de cualquier forma.
  @Input() notification!: Notification;
  @Output() dismissed = new EventEmitter<string>();
}

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: '1',
  title: 'Test',
  message: 'Msg',
  type: NotificationType.INFO,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('NotificationContainerComponent', () => {
  let component: NotificationContainerComponent;
  let fixture: ComponentFixture<NotificationContainerComponent>;

  // Signals y Mocks estrictamente tipados
  let notificationsMockSignal: WritableSignal<Notification[]>;
  let dismissMock: jest.Mock<void, [string]>;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante advertencias o errores nativos
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Inicialización de estado y dependencias mockeadas
    notificationsMockSignal = signal<Notification[]>([]);
    dismissMock = jest.fn();

    const mockNotificationService = {
      notifications: notificationsMockSignal.asReadonly(),
      dismiss: dismissMock
    };

    await TestBed.configureTestingModule({
      imports: [NotificationContainerComponent],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    })
    .overrideComponent(NotificationContainerComponent, {
      remove: {
        imports: [NotificationItemComponent]
      },
      add: {
        imports: [MockNotificationItemComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar la consola y los espías
  });

  describe('Renderizado del contenedor y Accesibilidad', () => {
    it('debe renderizar un contenedor vacío cuando no hay notificaciones', () => {
      const containerEl = fixture.debugElement.query(By.css('.notification-container'));
      expect(containerEl).toBeTruthy();

      // Buscamos ahora por la directiva del Mock
      const items = fixture.debugElement.queryAll(By.directive(MockNotificationItemComponent));
      expect(items).toHaveLength(0);
    });

    it('debe contener los atributos de accesibilidad aria-live="polite" y aria-atomic="false"', () => {
      const containerEl = fixture.debugElement.query(By.css('.notification-container')).nativeElement as HTMLElement;

      expect(containerEl.getAttribute('aria-live')).toBe('polite');
      expect(containerEl.getAttribute('aria-atomic')).toBe('false');
    });
  });

  describe('Renderizado de la lista (Control Flow @for)', () => {
    it('debe renderizar múltiples <app-notification-item> basados en el signal del servicio', () => {
      const testNotifications: Notification[] = [
        createMockNotification({ id: '1', title: 'Test 1', message: 'Msg 1', type: NotificationType.INFO }),
        createMockNotification({ id: '2', title: 'Test 2', message: 'Msg 2', type: NotificationType.ERROR })
      ];

      // Simulamos que el estado global ha cambiado
      notificationsMockSignal.set(testNotifications);
      fixture.detectChanges();

      const items = fixture.debugElement.queryAll(By.directive(MockNotificationItemComponent));
      expect(items).toHaveLength(2);

      // Verificamos de forma estricta que los inputs de cada hijo correspondan a la data inyectada
      const firstItemInstance = items[0].componentInstance as MockNotificationItemComponent;
      expect(firstItemInstance.notification).toEqual(testNotifications[0]);

      const secondItemInstance = items[1].componentInstance as MockNotificationItemComponent;
      expect(secondItemInstance.notification).toEqual(testNotifications[1]);
    });
  });

  describe('Interacción y Eventos', () => {
    it('debe delegar la llamada a notificationService.dismiss() cuando el hijo emite el evento "dismissed"', () => {
      const testNotification = createMockNotification({
        id: '99',
        title: 'Cerrar',
        message: 'Msg',
        type: NotificationType.INFO
      });

      notificationsMockSignal.set([testNotification]);
      fixture.detectChanges();

      const itemDebugElement = fixture.debugElement.query(By.directive(MockNotificationItemComponent));

      // Simulamos que el componente hijo emite el evento desde su Output 'dismissed'
      itemDebugElement.componentInstance.dismissed.emit('99');

      // Comprobamos la correcta delegación al servicio inyectado
      expect(dismissMock).toHaveBeenCalledTimes(1);
      expect(dismissMock).toHaveBeenCalledWith('99');
    });
  });
});
