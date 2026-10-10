import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mensaje para mostrar de un error del backend:
 * - errores de negocio (`Error`): su `message`; los del tipo
 *   "ERROR, ENTITY ALREADY EXISTS, Ya existe…" se limpian del prefijo técnico;
 * - errores de validación (mapa campo → mensaje): los mensajes unidos;
 * - sin conexión u otros: el mensaje por defecto.
 */
export function apiErrorMessage(error: unknown, porDefecto: string): string {
  if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') {
    return porDefecto;
  }
  const cuerpo = error.error as Record<string, unknown>;
  if (typeof cuerpo['message'] === 'string' && cuerpo['message']) {
    return sinPrefijoTecnico(cuerpo['message']);
  }
  const mensajes = Object.values(cuerpo).filter((valor): valor is string => typeof valor === 'string' && !!valor);
  return mensajes.length > 0 ? mensajes.join(' ') : porDefecto;
}

/** "ERROR, ENTITY ALREADY EXISTS, Ya existe…" → "Ya existe…" */
function sinPrefijoTecnico(mensaje: string): string {
  const coincidencia = /^ERROR(?:, [A-Z' ]+)+, (.+)$/.exec(mensaje);
  return coincidencia ? coincidencia[1] : mensaje;
}
