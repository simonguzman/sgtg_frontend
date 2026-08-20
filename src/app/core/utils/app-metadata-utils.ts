/**
 * Metadata institucional compartida entre los dos footers del proyecto
 * (FooterComponent del layout principal y AuthFooterComponent del layout
 * de autenticación). Antes cada uno calculaba currentYear/version por su
 * cuenta con la misma lógica exacta — visible ahora que existe una segunda
 * instancia idéntica, no evidente cuando solo había un footer.
 *
 * Se ubica en core/utils (no en un servicio inyectable) porque ninguno de
 * los dos valores depende de estado de Angular ni de inyección — mismo
 * criterio que date-utils.ts ya existente en esta carpeta.
 */
export const APP_VERSION = '1.0.0';

export function getCurrentYear(): number {
  return new Date().getFullYear();
}
