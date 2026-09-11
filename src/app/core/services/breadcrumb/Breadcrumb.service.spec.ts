import { TestBed } from '@angular/core/testing';
import {
  Router,
  NavigationEnd,
  Event as RouterEvent,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  NavigationStart
} from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Observable, Subject } from 'rxjs';

import { BreadcrumbService } from './breadcrumb.service';
import { buildBreadcrumbTrail } from './helpers/breadcrumb-builder.helper';
import { BreadcrumbItem } from '../../interfaces/breadcrumb-item.interface';

// Mockeamos la función helper pura
jest.mock('./helpers/breadcrumb-builder.helper', () => ({
  buildBreadcrumbTrail: jest.fn()
}));

// ── Funciones Fábrica y Tipos Estrictos (Zero 'any', 'unknown', 'as') ────────

const createMockRouteSnapshot = (): ActivatedRouteSnapshot => {
  const dummyParamMap = { has: () => false, get: () => null, getAll: () => [], keys: [] };
  const snapshot: ActivatedRouteSnapshot = {
    url: [],
    params: {},
    queryParams: {},
    fragment: null,
    data: {},
    outlet: 'primary',
    component: null,
    routeConfig: null,
    get root() { return snapshot; },
    parent: null,
    firstChild: null,
    children: [],
    pathFromRoot: [],
    paramMap: dummyParamMap,
    queryParamMap: dummyParamMap,
    title: ''
  };
  return snapshot;
};

interface MockTitleService {
  setTitle: jest.Mock<void, [string]>;
  getTitle: jest.Mock<string, []>;
}

// Usamos Pick e intersecciones para crear un tipo seguro para el Router
type MockRouter = Pick<Router, 'events' | 'url'> & { routerState: { snapshot: RouterStateSnapshot } };

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;

  let mockTitleService: MockTitleService;
  let mockRouter: MockRouter;
  let routerEventsSubject: Subject<RouterEvent>;
  let mockSnapshot: RouterStateSnapshot;

  const buildBreadcrumbTrailMock = jest.mocked(buildBreadcrumbTrail);

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia ante cualquier advertencia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    routerEventsSubject = new Subject<RouterEvent>();

    // Inicialización de Snapshot estructuralmente perfecto sin 'as unknown'
    mockSnapshot = {
      root: createMockRouteSnapshot(),
      url: '/ruta-actual'
    };

    // Inicialización de Router seguro y tipado
    mockRouter = {
      events: routerEventsSubject.asObservable(),
      url: '/ruta-actual',
      routerState: { snapshot: mockSnapshot }
    };

    // Inicialización de Title seguro y tipado
    mockTitleService = {
      setTitle: jest.fn(),
      getTitle: jest.fn()
    };

    // Comportamiento por defecto del helper mockeado
    buildBreadcrumbTrailMock.mockReturnValue([
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
    jest.restoreAllMocks(); // 🧹 Restaurar consola
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
      expect(buildBreadcrumbTrailMock).toHaveBeenCalledWith(mockSnapshot.root);
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
      buildBreadcrumbTrailMock.mockReturnValue([
        { label: 'Ruta Nueva', url: '/ruta-nueva' }
      ]);

      // 3. Actualizamos la referencia interna del snapshot en el Router mockeado
      const newSnapshot: RouterStateSnapshot = {
        root: createMockRouteSnapshot(),
        url: '/ruta-nueva'
      };

      mockRouter.routerState.snapshot = newSnapshot;

      // 4. Emitimos el evento de navegación
      routerEventsSubject.next(new NavigationEnd(1, '/nueva', '/nueva'));

      // 5. Ejecutamos los efectos pendientes de Angular
      TestBed.flushEffects();

      // 6. Verificamos que el signal computed reaccionó al cambio de routerStateSnapshot
      expect(service.breadcrumbs()).toEqual([
        { label: 'Inicio', url: '/' },
        { label: 'Ruta Nueva', url: '/ruta-nueva' }
      ]);
      expect(buildBreadcrumbTrailMock).toHaveBeenCalledWith(newSnapshot.root);
    });

    it('NO debería re-calcular los breadcrumbs con otros eventos del router', () => {
      service.breadcrumbs();
      buildBreadcrumbTrailMock.mockClear();

      // Usamos un evento real de Angular (NavigationStart) en lugar de un casteo inventado 'as unknown'
      routerEventsSubject.next(new NavigationStart(1, '/test'));

      TestBed.flushEffects();

      service.breadcrumbs();
      expect(buildBreadcrumbTrailMock).not.toHaveBeenCalled();
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
      // Reemplazamos any[] por tipado estricto
      const emittedBreadcrumbs: BreadcrumbItem[][] = [];

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
