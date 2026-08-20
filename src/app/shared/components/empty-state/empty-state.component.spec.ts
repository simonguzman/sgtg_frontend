import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;

    // Ejecutamos la detección de cambios inicial
    fixture.detectChanges();
  });

  describe('Renderizado e Inicialización', () => {
    it('debería instanciar el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería inicializarse con un mensaje vacío por defecto', () => {
      expect(component.message).toBe('');

      const messageSpan = fixture.debugElement.query(By.css('.empty-state-message'));
      expect(messageSpan).toBeTruthy();
      expect(messageSpan.nativeElement.textContent.trim()).toBe('');
    });

    it('debería mostrar el mensaje correcto cuando se le proporciona mediante @Input()', () => {
      const mockMessage = 'No hay presentaciones registradas para este anteproyecto';

      component.message = mockMessage;
      fixture.detectChanges();

      const messageSpan = fixture.debugElement.query(By.css('.empty-state-message'));
      expect(messageSpan).toBeTruthy();
      expect(messageSpan.nativeElement.textContent.trim()).toBe(mockMessage);
    });

    it('debería actualizar el texto en la interfaz si la propiedad @Input() cambia', () => {
      component.message = 'Cargando información...';
      fixture.detectChanges();

      let messageSpan = fixture.debugElement.query(By.css('.empty-state-message'));
      expect(messageSpan.nativeElement.textContent.trim()).toBe('Cargando información...');

      // Cambiamos el valor en tiempo de ejecución
      component.message = 'No se encontraron registros';
      fixture.detectChanges();

      messageSpan = fixture.debugElement.query(By.css('.empty-state-message'));
      expect(messageSpan.nativeElement.textContent.trim()).toBe('No se encontraron registros');
    });
  });
});
