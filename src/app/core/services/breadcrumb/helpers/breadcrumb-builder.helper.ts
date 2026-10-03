import { ActivatedRouteSnapshot } from '@angular/router';
import { BreadcrumbItem } from '../../../interfaces/breadcrumb-item.interface';

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
