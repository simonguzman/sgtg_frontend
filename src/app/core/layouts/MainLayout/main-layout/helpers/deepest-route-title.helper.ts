import { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Recorre el snapshot GLOBAL de rutas (router.routerState.snapshot.root)
 * hasta el nodo más profundo y devuelve su `title` estático.
 *
 * IMPORTANTE: recibe el snapshot raíz del Router, NO el ActivatedRoute
 * inyectado en el componente. Mismo patrón que ya usa
 * BreadcrumbService.buildBreadcrumbTrail — el snapshot global refleja el
 * árbol de rutas ya completamente resuelto (incluyendo módulos lazy),
 * mientras que el ActivatedRoute propio de un componente padre puede
 * tener nodos hijos cuyo .snapshot aún no se ha asignado en el momento
 * de la construcción del padre (el Router activa outlets de arriba hacia
 * abajo: el hijo recibe su snapshot después de que el padre ya existe).
 */
export function getDeepestRouteTitle(root: ActivatedRouteSnapshot | null): string {
  let current = root;
  while (current?.firstChild) {
    current = current.firstChild;
  }
  return current?.title ?? 'Inicio';
}
