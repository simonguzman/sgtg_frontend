import { inject, Injectable, NgZone } from '@angular/core';

/** Minutos sin actividad tras los que se cierra la sesión. */
export const MINUTOS_INACTIVIDAD = 30;
const INACTIVIDAD_MAXIMA_MS = MINUTOS_INACTIVIDAD * 60_000;
/** Cada cuánto se revisa si la sesión quedó inactiva. */
const INTERVALO_REVISION_MS = 30_000;
/** La actividad se guarda como máximo una vez en este intervalo (no en cada movimiento del mouse). */
const INTERVALO_REGISTRO_MS = 10_000;
const EVENTOS_DE_ACTIVIDAD = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart', 'mousemove'];
export const CLAVE_ULTIMA_ACTIVIDAD = 'sgtg_ultima_actividad';

/**
 * Cierra la sesión tras {@link MINUTOS_INACTIVIDAD} minutos sin actividad del
 * usuario (mouse, teclado, desplazamiento). La última actividad se guarda en
 * localStorage: se comparte entre pestañas y cuenta también el tiempo con el
 * navegador cerrado.
 */
@Injectable({ providedIn: 'root' })
export class SessionInactivityService {
  private readonly zone = inject(NgZone);
  private readonly registrar = () => this.registrarActividad();
  private ultimoRegistro = 0;
  private revision?: ReturnType<typeof setInterval>;
  private alInactivar?: () => void;

  /**
   * Empieza a vigilar la sesión (al iniciarla o al recuperarla al abrir la
   * aplicación). Si ya llevaba el tiempo máximo sin actividad, se cierra enseguida.
   */
  iniciar(alInactivar: () => void): void {
    this.dejarDeVigilar();
    this.alInactivar = alInactivar;
    if (ultimaActividad() === null) this.registrarActividad(true);
    // Fuera de Angular: los eventos y la revisión periódica no disparan la detección de cambios
    this.zone.runOutsideAngular(() => {
      EVENTOS_DE_ACTIVIDAD.forEach(evento =>
        document.addEventListener(evento, this.registrar, { capture: true, passive: true }));
      this.revision = setInterval(() => this.revisar(), INTERVALO_REVISION_MS);
      setTimeout(() => this.revisar());
    });
  }

  /** Deja de vigilar y olvida la actividad (al cerrar la sesión). */
  detener(): void {
    this.dejarDeVigilar();
    this.alInactivar = undefined;
    localStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD);
  }

  private dejarDeVigilar(): void {
    EVENTOS_DE_ACTIVIDAD.forEach(evento => document.removeEventListener(evento, this.registrar, { capture: true }));
    clearInterval(this.revision);
    this.revision = undefined;
  }

  private registrarActividad(forzar = false): void {
    const ahora = Date.now();
    if (!forzar && ahora - this.ultimoRegistro < INTERVALO_REGISTRO_MS) return;
    this.ultimoRegistro = ahora;
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(ahora));
  }

  private revisar(): void {
    const alInactivar = this.alInactivar;
    if (!alInactivar) return;
    const ultima = ultimaActividad();
    // Otra pestaña cerró la sesión y borró la actividad: se empieza a contar de nuevo
    if (ultima === null) {
      this.registrarActividad(true);
      return;
    }
    if (Date.now() - ultima < INACTIVIDAD_MAXIMA_MS) return;
    this.detener();
    this.zone.run(alInactivar);
  }
}

function ultimaActividad(): number | null {
  const valor = Number(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD));
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}
