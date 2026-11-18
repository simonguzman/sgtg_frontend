import { ActivatedRouteSnapshot } from '@angular/router';
import { BreadcrumbItem } from '../../../interfaces/breadcrumb-item.interface';

/**
 * Recorre la ruta activa de la raíz a la hoja y arma una miga por cada ruta con `data.breadcrumb`, con la URL
 * acumulada hasta ella.
 * @param route ruta desde la que se recorre
 * @param parentUrl segmentos de URL de las rutas anteriores
 */
export function buildBreadcrumbTrail(
  route: ActivatedRouteSnapshot | null,
  parentUrl: string[] = []
): BreadcrumbItem[] {
  if (!route) return [];

  const routeUrl = parentUrl.concat(route.url.map(segment => segment.path));
  const breadcrumbLabel = route.data?.['breadcrumb'];

  const current: BreadcrumbItem[] = breadcrumbLabel
    ? [{ label: breadcrumbLabel, url: '/' + routeUrl.join('/') }]
    : [];

  return current.concat(buildBreadcrumbTrail(route.firstChild, routeUrl));
}
