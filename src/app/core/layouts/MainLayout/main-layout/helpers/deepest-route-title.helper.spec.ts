import { ActivatedRouteSnapshot } from '@angular/router';
import { getDeepestRouteTitle } from './deepest-route-title.helper';

// Utilidad local para crear snapshots fuertemente tipados sin usar 'any'
function createMockRouteSnapshot(title?: string, firstChild?: ActivatedRouteSnapshot | null): ActivatedRouteSnapshot {
  return {
    title,
    firstChild: firstChild ?? null
  } as unknown as ActivatedRouteSnapshot;
}

describe('getDeepestRouteTitle Helper', () => {
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
