import { ActivatedRouteSnapshot } from '@angular/router';

/** @returns el título de la ruta activa más profunda, o "Inicio" si no tiene */
export function getDeepestRouteTitle(root: ActivatedRouteSnapshot | null): string {
  let current = root;
  while (current?.firstChild) {
    current = current.firstChild;
  }
  return current?.title ?? 'Inicio';
}
