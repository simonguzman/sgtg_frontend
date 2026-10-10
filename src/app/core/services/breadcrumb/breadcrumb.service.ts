import { inject, Injectable, signal, computed, Signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterStateSnapshot } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, map } from 'rxjs';
import { BreadcrumbItem } from '../../interfaces/breadcrumb-item.interface';
import { buildBreadcrumbTrail } from './helpers/breadcrumb-builder.helper';

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);

  /**
   * Snapshot GLOBAL de rutas, actualizado en cada NavigationEnd.
   *
   * ← FIX: el tipo se declara como anotación de la PROPIEDAD
   * (`: Signal<RouterStateSnapshot>`), no como parámetro genérico
   * explícito de toSignal(). Pasar `toSignal<RouterStateSnapshot>(...)`
   * fija manualmente solo uno de los dos genéricos internos de toSignal
   * (el del observable), rompiendo la inferencia normal del tipo de
   * `initialValue` y forzando al compilador a un overload donde ese
   * valor debía ser `undefined`. Sin el genérico explícito, TypeScript
   * infiere ambos tipos correctamente a partir de los argumentos reales
   * — igual que en la versión original que sí compilaba — y la
   * anotación de propiedad documenta el tipo público sin interferir
   * con esa inferencia.
   */
  readonly routerStateSnapshot: Signal<RouterStateSnapshot> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.routerState.snapshot)
    ),
    { initialValue: this.router.routerState.snapshot }
  );

  private readonly dynamicLabel = signal<string | null>(null);
  private readonly dynamicTitleState = signal<string | null>(null);

  readonly dynamicTitle = this.dynamicTitleState.asReadonly();

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const generated = buildBreadcrumbTrail(this.routerStateSnapshot().root);
    const trail: BreadcrumbItem[] = [{ label: 'Inicio', url: '/' }, ...generated];

    const label = this.dynamicLabel();
    if (label) {
      trail.push({ label, url: this.router.url });
    }
    return trail;
  });

  readonly breadcrumbs$ = toObservable(this.breadcrumbs);
  readonly dynamicTitle$ = toObservable(this.dynamicTitle);

  setDynamicBreadcrumb(label: string | null): void {
    this.dynamicLabel.set(label);
  }

  setDynamicTitle(title: string | null): void {
    this.dynamicTitleState.set(title);
    if (title) {
      this.titleService.setTitle(title);
    }
  }

  clearDynamicBreadcrumb(): void {
    this.dynamicLabel.set(null);
  }

  setPageContext(breadcrumbLabel: string, pageTitle: string): void {
    this.setDynamicBreadcrumb(breadcrumbLabel);
    this.setDynamicTitle(pageTitle);
  }

  clearPageContext(): void {
    this.clearDynamicBreadcrumb();
    this.setDynamicTitle(null);
  }
}
