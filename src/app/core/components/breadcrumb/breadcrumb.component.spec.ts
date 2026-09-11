import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal, Signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { BreadcrumbComponent } from './breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb/breadcrumb.service';
import { BreadcrumbItem } from '../../interfaces/breadcrumb-item.interface';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockBreadcrumbService {
  // El componente solo consume este Signal, así que es lo único que exponemos en el mock
  breadcrumbs: Signal<BreadcrumbItem[]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockBreadcrumbItem = (overrides: Partial<BreadcrumbItem> = {}): BreadcrumbItem => ({
  label: 'Sección',
  url: '/seccion',
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;

  let mockBreadcrumbsSignal: WritableSignal<BreadcrumbItem[]>;
  let mockBreadcrumbService: MockBreadcrumbService;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener la terminal limpia ante warnings del Router o JSDOM
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Creamos un signal controlable (WritableSignal) para manipularlo en los tests
    mockBreadcrumbsSignal = signal<BreadcrumbItem[]>([]);

    // 2. Mockeamos el servicio inyectando nuestro signal tipado estrictamente
    mockBreadcrumbService = {
      breadcrumbs: mockBreadcrumbsSignal
    };

    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [
        provideRouter([]), // Necesario para que el [routerLink] compile sin errores en el template
        { provide: BreadcrumbService, useValue: mockBreadcrumbService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Renderizado e Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar la lista vacía si no hay breadcrumbs en el signal', () => {
      mockBreadcrumbsSignal.set([]);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('li'));
      expect(listItems.length).toBe(0);
    });
  });

  describe('Comportamiento de los elementos del Breadcrumb', () => {
    it('debería renderizar los elementos intermedios como enlaces (<a>) con separador', () => {
      mockBreadcrumbsSignal.set([
        createMockBreadcrumbItem({ label: 'Inicio', url: '/inicio' }),
        createMockBreadcrumbItem({ label: 'Detalle', url: '/detalle' })
      ]);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('li'));
      const firstItem = listItems[0]; // 'Inicio' (no es $last)

      // Buscamos el enlace y el separador en el primer item
      const link = firstItem.query(By.css('a'));
      const separator = firstItem.query(By.css('span.mx-2.text-\\[\\#DB141C\\]')); // Escapado estricto de Tailwind

      expect(link).toBeTruthy();
      expect(link.attributes['href']).toBe('/inicio'); // routerLink renderiza nativamente como href
      expect(link.nativeElement.textContent.trim()).toBe('Inicio');

      expect(separator).toBeTruthy();
      expect(separator.nativeElement.textContent.trim()).toBe('>');
    });

    it('debería renderizar el último elemento solo como texto (sin enlace y sin separador)', () => {
      mockBreadcrumbsSignal.set([
        createMockBreadcrumbItem({ label: 'Inicio', url: '/inicio' }),
        createMockBreadcrumbItem({ label: 'Detalle', url: '/detalle' })
      ]);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('li'));
      const lastItem = listItems[1]; // 'Detalle' (es $last)

      const link = lastItem.query(By.css('a'));
      // En el @else, solo hay un span con color gris
      const textSpan = lastItem.query(By.css('span.text-\\[\\#A7A6B0\\]'));

      // Validamos que el bloque @else actuó correctamente
      expect(link).toBeNull();
      expect(textSpan).toBeTruthy();
      expect(textSpan.nativeElement.textContent.trim()).toBe('Detalle');
    });
  });
});
