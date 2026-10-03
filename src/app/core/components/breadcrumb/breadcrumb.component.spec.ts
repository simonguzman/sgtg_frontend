import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal, Signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { BreadcrumbComponent } from './breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb/breadcrumb.service';
import { BreadcrumbItem } from '../../interfaces/breadcrumb-item.interface';

interface MockBreadcrumbService {
  breadcrumbs: Signal<BreadcrumbItem[]>;
}

const createMockBreadcrumbItem = (overrides: Partial<BreadcrumbItem> = {}): BreadcrumbItem => ({
  label: 'Sección',
  url: '/seccion',
  ...overrides
});

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let mockBreadcrumbsSignal: WritableSignal<BreadcrumbItem[]>;
  let mockBreadcrumbService: MockBreadcrumbService;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockBreadcrumbsSignal = signal<BreadcrumbItem[]>([]);
    mockBreadcrumbService = {
      breadcrumbs: mockBreadcrumbsSignal
    };

    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [
        provideRouter([]),
        { provide: BreadcrumbService, useValue: mockBreadcrumbService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Renderizado e Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar la lista vacía si no hay breadcrumbs en el signal', () => {
      mockBreadcrumbsSignal.set([]);
      fixture.detectChanges();
      const listItems = fixture.debugElement.queryAll(By.css('li'));
      expect(listItems).toHaveLength(0);
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
      const firstItem = listItems[0];
      const link = firstItem.query(By.css('a'));
      const separator = firstItem.query(By.css('span.mx-2.text-\\[\\#DB141C\\]'));
      expect(link).toBeTruthy();
      expect(link.attributes['href']).toBe('/inicio');
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
      const lastItem = listItems[1];
      const link = lastItem.query(By.css('a'));
      const textSpan = lastItem.query(By.css('span.text-\\[\\#A7A6B0\\]'));
      expect(link).toBeNull();
      expect(textSpan).toBeTruthy();
      expect(textSpan.nativeElement.textContent.trim()).toBe('Detalle');
    });
  });
});
