import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, Event as RouterEvent, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';

import { BreadcrumbService } from './breadcrumb.service';
import { buildBreadcrumbTrail } from './helpers/breadcrumb-builder.helper';

// Mockeamos la función helper pura
jest.mock('./helpers/breadcrumb-builder.helper', () => ({
  buildBreadcrumbTrail: jest.fn()
}));

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;

  let mockTitleService: jest.Mocked<Title>;
  let mockRouter: Partial<Router>;
  let routerEventsSubject: Subject<RouterEvent>;
  let mockSnapshot: RouterStateSnapshot;

  beforeEach(() => {
    routerEventsSubject = new Subject<RouterEvent>();

    mockSnapshot = { root: {} as ActivatedRouteSnapshot } as RouterStateSnapshot;

    mockRouter = {
      events: routerEventsSubject.asObservable(),
      url: '/ruta-actual',
      routerState: { snapshot: mockSnapshot } as unknown as Router['routerState']
    };

    mockTitleService = {
      setTitle: jest.fn(),
      getTitle: jest.fn()
    } as unknown as jest.Mocked<Title>;

    // Comportamiento por defecto del helper mockeado
    (buildBreadcrumbTrail as jest.Mock).mockReturnValue([
      { label: 'Ruta 1', url: '/ruta-1' }
    ]);

    TestBed.configureTestingModule({
      providers: [
        BreadcrumbService,
        { provide: Router, useValue: mockRouter },
        { provide: Title, useValue: mockTitleService }
      ]
    });

    service = TestBed.inject(BreadcrumbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Signals Computed', () => {
    it('debería crearse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería generar los breadcrumbs iniciales con "Inicio" y el resultado del helper', () => {
      const breadcrumbs = service.breadcrumbs();

      expect(breadcrumbs).toEqual([
        { label: 'Inicio', url: '/' },
        { label: 'Ruta 1', url: '/ruta-1' }
      ]);
      expect(buildBreadcrumbTrail).toHaveBeenCalledWith(mockSnapshot.root);
    });

    it('debería añadir el dynamicLabel al final de los breadcrumbs si está presente', () => {
      service.setDynamicBreadcrumb('Detalle Extra');

      const breadcrumbs = service.breadcrumbs();

      expect(breadcrumbs).toEqual([
        { label: 'Inicio', url: '/' },
        { label: 'Ruta 1', url: '/ruta-1' },
        { label: 'Detalle Extra', url: '/ruta-actual' }
      ]);
    });
  });

  describe('Manejo del Título del Navegador', () => {
    it('debería actualizar el estado y llamar a Title.setTitle si el título no es null', () => {
      service.setDynamicTitle('Nuevo Título');

      expect(service.dynamicTitle()).toBe('Nuevo Título');
      expect(mockTitleService.setTitle).toHaveBeenCalledWith('Nuevo Título');
    });

    it('debería actualizar el estado pero NO llamar a Title.setTitle si es null', () => {
      service.setDynamicTitle(null);

      expect(service.dynamicTitle()).toBeNull();
      expect(mockTitleService.setTitle).not.toHaveBeenCalled();
    });
  });

  describe('Métodos de Fachada (setPageContext y clearPageContext)', () => {
    it('setPageContext debería actualizar el breadcrumb dinámico y el título', () => {
      service.setPageContext('Mi Breadcrumb', 'Mi Título');

      expect(service.breadcrumbs()[2]).toEqual({ label: 'Mi Breadcrumb', url: '/ruta-actual' });
      expect(service.dynamicTitle()).toBe('Mi Título');
      expect(mockTitleService.setTitle).toHaveBeenCalledWith('Mi Título');
    });

    it('clearPageContext debería limpiar tanto el breadcrumb como el título', () => {
      service.setPageContext('Mi Breadcrumb', 'Mi Título');

      service.clearPageContext();

      expect(service.breadcrumbs()).toHaveLength(2); // Vuelve al estado base (Inicio + Helper)
      expect(service.dynamicTitle()).toBeNull();
    });

    it('clearDynamicBreadcrumb debería remover solo el breadcrumb dinámico', () => {
      service.setDynamicBreadcrumb('Algo dinámico');
      service.clearDynamicBreadcrumb();

      expect(service.breadcrumbs()).toHaveLength(2);
    });
  });

  describe('Reactividad con Eventos del Router (toSignal)', () => {
    it('debería re-calcular los breadcrumbs cuando ocurre un NavigationEnd', () => {
      // 1. Lectura inicial
      service.breadcrumbs();

      // 2. Cambiamos el retorno del helper mockeado
      (buildBreadcrumbTrail as jest.Mock).mockReturnValue([
        { label: 'Ruta Nueva', url: '/ruta-nueva' }
      ]);

      // 3. Actualizamos la referencia interna del snapshot en el Router mockeado
      const newSnapshot = { root: {} as ActivatedRouteSnapshot } as RouterStateSnapshot;
      if (mockRouter.routerState) {
        mockRouter.routerState.snapshot = newSnapshot;
      }

      // 4. Emitimos el evento de navegación
      routerEventsSubject.next(new NavigationEnd(1, '/nueva', '/nueva'));

      // 5. Ejecutamos los efectos pendientes de Angular
      TestBed.flushEffects();

      // 6. Verificamos que el signal computed reaccionó al cambio de routerStateSnapshot
      expect(service.breadcrumbs()).toEqual([
        { label: 'Inicio', url: '/' },
        { label: 'Ruta Nueva', url: '/ruta-nueva' }
      ]);
      expect(buildBreadcrumbTrail).toHaveBeenCalledWith(newSnapshot.root);
    });

    it('NO debería re-calcular los breadcrumbs con otros eventos del router', () => {
      service.breadcrumbs();
      (buildBreadcrumbTrail as jest.Mock).mockClear();

      // Emitimos un evento que NO es NavigationEnd
      routerEventsSubject.next({ id: 1, url: '/test' } as unknown as RouterEvent);

      TestBed.flushEffects();

      service.breadcrumbs();
      expect(buildBreadcrumbTrail).not.toHaveBeenCalled();
    });
  });

  describe('Retrocompatibilidad (toObservable)', () => {
    it('debería emitir valores a través de dynamicTitle$ cuando el signal cambia', () => {
      const emittedTitles: (string | null)[] = [];

      const sub = service.dynamicTitle$.subscribe((title) => {
        emittedTitles.push(title);
      });

      // Flusheamos para registrar el valor inicial emitido por toObservable (null)
      TestBed.flushEffects();

      // Actualizamos el signal
      service.setDynamicTitle('Observable Test');

      // Flusheamos nuevamente para procesar la emisión del efecto
      TestBed.flushEffects();

      expect(emittedTitles).toEqual([null, 'Observable Test']);

      sub.unsubscribe();
    });

    it('debería emitir valores a través de breadcrumbs$ cuando los breadcrumbs cambian', () => {
      const emittedBreadcrumbs: any[] = [];

      const sub = service.breadcrumbs$.subscribe((items) => {
        emittedBreadcrumbs.push(items);
      });

      TestBed.flushEffects();

      service.setDynamicBreadcrumb('Página Dinámica');
      TestBed.flushEffects();

      expect(emittedBreadcrumbs).toHaveLength(2);
      expect(emittedBreadcrumbs[1]).toContainEqual({
        label: 'Página Dinámica',
        url: '/ruta-actual'
      });

      sub.unsubscribe();
    });
  });
});
