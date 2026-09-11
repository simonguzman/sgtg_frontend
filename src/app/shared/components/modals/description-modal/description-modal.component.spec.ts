import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DescriptionModalComponent } from './description-modal.component';

describe('DescriptionModalComponent', () => {
  let component: DescriptionModalComponent;
  let fixture: ComponentFixture<DescriptionModalComponent>;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante warnings de PrimeNG en JSDOM
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [DescriptionModalComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(DescriptionModalComponent);
    component = fixture.componentInstance;
  });

  // Limpiamos los espías después de cada prueba para evitar filtrado de estados
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Renderizado Básico', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar el título y la descripción correctamente cuando el modal está abierto', () => {
      // Uso de la API moderna de Angular para inyectar Inputs
      fixture.componentRef.setInput('titleDescription', 'Título de Prueba');
      fixture.componentRef.setInput('description', 'Esta es una descripción detallada de prueba para validar el renderizado.');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const dialogElement = fixture.debugElement.query(By.css('p-dialog'));
      expect(dialogElement).toBeTruthy();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Título de Prueba');
      expect(textContent).toContain('Esta es una descripción detallada de prueba para validar el renderizado.');
    });
  });

  describe('Emisión de Eventos (Outputs)', () => {
    it('debería emitir onClose al cerrarse el p-dialog (evento onHide)', () => {
      const emitSpy = jest.spyOn(component.onClose, 'emit');

      // Inyección estricta del Input
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const dialog = fixture.debugElement.query(By.css('p-dialog'));
      dialog.triggerEventHandler('onHide', null);

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('debería emitir onClose al invocar el método closeModal() directamente', () => {
      const emitSpy = jest.spyOn(component.onClose, 'emit');

      component.closeModal();

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });
});
