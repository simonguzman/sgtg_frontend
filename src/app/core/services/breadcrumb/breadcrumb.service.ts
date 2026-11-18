import { inject, Injectable, signal, computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterStateSnapshot } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, map } from 'rxjs';
import { BreadcrumbItem } from '../../interfaces/breadcrumb-item.interface';
import { buildBreadcrumbTrail } from './helpers/breadcrumb-builder.helper';

/**
 * Migas de pan y título de la página: se arman con el `data.breadcrumb` de las rutas activas, y las páginas
 * de detalle agregan al final una miga y un título propios (por ejemplo, el título del trabajo).
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);

  /** Estado del enrutador, actualizado al terminar cada navegación. */
  readonly routerStateSnapshot: Signal<RouterStateSnapshot> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.routerState.snapshot)
    ),
    { initialValue: this.router.routerState.snapshot }
  );

  private readonly dynamicLabel = signal<string | null>(null);
  private readonly dynamicTitleState = signal<string | null>(null);

  /** Título propio de la página actual, o null si usa el de la ruta. */
  readonly dynamicTitle = this.dynamicTitleState.asReadonly();

  /** Migas de la página actual: Inicio, las de las rutas activas y la miga propia de la página. */
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const generated = buildBreadcrumbTrail(this.routerStateSnapshot().root);
    const trail: BreadcrumbItem[] = [{ label: 'Inicio', url: '/' }, ...generated];

    const label = this.dynamicLabel();
    if (label) {
      trail.push({ label, url: this.router.url });
    }
    return trail;
  });

  /** Agrega al final de las migas una con el texto indicado; null la quita. */
  setDynamicBreadcrumb(label: string | null): void {
    this.dynamicLabel.set(label);
  }

  /** Fija el título de la página y de la pestaña del navegador. */
  setDynamicTitle(title: string | null): void {
    this.dynamicTitleState.set(title);
    if (title) {
      this.titleService.setTitle(title);
    }
  }

  /** Quita la miga propia de la página. */
  clearDynamicBreadcrumb(): void {
    this.dynamicLabel.set(null);
  }
}
