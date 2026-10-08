import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReadonlyFieldComponent } from './readonly-field.component';

describe('ReadonlyFieldComponent', () => {
  let component: ReadonlyFieldComponent;
  let fixture: ComponentFixture<ReadonlyFieldComponent>;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ReadonlyFieldComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReadonlyFieldComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería crear el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Renderizado del Label', () => {
    it('debería renderizar el texto del label correctamente en la vista', () => {
      component.label = 'Nombre de Usuario';
      fixture.detectChanges();

      const labelElement = fixture.debugElement.query(By.css('span.font-display')).nativeElement as HTMLSpanElement;
      expect(labelElement.textContent?.trim()).toBe('Nombre de Usuario');
    });
  });

  describe('Renderizado del Valor (Value vs EmptyText)', () => {
    it('debería renderizar el valor proporcionado cuando la cadena es válida', () => {
      component.value = 'Desarrollo de Software';
      component.emptyText = 'No especificado';
      fixture.detectChanges();

      const valueElement = fixture.debugElement.query(By.css('.information-block')).nativeElement as HTMLDivElement;
      expect(valueElement.textContent?.trim()).toBe('Desarrollo de Software');
    });

    it('debería renderizar el emptyText si el valor es nulo', () => {
      component.value = null;
      component.emptyText = 'Sin asignar';
      fixture.detectChanges();

      const valueElement = fixture.debugElement.query(By.css('.information-block')).nativeElement as HTMLDivElement;
      expect(valueElement.textContent?.trim()).toBe('Sin asignar');
    });

    it('debería renderizar el emptyText si el valor es undefined', () => {
      component.value = undefined;
      component.emptyText = 'Información pendiente';
      fixture.detectChanges();

      const valueElement = fixture.debugElement.query(By.css('.information-block')).nativeElement as HTMLDivElement;
      expect(valueElement.textContent?.trim()).toBe('Información pendiente');
    });

    it('debería renderizar el emptyText si el valor es una cadena de texto vacía', () => {
      component.value = '';
      component.emptyText = 'N/A';
      fixture.detectChanges();

      const valueElement = fixture.debugElement.query(By.css('.information-block')).nativeElement as HTMLDivElement;
      expect(valueElement.textContent?.trim()).toBe('N/A');
    });
  });

  describe('Renderizado de Clases Condicionales (Emphasize)', () => {
    it('debería agregar las clases font-medium y capitalize cuando emphasize es true', () => {
      component.emphasize = true;
      fixture.detectChanges();

      const valueElement = fixture.debugElement.query(By.css('.information-block')).nativeElement as HTMLDivElement;

      expect(valueElement.classList.contains('font-medium')).toBe(true);
      expect(valueElement.classList.contains('capitalize')).toBe(true);
    });

    it('NO debería agregar las clases font-medium y capitalize cuando emphasize es false', () => {
      component.emphasize = false;
      fixture.detectChanges();

      const valueElement = fixture.debugElement.query(By.css('.information-block')).nativeElement as HTMLDivElement;

      expect(valueElement.classList.contains('font-medium')).toBe(false);
      expect(valueElement.classList.contains('capitalize')).toBe(false);
    });
  });
});
