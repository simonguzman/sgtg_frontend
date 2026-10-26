import { inject, Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

/**
 * Páginas visitadas dentro de la aplicación, para que "Regresar" (y el
 * regreso después de guardar un formulario) vuelva a la página anterior real
 * y no a una fija. Si no hay página anterior (se entró por un enlace directo o
 * se recargó la página), cada página usa su navegación de respaldo. Las
 * páginas de inicio de sesión no cuentan como anteriores.
 *
 * Se crea al arrancar la aplicación (`provideAppInitializer`) para registrar
 * desde la primera página.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly visitadas: string[] = [];
  /** La navegación en curso viene del historial del navegador (atrás o adelante) */
  private desdeHistorial = false;
  /** La navegación en curso reemplaza la página actual (`replaceUrl`) */
  private reemplaza = false;

  constructor() {
    this.router.events?.subscribe(evento => {
      if (evento instanceof NavigationStart) {
        this.desdeHistorial = evento.navigationTrigger === 'popstate';
        this.reemplaza = !!this.router.getCurrentNavigation()?.extras.replaceUrl;
      } else if (evento instanceof NavigationEnd) {
        this.registrar(evento.urlAfterRedirects);
      }
    });
  }

  /** ¿Hay una página anterior dentro de la aplicación? */
  hayAnterior(): boolean {
    return this.visitadas.length > 1;
  }

  /**
   * Vuelve a la página anterior; si no la hay, ejecuta la navegación de
   * respaldo de la página (ej. ir a su sección).
   */
  back(respaldo: () => unknown): void {
    if (this.hayAnterior()) this.location.back();
    else respaldo();
  }

  private registrar(url: string): void {
    if (url.startsWith('/auth')) {
      this.visitadas.length = 0;
      return;
    }
    const actual = this.visitadas.at(-1);
    if (this.desdeHistorial && this.visitadas.at(-2) === url) {
      this.visitadas.pop();
    } else if (this.reemplaza && actual !== undefined) {
      this.visitadas[this.visitadas.length - 1] = url;
    } else if (actual !== url) {
      this.visitadas.push(url);
    }
  }
}
