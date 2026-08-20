import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StateComponent } from './state.component';
import { stateList } from '../../../core/enums/state.enum';

describe('StateComponent', () => {
  let component: StateComponent;
  let fixture: ComponentFixture<StateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StateComponent);
    component = fixture.componentInstance;

    // Ejecutamos la detección de cambios inicial
    fixture.detectChanges();
  });

  describe('Renderizado e Inicialización', () => {
    it('debería instanciar el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar el label correctamente en la vista', () => {
      fixture.componentRef.setInput('label', 'Aprobado');
      fixture.detectChanges();

      const badgeElement = fixture.debugElement.query(By.css('.badge-state'));
      expect(badgeElement).toBeTruthy();
      expect(badgeElement.nativeElement.textContent.trim()).toBe('Aprobado');
    });
  });

  describe('Lógica de Clases (Mapeo de Estados)', () => {
    it('debería aplicar la clase CSS correcta para el estado APROBADO', () => {
      fixture.componentRef.setInput('state', stateList.APROBADO);
      fixture.detectChanges();

      const badgeElement = fixture.debugElement.query(By.css('.badge-state'));
      expect(component.getState()).toBe('state-aprobado');
      expect(badgeElement.nativeElement.className).toContain('state-aprobado');
    });

    it('debería aplicar la clase CSS correcta para el estado EN_REVISION', () => {
      fixture.componentRef.setInput('state', stateList.EN_REVISION);
      fixture.detectChanges();

      const badgeElement = fixture.debugElement.query(By.css('.badge-state'));
      expect(component.getState()).toBe('state-revision');
      expect(badgeElement.nativeElement.className).toContain('state-revision');
    });
  });

  describe('Casos Borde y Manejo de Errores', () => {
    it('debería retornar una cadena vacía y no aplicar estilos si el estado es undefined', () => {
      fixture.componentRef.setInput('state', undefined);
      fixture.detectChanges();

      const badgeElement = fixture.debugElement.query(By.css('.badge-state'));
      expect(component.getState()).toBe('');
      // Solo debe tener la clase base, sin clases adicionales de estado
      expect(badgeElement.nativeElement.className.trim()).toBe('badge-state');
    });

    it('no debería romperse y debería retornar cadena vacía si se recibe un estado no mapeado', () => {
      // Reemplazamos el uso de 'any' utilizando 'unknown' como un puente seguro.
      // Esto engaña al compilador para probar la resiliencia del componente (el || '')
      // sin romper la regla de "no usar any".
      const invalidState = 'ESTADO_INEXISTENTE' as unknown as stateList;
      fixture.componentRef.setInput('state', invalidState);

      // Verificamos que el ciclo de detección de cambios no arroje excepciones
      expect(() => fixture.detectChanges()).not.toThrow();

      // Verificamos que el mapeo devuelva el string vacío por defecto
      expect(component.getState()).toBe('');

      const badgeElement = fixture.debugElement.query(By.css('.badge-state'));
      expect(badgeElement.nativeElement.className.trim()).toBe('badge-state');
    });
  });
});
