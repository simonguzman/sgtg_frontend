import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SearchableSelectComponent, SelectOption } from './searchable-select.component';

describe('SearchableSelectComponent', () => {
  let component: SearchableSelectComponent;
  let fixture: ComponentFixture<SearchableSelectComponent>;

  const mockOptions: SelectOption[] = [
    { id: '1', label: 'Angular' },
    { id: '2', label: 'React' },
    { id: '3', label: 'Vue' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelectComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchableSelectComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('options', mockOptions);
    fixture.componentRef.setInput('placeholder', 'Seleccione un framework');

    fixture.detectChanges();
  });

  describe('Inicialización y Renderizado', () => {
    it('debería instanciar el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería mostrar el placeholder definido', () => {
      const inputElement = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;
      expect(inputElement.placeholder).toBe('Seleccione un framework');
    });

    it('debería estar cerrado y con valores vacíos por defecto', () => {
      expect(component.isOpen()).toBe(false);
      expect(component.value()).toBe('');
      expect(component.searchTerm()).toBe('');
    });
  });

  describe('Interacciones con el Dropdown y Búsqueda', () => {
    it('debería abrir el dropdown al hacer clic en el input', () => {
      const inputElement = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;
      inputElement.click();
      fixture.detectChanges();

      expect(component.isOpen()).toBe(true);
      const ul = fixture.debugElement.query(By.css('ul'));
      expect(ul).toBeTruthy();
    });

    it('debería cerrar el dropdown si se hace clic fuera del componente', () => {
      component.isOpen.set(true);
      fixture.detectChanges();

      document.dispatchEvent(new MouseEvent('click'));
      fixture.detectChanges();

      expect(component.isOpen()).toBe(false);
    });

    it('debería filtrar las opciones al escribir en el buscador', () => {
      const inputElement = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;

      inputElement.value = 'ang';
      inputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.isOpen()).toBe(true);
      expect(component.searchTerm()).toBe('ang');

      const filtered = component.filteredOptions();
      expect(filtered.length).toBe(1);
      expect(filtered[0].label).toBe('Angular');
    });

    it('debería mostrar "No se encontraron resultados..." cuando la búsqueda no coincide', () => {
      const inputElement = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;

      inputElement.value = 'Svelte';
      inputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const emptyLi = fixture.debugElement.query(By.css('ul li.cursor-default')).nativeElement;
      expect(emptyLi.textContent.trim()).toBe('No se encontraron resultados...');
    });
  });

  describe('Selección y Limpieza de Datos', () => {
    it('debería seleccionar una opción, emitir eventos y cerrar el dropdown', () => {
      const onChangeSpy = jest.fn<void, [string]>();
      const onTouchedSpy = jest.fn<void, []>();

      component.registerOnChange(onChangeSpy);
      component.registerOnTouched(onTouchedSpy);

      component.isOpen.set(true);
      fixture.detectChanges();

      const firstOption = fixture.debugElement.query(By.css('ul li:first-child')).nativeElement;
      firstOption.click();
      fixture.detectChanges();

      expect(component.value()).toBe('1');
      expect(component.searchTerm()).toBe('Angular');
      expect(component.isOpen()).toBe(false);
      expect(onChangeSpy).toHaveBeenCalledWith('1');
      expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('debería limpiar la selección si isClearable es true y se hace clic en limpiar', () => {
      fixture.componentRef.setInput('isClearable', true);
      component.writeValue('2');
      fixture.detectChanges();

      const onChangeSpy = jest.fn<void, [string]>();
      component.registerOnChange(onChangeSpy);

      const clearBtn = fixture.debugElement.query(By.css('span[title="Limpiar selección"]')).nativeElement;

      const clickEvent = new MouseEvent('click');
      jest.spyOn(clickEvent, 'stopPropagation');

      clearBtn.dispatchEvent(clickEvent);
      fixture.detectChanges();

      expect(clickEvent.stopPropagation).toHaveBeenCalled();
      expect(component.value()).toBe('');
      expect(component.searchTerm()).toBe('');
      expect(onChangeSpy).toHaveBeenCalledWith('');
    });
  });

  describe('Integración con Form Control (ControlValueAccessor)', () => {
    it('debería actualizar el estado interno mediante writeValue', () => {
      component.writeValue('3');
      fixture.detectChanges();

      expect(component.value()).toBe('3');
      expect(component.searchTerm()).toBe('Vue');
    });

    it('debería deshabilitar el input mediante setDisabledState', () => {
      if (component.setDisabledState) {
        component.setDisabledState(true);
      }
      fixture.detectChanges();

      expect(component.isDisabled()).toBe(true);

      const inputElement = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;
      expect(inputElement.disabled).toBe(true);
      expect(inputElement.className).toContain('cursor-not-allowed');
    });

    it('no debería abrir el dropdown si el componente está deshabilitado', () => {
      if (component.setDisabledState) {
        component.setDisabledState(true);
      }
      fixture.detectChanges();

      component.toggleDropdown();
      expect(component.isOpen()).toBe(false);
    });
  });
});
