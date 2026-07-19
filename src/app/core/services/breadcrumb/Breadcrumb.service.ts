import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';
import { BreadcrumbItem } from '../../interfaces/breadcrumb-item.interface';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private readonly _breadcrumbs$ = new BehaviorSubject<BreadcrumbItem[]>([]);
  readonly breadcrumbs$ = this._breadcrumbs$.asObservable();
  private readonly _dynamicTitle$ = new BehaviorSubject<string | null>(null);
  dynamicTitle$ = this._dynamicTitle$.asObservable();
  private dynamicLabel: string | null = null;

  constructor(private readonly router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.refreshBreadcrumbs();
    });
  }

  setDynamicBreadcrumb(label: string | null): void {
    this.dynamicLabel = label;
    this.refreshBreadcrumbs();
  }

  setDynamicTitle(title: string | null) {
    this._dynamicTitle$.next(title);
  }

  private buildBreadcrumb( route: ActivatedRouteSnapshot, parentUrl: string[] = [], breadcrumbs: BreadcrumbItem[] = [] ): BreadcrumbItem[] {
    if (!route) return breadcrumbs;
    const routeUrl = parentUrl.concat(
      route.url.map(segment => segment.path)
    );
    const breadcrumbLabel = route.data?.['breadcrumb'];
    if (breadcrumbLabel) {
      breadcrumbs.push({
        label: breadcrumbLabel,
        url: '/' + routeUrl.join('/')
      });
    }
    if (route.firstChild) {
      return this.buildBreadcrumb(route.firstChild, routeUrl, breadcrumbs);
    }
    return breadcrumbs;
  }

  private refreshBreadcrumbs(): void {
    const root = this.router.routerState.snapshot.root;
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Inicio', url: '/' }
    ];
    const generated = this.buildBreadcrumb(root);
    breadcrumbs.push(...generated);
    if (this.dynamicLabel) {
      breadcrumbs.push({
        label: this.dynamicLabel,
        url: this.router.url
      });
    }
    this._breadcrumbs$.next(breadcrumbs);
  }

  clearDynamicBreadcrumb(): void {
    this.dynamicLabel = null;
    this.refreshBreadcrumbs();
  }
}
