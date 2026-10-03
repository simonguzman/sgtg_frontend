import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

import { NotificationContainerComponent } from './notification-container.component';
import { NotificationService } from '../../services/notification.service';
import { Notification, NotificationType } from '../../models/notification.model';

import { NotificationItemComponent } from '../notification-item/notification-item.component';

@Component({ selector: 'app-notification-item', standalone: true, template: '' })
class MockNotificationItemComponent {
  @Input() notification!: Notification;
  @Output() dismissed = new EventEmitter<string>();
}

const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: '1',
  title: 'Test',
  message: 'Msg',
  type: NotificationType.INFO,
  ...overrides
});

describe('NotificationContainerComponent', () => {
  let component: NotificationContainerComponent;
  let fixture: ComponentFixture<NotificationContainerComponent>;
  let notificationsMockSignal: WritableSignal<Notification[]>;
  let dismissMock: jest.Mock<void, [string]>;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

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
    jest.restoreAllMocks();
  });

  describe('Renderizado del contenedor y Accesibilidad', () => {
    it('debe renderizar un contenedor vacío cuando no hay notificaciones', () => {
      const containerEl = fixture.debugElement.query(By.css('.notification-container'));
      expect(containerEl).toBeTruthy();

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
      notificationsMockSignal.set(testNotifications);
      fixture.detectChanges();

      const items = fixture.debugElement.queryAll(By.directive(MockNotificationItemComponent));
      expect(items).toHaveLength(2);

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
      itemDebugElement.componentInstance.dismissed.emit('99');
      expect(dismissMock).toHaveBeenCalledTimes(1);
      expect(dismissMock).toHaveBeenCalledWith('99');
    });
  });
});
