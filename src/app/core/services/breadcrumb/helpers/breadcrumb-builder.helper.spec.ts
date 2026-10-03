import { ActivatedRouteSnapshot, Data, ParamMap, UrlSegment } from '@angular/router';
import { buildBreadcrumbTrail } from './breadcrumb-builder.helper';

const createMockRouteSnapshot = (
  paths: string[],
  breadcrumb?: string,
  firstChild: ActivatedRouteSnapshot | null = null
): ActivatedRouteSnapshot => {
  const dummyParamMap: ParamMap = { has: () => false, get: () => null, getAll: () => [], keys: [] };
  const data: Data = breadcrumb ? { breadcrumb } : {};

  const snapshot: ActivatedRouteSnapshot = {
    url: paths.map(path => new UrlSegment(path, {})),
    params: {},
    queryParams: {},
    fragment: null,
    data,
    outlet: 'primary',
    component: null,
    routeConfig: null,
    get root() { return snapshot; },
    parent: null,
    firstChild,
    children: firstChild ? [firstChild] : [],
    pathFromRoot: [],
    paramMap: dummyParamMap,
    queryParamMap: dummyParamMap,
    title: ''
  };

  return snapshot;
};

describe('buildBreadcrumbTrail (Helper Puro)', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Casos Base y Manejo de Nulos', () => {
    it('debería retornar un array vacío si la ruta enviada es null', () => {
      expect(buildBreadcrumbTrail(null)).toEqual([]);
    });
  });

  describe('Construcción Jerárquica', () => {
    it('debería construir la jerarquía de breadcrumbs acumulando la URL correctamente', () => {
      const mockSnapshot = createMockRouteSnapshot(['dashboard'], 'Panel Principal',
        createMockRouteSnapshot(['usuarios'], 'Lista de Usuarios',
          createMockRouteSnapshot(['123'], 'Detalle Usuario')
        )
      );
      const result = buildBreadcrumbTrail(mockSnapshot);
      expect(result).toEqual([
        { label: 'Panel Principal', url: '/dashboard' },
        { label: 'Lista de Usuarios', url: '/dashboard/usuarios' },
        { label: 'Detalle Usuario', url: '/dashboard/usuarios/123' }
      ]);
    });

    it('debería omitir nodos del árbol que no tengan la propiedad breadcrumb en data', () => {
      const mockSnapshot = createMockRouteSnapshot(['admin'], undefined,
        createMockRouteSnapshot(['configuracion'], 'Configuración')
      );
      const result = buildBreadcrumbTrail(mockSnapshot);
      expect(result).toEqual([
        { label: 'Configuración', url: '/admin/configuracion' }
      ]);
    });
  });
});
