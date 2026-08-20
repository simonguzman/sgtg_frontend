import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal, WritableSignal } from '@angular/core';
import { NotificationContainerComponent } from './notification-container.component';
import { NotificationService } from '../../services/notification.service';
import { NotificationItemComponent } from '../notification-item/notification-item.component';
import { Notification, NotificationType } from '../../models/notification.model';

describe('NotificationContainerComponent', () => {
  let component: NotificationContainerComponent;
  let fixture: ComponentFixture<NotificationContainerComponent>;

  // Signals y Mocks estrictamente tipados
  let notificationsMockSignal: WritableSignal<Notification[]>;
  let dismissMock: jest.Mock;

  beforeEach(async () => {
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
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado del contenedor y Accesibilidad', () => {
    it('debe renderizar un contenedor vacío cuando no hay notificaciones', () => {
      const containerEl = fixture.debugElement.query(By.css('.notification-container'));
      expect(containerEl).toBeTruthy();

      const items = fixture.debugElement.queryAll(By.directive(NotificationItemComponent));
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
        { id: '1', title: 'Test 1', message: 'Msg 1', type: NotificationType.INFO },
        { id: '2', title: 'Test 2', message: 'Msg 2', type: NotificationType.ERROR }
      ];

      // Simulamos que el estado global ha cambiado
      notificationsMockSignal.set(testNotifications);
      fixture.detectChanges();

      const items = fixture.debugElement.queryAll(By.directive(NotificationItemComponent));
      expect(items).toHaveLength(2);

      // Verificamos de forma estricta que los inputs de cada hijo correspondan a la data inyectada
      const firstItemInstance = items[0].componentInstance as NotificationItemComponent;
      expect(firstItemInstance.notification()).toEqual(testNotifications[0]);

      const secondItemInstance = items[1].componentInstance as NotificationItemComponent;
      expect(secondItemInstance.notification()).toEqual(testNotifications[1]);
    });
  });

  describe('Interacción y Eventos', () => {
    it('debe delegar la llamada a notificationService.dismiss() cuando el hijo emite el evento "dismissed"', () => {
      const testNotification: Notification = {
        id: '99',
        title: 'Cerrar',
        message: 'Msg',
        type: NotificationType.INFO
      };

      notificationsMockSignal.set([testNotification]);
      fixture.detectChanges();

      const itemDebugElement = fixture.debugElement.query(By.directive(NotificationItemComponent));

      // Simulamos que el componente hijo emite el evento desde su Output 'dismissed'
      itemDebugElement.triggerEventHandler('dismissed', '99');

      // Comprobamos la correcta delegación al servicio inyectado
      expect(dismissMock).toHaveBeenCalledTimes(1);
      expect(dismissMock).toHaveBeenCalledWith('99');
    });
  });
});
