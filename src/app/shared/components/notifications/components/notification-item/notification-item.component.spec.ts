import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NotificationItemComponent } from './notification-item.component';
import { Notification, NotificationType } from '../../models/notification.model';
import { NOTIFICATION_CONFIG } from './models/notification-item.model';

describe('NotificationItemComponent', () => {
  let component: NotificationItemComponent;
  let fixture: ComponentFixture<NotificationItemComponent>;

  const baseNotification: Notification = {
    id: 'notif-123',
    type: NotificationType.INFO,
    title: 'Título de prueba',
    message: 'Mensaje de prueba'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationItemComponent);
    component = fixture.componentInstance;
  });

  describe('Renderizado de contenido y Accesibilidad', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', baseNotification);
      fixture.detectChanges();
    });

    it('debe mostrar el título y el mensaje correctamente', () => {
      const titleEl = fixture.debugElement.query(By.css('.notification__title')).nativeElement as HTMLElement;
      const messageEl = fixture.debugElement.query(By.css('.notification__message')).nativeElement as HTMLElement;

      expect(titleEl.textContent?.trim()).toBe('Título de prueba');
      expect(messageEl.textContent?.trim()).toBe('Mensaje de prueba');
    });

    it('debe contener el atributo role="alert" para accesibilidad', () => {
      const containerEl = fixture.debugElement.query(By.css('.notification')).nativeElement as HTMLElement;
      expect(containerEl.getAttribute('role')).toBe('alert');
    });
  });

  describe('Configuración Computada (config)', () => {
    // Función auxiliar para comprobar múltiples clases de forma segura
    const expectClassesToExist = (element: HTMLElement, classString: string | undefined) => {
      if (!classString) return;
      const classes = classString.split(' ').filter(c => c.trim() !== '');
      classes.forEach(cls => {
        expect(element.classList.contains(cls)).toBeTruthy();
      });
    };

    it('debe aplicar las clases correctas basándose en el tipo de notificación (ej. ERROR)', () => {
      const errorNotification: Notification = { ...baseNotification, type: NotificationType.ERROR };
      fixture.componentRef.setInput('notification', errorNotification);
      fixture.detectChanges();

      const expectedConfig = NOTIFICATION_CONFIG[NotificationType.ERROR];
      const containerEl = fixture.debugElement.query(By.css('.notification')).nativeElement as HTMLElement;
      const iconEl = fixture.debugElement.query(By.css('i.notification__icon')).nativeElement as HTMLElement;

      expectClassesToExist(containerEl, expectedConfig.containerClass);
      expectClassesToExist(iconEl, expectedConfig.icon);
      expectClassesToExist(iconEl, expectedConfig.iconClass);
    });

    it('debe hacer fallback a INFO si se recibe un tipo desconocido', () => {
      // Forzamos un tipo inválido estrictamente tipado como NotificationType para simular el fallo en runtime
      const unknownNotification: Notification = { ...baseNotification, type: 'UNKNOWN_TYPE' as NotificationType };
      fixture.componentRef.setInput('notification', unknownNotification);
      fixture.detectChanges();

      const expectedFallbackConfig = NOTIFICATION_CONFIG[NotificationType.INFO];
      const containerEl = fixture.debugElement.query(By.css('.notification')).nativeElement as HTMLElement;

      expectClassesToExist(containerEl, expectedFallbackConfig.containerClass);
    });
  });

  describe('Botón de cerrar (dismissible)', () => {
    it('debe renderizar el botón de cerrar si dismissible es undefined (comportamiento por defecto)', () => {
      fixture.componentRef.setInput('notification', baseNotification);
      fixture.detectChanges();

      const closeBtn = fixture.debugElement.query(By.css('.notification__close'));
      expect(closeBtn).toBeTruthy();
    });

    it('debe renderizar el botón de cerrar si dismissible es explícitamente true', () => {
      fixture.componentRef.setInput('notification', { ...baseNotification, dismissible: true });
      fixture.detectChanges();

      const closeBtn = fixture.debugElement.query(By.css('.notification__close'));
      expect(closeBtn).toBeTruthy();
    });

    it('NO debe renderizar el botón de cerrar si dismissible es explícitamente false', () => {
      fixture.componentRef.setInput('notification', { ...baseNotification, dismissible: false });
      fixture.detectChanges();

      const closeBtn = fixture.debugElement.query(By.css('.notification__close'));
      expect(closeBtn).toBeNull();
    });
  });

  describe('Emisión de eventos (Outputs)', () => {
    it('debe emitir el evento "dismissed" con el ID de la notificación al hacer click en cerrar', () => {
      fixture.componentRef.setInput('notification', baseNotification);
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.dismissed, 'emit');
      const closeBtn = fixture.debugElement.query(By.css('.notification__close'));

      closeBtn.triggerEventHandler('click', null);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith('notif-123');
    });
  });
});
