/* tslint:disable:no-unused-variable */

import { TestBed } from '@angular/core/testing';
import { BreadcrumbService } from './breadcrumb.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

describe('Service: Breadcrumb', () => {
  let service: BreadcrumbService;
  let routerEventsSubject: Subject<any>;
  let mockRouter: any;

 beforeEach(() => {
    routerEventsSubject = new Subject<any>();

    // Mock con la estructura completa que espera el servicio
    mockRouter = {
      events: routerEventsSubject.asObservable(),
      routerState: {
        snapshot: {
          root: {
            url: [], // La raíz suele tener URL vacía
            data: {},
            firstChild: {
              url: [{ path: 'dashboard' }], // Ahora es un array de objetos con 'path'
              data: { breadcrumb: 'Panel Principal' },
              firstChild: {
                url: [{ path: 'propuestas' }],
                data: { breadcrumb: 'Gestión de Propuestas' },
                firstChild: null
              }
            }
          }
        }
      }
    };

    TestBed.configureTestingModule({
      providers: [
        BreadcrumbService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(BreadcrumbService);
  });
  it('Debe ser creado', () => {
    expect(service).toBeTruthy();
  });

  it('Debe iniciar con una lista de breadcrumbs vacía (o solo Inicio si no hay navegación)', (done) => {
    service.breadcrumbs$.subscribe(breadcrumbs => {
      // Al inicio, antes de cualquier NavigationEnd, el BehaviorSubject emite []
      expect(breadcrumbs).toEqual([]);
      done();
    });
  });

  it('Debe construir el rastro de migas de pan tras una navegación exitosa', (done) => {
    // 1. Disparamos el evento de navegación finalizada
    routerEventsSubject.next(new NavigationEnd(1, '/dashboard/propuestas', '/dashboard/propuestas'));

    // 2. Verificamos que procesó el árbol de rutas definido en el mockRouter
    service.breadcrumbs$.subscribe(breadcrumbs => {
      expect(breadcrumbs.length).toBe(3); // Inicio + Panel Principal + Gestión de Propuestas

      expect(breadcrumbs[0]).toEqual({ label: 'Inicio', url: '/' });
      expect(breadcrumbs[1]).toEqual({ label: 'Panel Principal', url: '/dashboard' });
      expect(breadcrumbs[2]).toEqual({ label: 'Gestión de Propuestas', url: '/dashboard/propuestas' });

      done();
    });
  });

  it('Debe omitir segmentos de ruta que no tengan la propiedad data.breadcrumb', (done) => {
    // Modificamos el mock para que una ruta no tenga breadcrumb
    mockRouter.routerState.snapshot.root.firstChild.data = {}; // Panel Principal ya no tiene label

    routerEventsSubject.next(new NavigationEnd(2, '/dashboard/propuestas', '/dashboard/propuestas'));

    service.breadcrumbs$.subscribe(breadcrumbs => {
      // Debería tener Inicio (default) y Gestión de Propuestas, saltándose el Dashboard
      expect(breadcrumbs.length).toBe(2);
      expect(breadcrumbs[1].label).toBe('Gestión de Propuestas');
      done();
    });
  });
});
