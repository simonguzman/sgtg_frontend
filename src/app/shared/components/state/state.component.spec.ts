import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StateComponent } from './state.component';
import { stateList } from '../../../core/enums/state.enum';

describe('StateComponent', () => {
  let component: StateComponent;
  let fixture: ComponentFixture<StateComponent>;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia ante posibles warnings futuros
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [StateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StateComponent);
    component = fixture.componentInstance;

    // Ejecutamos la detección de cambios inicial
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
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
      // API estricta: undefined está permitido porque la interfaz del @Input lo marca como opcional (?)
      fixture.componentRef.setInput('state', undefined);
      fixture.detectChanges();

      const badgeElement = fixture.debugElement.query(By.css('.badge-state'));
      expect(component.getState()).toBe('');

      // Solo debe tener la clase base 'badge-state', sin clases adicionales de estado
      expect(badgeElement.nativeElement.className.trim()).toBe('badge-state');
    });
  });
});
