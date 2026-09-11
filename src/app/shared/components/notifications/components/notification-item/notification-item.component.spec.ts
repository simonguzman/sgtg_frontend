import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NotificationItemComponent } from './notification-item.component';
import { Notification, NotificationType } from '../../models/notification.model';
import { NOTIFICATION_CONFIG } from './models/notification-item.model';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-123',
  type: NotificationType.INFO,
  title: 'Título de prueba',
  message: 'Mensaje de prueba',
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('NotificationItemComponent', () => {
  let component: NotificationItemComponent;
  let fixture: ComponentFixture<NotificationItemComponent>;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante advertencias
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [NotificationItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationItemComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Renderizado de contenido y Accesibilidad', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', createMockNotification());
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
      const errorNotification = createMockNotification({ type: NotificationType.ERROR });
      fixture.componentRef.setInput('notification', errorNotification);
      fixture.detectChanges();

      const expectedConfig = NOTIFICATION_CONFIG[NotificationType.ERROR];
      const containerEl = fixture.debugElement.query(By.css('.notification')).nativeElement as HTMLElement;
      const iconEl = fixture.debugElement.query(By.css('i.notification__icon')).nativeElement as HTMLElement;

      expectClassesToExist(containerEl, expectedConfig.containerClass);
      expectClassesToExist(iconEl, expectedConfig.icon);
      expectClassesToExist(iconEl, expectedConfig.iconClass);
    });
  });

  describe('Botón de cerrar (dismissible)', () => {
    it('debe renderizar el botón de cerrar si dismissible es undefined (comportamiento por defecto)', () => {
      fixture.componentRef.setInput('notification', createMockNotification({ dismissible: undefined }));
      fixture.detectChanges();

      const closeBtn = fixture.debugElement.query(By.css('.notification__close'));
      expect(closeBtn).toBeTruthy();
    });

    it('debe renderizar el botón de cerrar si dismissible es explícitamente true', () => {
      fixture.componentRef.setInput('notification', createMockNotification({ dismissible: true }));
      fixture.detectChanges();

      const closeBtn = fixture.debugElement.query(By.css('.notification__close'));
      expect(closeBtn).toBeTruthy();
    });

    it('NO debe renderizar el botón de cerrar si dismissible es explícitamente false', () => {
      fixture.componentRef.setInput('notification', createMockNotification({ dismissible: false }));
      fixture.detectChanges();

      const closeBtn = fixture.debugElement.query(By.css('.notification__close'));
      expect(closeBtn).toBeNull();
    });
  });

  describe('Emisión de eventos (Outputs)', () => {
    it('debe emitir el evento "dismissed" con el ID de la notificación al hacer click en cerrar', () => {
      fixture.componentRef.setInput('notification', createMockNotification({ id: 'notif-777' }));
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.dismissed, 'emit');
      const closeBtn = fixture.debugElement.query(By.css('.notification__close'));

      closeBtn.triggerEventHandler('click', null);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith('notif-777');
    });
  });
});
