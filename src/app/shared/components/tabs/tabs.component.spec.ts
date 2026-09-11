import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TabsComponent, TabItem } from './tabs.component';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockTabItem = (overrides: Partial<TabItem> = {}): TabItem => ({
  label: 'Default Tab',
  value: 'default_tab',
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;

  const mockTabs: TabItem[] = [
    createMockTabItem({ label: 'Pestaña 1', value: 'tab1' }),
    createMockTabItem({ label: 'Pestaña 2', value: 'tab2' }),
    createMockTabItem({ label: 'Pestaña 3', value: 'tab3' })
  ];

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [TabsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;

    // Seteamos inputs obligatorios utilizando la API moderna de ComponentRef
    fixture.componentRef.setInput('tabs', mockTabs);
    fixture.componentRef.setInput('activeTab', 'tab1');

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

    it('debería renderizar exactamente el número de pestañas proporcionadas', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons.length).toBe(mockTabs.length);
    });

    it('debería mostrar el label correcto en cada pestaña', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[0].nativeElement.textContent.trim()).toBe('Pestaña 1');
      expect(buttons[1].nativeElement.textContent.trim()).toBe('Pestaña 2');
      expect(buttons[2].nativeElement.textContent.trim()).toBe('Pestaña 3');
    });
  });

  describe('Lógica de Clases y UI (Estilos Dinámicos)', () => {
    it('debería aplicar las clases de pestaña "activa" a la seleccionada inicial', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));

      // 'tab1' es la activa inicial
      expect(buttons[0].nativeElement.className).toContain('border-b-4');
      expect(buttons[0].nativeElement.className).toContain('border-[#000066]');
      expect(buttons[0].nativeElement.className).toContain('font-bold');
    });

    it('debería aplicar las clases de pestaña "inactiva" a las no seleccionadas', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));

      // 'tab2' y 'tab3' están inactivas
      expect(buttons[1].nativeElement.className).toContain('border-transparent');
      expect(buttons[1].nativeElement.className).toContain('font-normal');
      expect(buttons[2].nativeElement.className).toContain('border-transparent');
    });

    it('debería actualizar los estilos de la UI si el input activeTab cambia externamente', () => {
      // Simulamos que el componente padre cambia el valor dinámicamente
      fixture.componentRef.setInput('activeTab', 'tab2');
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));

      // Ahora 'tab1' debe ser inactiva y 'tab2' activa
      expect(buttons[0].nativeElement.className).toContain('border-transparent');
      expect(buttons[1].nativeElement.className).toContain('border-b-4');
      expect(buttons[1].nativeElement.className).toContain('font-bold');
    });
  });

  describe('Interacciones y Eventos', () => {
    it('debería emitir tabChange con el valor correcto al hacer clic en una pestaña distinta', () => {
      const emitSpy = jest.spyOn(component.tabChange, 'emit');
      const buttons = fixture.debugElement.queryAll(By.css('button'));

      // Simulamos click en la segunda pestaña ('tab2')
      buttons[1].nativeElement.click();

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith('tab2');
    });

    it('NO debería emitir tabChange si se hace clic en la pestaña que ya está activa', () => {
      const emitSpy = jest.spyOn(component.tabChange, 'emit');
      const buttons = fixture.debugElement.queryAll(By.css('button'));

      // Simulamos click en la primera pestaña ('tab1'), que ya está seleccionada
      buttons[0].nativeElement.click();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
