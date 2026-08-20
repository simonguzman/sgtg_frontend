import { ActivatedRouteSnapshot } from '@angular/router';
import { BreadcrumbItem } from '../../../interfaces/breadcrumb-item.interface';

/**
 * Recorre el árbol de rutas activo y construye los breadcrumbs estáticos
 * declarados vía `data: { breadcrumb: '...' }` en cada ruta.
 * Extraído como función pura (antes era un método privado del servicio)
 * porque no depende de ningún servicio de Angular, solo del snapshot de
 * ruta — permite testearla con objetos ActivatedRouteSnapshot simulados,
 * sin TestBed ni mockear Router.
 *
 * Construcción inmutable por concat en vez del acumulador mutable
 * original (breadcrumbs.push(...) sobre un array pasado por referencia
 * entre llamadas recursivas) — mismo resultado, sin el riesgo de mutación
 * compartida de un parámetro con valor por defecto.
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
