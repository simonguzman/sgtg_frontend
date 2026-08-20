import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreadcrumbComponent } from './breadcrumb.component';
import { BreadcrumbService } from '../../services/breadcrumb/breadcrumb.service';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { BreadcrumbItem } from '../../interfaces/breadcrumb-item.interface';

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let mockBreadcrumbsSignal: WritableSignal<BreadcrumbItem[]>;
  let mockBreadcrumbService: Partial<BreadcrumbService>;

  beforeEach(async () => {
    // 1. Creamos un signal controlable (WritableSignal) para las pruebas
    mockBreadcrumbsSignal = signal<BreadcrumbItem[]>([]);

    // 2. Mockeamos el servicio inyectando nuestro signal
    mockBreadcrumbService = {
      breadcrumbs: mockBreadcrumbsSignal
    };

    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent], // Al ser standalone va en imports
      providers: [
        provideRouter([]), // Necesario para que el [routerLink] compile sin errores
        { provide: BreadcrumbService, useValue: mockBreadcrumbService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería renderizar la lista vacía si no hay breadcrumbs', () => {
    // Seteamos el estado vacío y disparamos la detección de cambios
    mockBreadcrumbsSignal.set([]);
    fixture.detectChanges();

    const listItems = fixture.debugElement.queryAll(By.css('li'));
    expect(listItems.length).toBe(0);
  });

  it('debería renderizar los elementos intermedios como enlaces (<a>) con separador', () => {
    // Seteamos dos items
    mockBreadcrumbsSignal.set([
      { label: 'Inicio', url: '/inicio' },
      { label: 'Detalle', url: '/detalle' }
    ]);
    fixture.detectChanges();

    const listItems = fixture.debugElement.queryAll(By.css('li'));
    const firstItem = listItems[0]; // 'Inicio' (!$last)

    // Buscamos el enlace y el separador en el primer item
    const link = firstItem.query(By.css('a'));
    const separator = firstItem.query(By.css('span.text-\\[\\#DB141C\\]')); // Escapamos corchetes de Tailwind

    expect(link).toBeTruthy();
    expect(link.attributes['href']).toBe('/inicio'); // routerLink compila a href
    expect(link.nativeElement.textContent.trim()).toBe('Inicio');

    expect(separator).toBeTruthy();
    expect(separator.nativeElement.textContent.trim()).toBe('>');
  });

  it('debería renderizar el último elemento solo como texto (sin <a> y sin separador)', () => {
    // Seteamos dos items
    mockBreadcrumbsSignal.set([
      { label: 'Inicio', url: '/inicio' },
      { label: 'Detalle', url: '/detalle' }
    ]);
    fixture.detectChanges();

    const listItems = fixture.debugElement.queryAll(By.css('li'));
    const lastItem = listItems[1]; // 'Detalle' ($last)

    const link = lastItem.query(By.css('a'));
    // En el @else, solo hay un span, así que buscamos directamente el tag
    const span = lastItem.query(By.css('span'));

    // Validamos que el bloque @else hizo su trabajo
    expect(link).toBeNull();
    expect(span).toBeTruthy();
    expect(span.nativeElement.textContent.trim()).toBe('Detalle');
  });
});
