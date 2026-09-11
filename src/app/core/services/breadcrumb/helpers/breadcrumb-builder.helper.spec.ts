import { ActivatedRouteSnapshot, Data, ParamMap, UrlSegment } from '@angular/router';
import { buildBreadcrumbTrail } from './breadcrumb-builder.helper';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown', 'as') ─────

/**
 * Crea un mock exacto de ActivatedRouteSnapshot sin recurrir a type casting.
 * Utiliza un getter para resolver la referencia circular de `root` nativamente.
 */
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
    get root() { return snapshot; }, // ← Resolución circular estricta sin casteos
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('buildBreadcrumbTrail (Helper Puro)', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva, estándar del proyecto
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Casos Base y Manejo de Nulos', () => {
    it('debería retornar un array vacío si la ruta enviada es null', () => {
      expect(buildBreadcrumbTrail(null)).toEqual([]);
    });
  });

  describe('Construcción Jerárquica', () => {
    it('debería construir la jerarquía de breadcrumbs acumulando la URL correctamente', () => {
      // Usamos la fábrica anidada para crear el árbol de forma legible y 100% Type-Safe
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
      // El nodo 'admin' no tiene label (undefined), pero 'configuracion' sí
      const mockSnapshot = createMockRouteSnapshot(['admin'], undefined,
        createMockRouteSnapshot(['configuracion'], 'Configuración')
      );

      const result = buildBreadcrumbTrail(mockSnapshot);

      // Debe omitir 'admin' del array resultado, pero mantener la URL acumulada
      expect(result).toEqual([
        { label: 'Configuración', url: '/admin/configuracion' }
      ]);
    });
  });
});
