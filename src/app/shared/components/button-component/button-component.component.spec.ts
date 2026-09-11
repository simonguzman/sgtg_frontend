import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ButtonComponent } from './button-component.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante posibles advertencias de PrimeNG
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ButtonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;

    // Ejecutamos la detección de cambios inicial
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Renderizado del Template', () => {
    it('debería renderizar el botón correctamente con el label proporcionado', () => {
      // Uso de la API moderna en lugar de mutación directa
      fixture.componentRef.setInput('label', 'Guardar');
      fixture.detectChanges();

      const labelElement = fixture.debugElement.query(By.css('.p-button-label'));
      expect(labelElement).toBeTruthy();
      expect(labelElement.nativeElement.textContent).toContain('Guardar');
    });

    it('debería renderizar el icono si se proporciona', () => {
      fixture.componentRef.setInput('icon', 'save');
      fixture.detectChanges();

      const iconElement = fixture.debugElement.query(By.css('.material-symbols-outlined'));
      expect(iconElement).toBeTruthy();
      expect(iconElement.nativeElement.textContent).toContain('save');
    });
  });

  describe('Lógica de clases (buttonClass getter)', () => {
    it('debería aplicar la clase btn-primary por defecto', () => {
      expect(component.buttonClass).toContain('btn-primary');
      expect(component.buttonClass).not.toContain('btn-secondary');
    });

    it('debería aplicar la clase btn-secondary cuando la variante es secondary', () => {
      fixture.componentRef.setInput('variant', 'secondary');

      expect(component.buttonClass).toContain('btn-secondary');
    });

    it('debería aplicar la clase btn-icon cuando solo hay icono y NO hay label', () => {
      fixture.componentRef.setInput('icon', 'add');
      fixture.componentRef.setInput('label', undefined);

      expect(component.buttonClass).toContain('btn-icon');
    });

    it('NO debería aplicar la clase btn-icon si el botón tiene icono y también label', () => {
      fixture.componentRef.setInput('icon', 'add');
      fixture.componentRef.setInput('label', 'Agregar');

      expect(component.buttonClass).not.toContain('btn-icon');
    });
  });

  describe('Interacciones y Eventos', () => {
    it('debería emitir el evento onClick al hacer click en el botón', () => {
      const emitSpy = jest.spyOn(component.onClick, 'emit');

      // Simulamos la interacción llamando directamente al método enlazado al HTML
      component.onButtonClick();

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('NO debería emitir el evento onClick si el botón está deshabilitado (disabled = true)', () => {
      const emitSpy = jest.spyOn(component.onClick, 'emit');

      fixture.componentRef.setInput('disabled', true);
      component.onButtonClick();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
