import { ActivatedRouteSnapshot } from '@angular/router';

export function getDeepestRouteTitle(root: ActivatedRouteSnapshot | null): string {
  let current = root;
  while (current?.firstChild) {
    current = current.firstChild;
  }
  return current?.title ?? 'Inicio';
}
