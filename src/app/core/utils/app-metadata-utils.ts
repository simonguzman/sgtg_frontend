/**
 * Versión actual de la aplicación.
 * Utilizada como metadato institucional en los componentes de la interfaz.
 */
export const APP_VERSION = '1.0.0';

/**
 * Obtiene el año actual basado en la fecha del sistema local.
 *
 * @returns El año actual en formato de cuatro dígitos (YYYY).
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}
