import { inject, Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

/**
 * Páginas de entrada: llevan a una vista de cualquier sección, pero no son
 * parte de su flujo, así que "Regresar" no vuelve a ellas.
 */
const PAGINAS_DE_ENTRADA = ['/notifications'];

const esDeEntrada = (url: string) => PAGINAS_DE_ENTRADA.some(pagina => url.startsWith(pagina));

/**
 * Páginas visitadas dentro de la aplicación, para que "Regresar" (y el
 * regreso después de guardar un formulario) vuelva a la página anterior del
 * flujo y no a una fija. Si no hay página anterior (se entró por un enlace
 * directo o se recargó la página) o la anterior es una página de entrada (ej.
 * se llegó desde una notificación), cada página usa su navegación de respaldo:
 * la vista anterior del flujo de su sección. Las páginas de inicio de sesión no
 * cuentan como anteriores.
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
  /** La navegación en curso reemplaza la página actual (`replaceUrl` o regreso por respaldo) */
  private reemplaza = false;
  /** La próxima navegación es la de respaldo: la página actual sale de las visitadas */
  private descartarActual = false;

  constructor() {
    this.router.events?.subscribe(evento => {
      if (evento instanceof NavigationStart) {
        this.desdeHistorial = evento.navigationTrigger === 'popstate';
        this.reemplaza = !!this.router.getCurrentNavigation()?.extras.replaceUrl || this.descartarActual;
        this.descartarActual = false;
      } else if (evento instanceof NavigationEnd) {
        this.registrar(evento.urlAfterRedirects);
      }
    });
  }

  /** ¿Hay una página anterior del flujo dentro de la aplicación? */
  hayAnterior(): boolean {
    const anterior = this.visitadas.at(-2);
    return anterior !== undefined && !esDeEntrada(anterior);
  }

  /**
   * Vuelve a la página anterior del flujo; si no la hay, ejecuta la navegación
   * de respaldo de la página (la vista anterior del flujo de su sección). Desde
   * la vista de respaldo, regresar no vuelve a esta página sino a la anterior
   * de aquella.
   */
  back(respaldo: () => unknown): void {
    if (this.hayAnterior()) {
      this.location.back();
      return;
    }
    this.descartarActual = true;
    respaldo();
  }

  private registrar(url: string): void {
    if (url.startsWith('/auth')) {
      this.visitadas.length = 0;
      return;
    }
    const actual = this.visitadas.at(-1);
    if (this.desdeHistorial) {
      // Atrás: sale la página actual. Si no coincide (adelante, o una página que salió por un regreso de
      // respaldo), ya no se sabe qué hay antes: se empieza de nuevo y "Regresar" usa el respaldo
      if (this.visitadas.at(-2) === url) this.visitadas.pop();
      else this.visitadas.splice(0, this.visitadas.length, url);
    } else if (this.reemplaza && actual !== undefined) {
      this.visitadas[this.visitadas.length - 1] = url;
    } else if (actual !== url) {
      this.visitadas.push(url);
    }
  }
}
