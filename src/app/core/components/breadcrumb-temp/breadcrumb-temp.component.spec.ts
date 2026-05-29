/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreadcrumbComponent } from './breadcrumb-temp.component';
import { By } from '@angular/platform-browser';
import { BreadcrumbService } from '../../services/breadcrumb/breadcrumb.service';
import { BehaviorSubject } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;

  // Creamos un Mock del servicio usando un BehaviorSubject para controlar las emisiones
  const breadcrumbsSubject = new BehaviorSubject<{ label: string; url: string }[]>([]);
  const mockBreadcrumbService = {
    breadcrumbs$: breadcrumbsSubject.asObservable()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        provideRouter([]) // Necesario para que [routerLink] no falle
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the correct number of breadcrumbs', () => {
    // 1. Simulamos datos en el observable
    const mockData = [
      { label: 'Inicio', url: '/' },
      { label: 'Propuestas', url: '/propuestas' }
    ];
    breadcrumbsSubject.next(mockData);

    // 2. Forzamos la detección de cambios para el pipe async
    fixture.detectChanges();

    // 3. Verificamos en el DOM
    const listItems = fixture.debugElement.queryAll(By.css('li'));
    expect(listItems.length).toBe(2);
  });

  it('should display the last breadcrumb as a span (not a link)', () => {
    const mockData = [
      { label: 'Home', url: '/' },
      { label: 'Actual', url: '/actual' }
    ];
    breadcrumbsSubject.next(mockData);
    fixture.detectChanges();

    // Buscamos el último elemento li
    const lastLi = fixture.debugElement.queryAll(By.css('li'))[1];
    const link = lastLi.query(By.css('a'));
    const span = lastLi.query(By.css('span'));

    expect(link).toBeNull(); // El último no debe ser enlace
    expect(span.nativeElement.textContent.trim()).toBe('Actual');
  });

  it('should show the separator ">" only between items', () => {
    breadcrumbsSubject.next([
      { label: 'A', url: '/a' },
      { label: 'B', url: '/b' }
    ]);
    fixture.detectChanges();

    const separators = fixture.debugElement.queryAll(By.css('span.mx-2'));
    expect(separators.length).toBe(1); // Solo debe haber uno entre A y B
    expect(separators[0].nativeElement.textContent).toContain('>');
  });
});
