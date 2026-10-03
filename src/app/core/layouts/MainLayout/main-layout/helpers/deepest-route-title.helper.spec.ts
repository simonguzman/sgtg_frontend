import { ActivatedRouteSnapshot, ParamMap } from '@angular/router';
import { getDeepestRouteTitle } from './deepest-route-title.helper';

const createMockRouteSnapshot = (
  title?: string,
  firstChild: ActivatedRouteSnapshot | null = null
): ActivatedRouteSnapshot => {
  const dummyParamMap: ParamMap = { has: () => false, get: () => null, getAll: () => [], keys: [] };

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
    firstChild,
    children: firstChild ? [firstChild] : [],
    pathFromRoot: [],
    paramMap: dummyParamMap,
    queryParamMap: dummyParamMap,
    title
  };
  return snapshot;
};

describe('getDeepestRouteTitle Helper', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Comportamiento y Manejo de Nulos', () => {
    it('debería retornar "Inicio" si el root es null', () => {
      expect(getDeepestRouteTitle(null)).toBe('Inicio');
    });

    it('debería retornar "Inicio" si el nodo más profundo no tiene título', () => {
      const root = createMockRouteSnapshot(undefined, null);
      expect(getDeepestRouteTitle(root)).toBe('Inicio');
    });

    it('debería retornar el título del nodo raíz si no hay hijos', () => {
      const root = createMockRouteSnapshot('Dashboard');
      expect(getDeepestRouteTitle(root)).toBe('Dashboard');
    });
  });

  describe('Recorrido Jerárquico del Árbol de Rutas', () => {
    it('debería navegar hasta el nodo más profundo y retornar su título', () => {
      const deepestChild = createMockRouteSnapshot('Crear Propuesta');
      const middleChild = createMockRouteSnapshot('Propuestas', deepestChild);
      const root = createMockRouteSnapshot('Inicio', middleChild);
      expect(getDeepestRouteTitle(root)).toBe('Crear Propuesta');
    });

    it('debería retornar el título del nodo más profundo incluso si los padres no tienen título', () => {
      const deepestChild = createMockRouteSnapshot('Detalle');
      const middleChild = createMockRouteSnapshot(undefined, deepestChild);
      const root = createMockRouteSnapshot(undefined, middleChild);
      expect(getDeepestRouteTitle(root)).toBe('Detalle');
    });
  });
});
