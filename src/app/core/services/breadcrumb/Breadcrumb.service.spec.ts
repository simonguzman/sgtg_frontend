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

jest.mock('./helpers/breadcrumb-builder.helper', () => ({
  buildBreadcrumbTrail: jest.fn()
}));

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

type MockRouter = Pick<Router, 'events' | 'url'> & { routerState: { snapshot: RouterStateSnapshot } };

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;
  let mockTitleService: MockTitleService;
  let mockRouter: MockRouter;
  let routerEventsSubject: Subject<RouterEvent>;
  let mockSnapshot: RouterStateSnapshot;
  const buildBreadcrumbTrailMock = jest.mocked(buildBreadcrumbTrail);

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    routerEventsSubject = new Subject<RouterEvent>();

    mockSnapshot = {
      root: createMockRouteSnapshot(),
      url: '/ruta-actual'
    };

    mockRouter = {
      events: routerEventsSubject.asObservable(),
      url: '/ruta-actual',
      routerState: { snapshot: mockSnapshot }
    };

    mockTitleService = {
      setTitle: jest.fn(),
      getTitle: jest.fn()
    };

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
    jest.restoreAllMocks();
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
      expect(service.breadcrumbs()).toHaveLength(2);
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
      service.breadcrumbs();
      buildBreadcrumbTrailMock.mockReturnValue([
        { label: 'Ruta Nueva', url: '/ruta-nueva' }
      ]);
      const newSnapshot: RouterStateSnapshot = {
        root: createMockRouteSnapshot(),
        url: '/ruta-nueva'
      };
      mockRouter.routerState.snapshot = newSnapshot;
      routerEventsSubject.next(new NavigationEnd(1, '/nueva', '/nueva'));
      TestBed.flushEffects();
      expect(service.breadcrumbs()).toEqual([
        { label: 'Inicio', url: '/' },
        { label: 'Ruta Nueva', url: '/ruta-nueva' }
      ]);
      expect(buildBreadcrumbTrailMock).toHaveBeenCalledWith(newSnapshot.root);
    });

    it('NO debería re-calcular los breadcrumbs con otros eventos del router', () => {
      service.breadcrumbs();
      buildBreadcrumbTrailMock.mockClear();
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
      TestBed.flushEffects();
      service.setDynamicTitle('Observable Test');
      TestBed.flushEffects();
      expect(emittedTitles).toEqual([null, 'Observable Test']);
      sub.unsubscribe();
    });

    it('debería emitir valores a través de breadcrumbs$ cuando los breadcrumbs cambian', () => {
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
