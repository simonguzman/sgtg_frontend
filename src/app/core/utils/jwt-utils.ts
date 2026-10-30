/**
 * Lectura del token JWT del backend. Solo se decodifica el contenido (payload)
 * para conocer su vencimiento y si el usuario debe cambiar la contraseña; la
 * firma la valida el backend en cada petición.
 */

/** @returns el contenido (claims) del token, o null si no tiene el formato esperado */
function jwtPayload(token: string): Record<string, unknown> | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload: unknown = JSON.parse(atob(relleno));
    return typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/**
 * @param token token JWT
 * @returns fecha de vencimiento en milisegundos (claim `exp`), o null si el
 *          token no tiene el formato esperado
 */
export function jwtExpiration(token: string): number | null {
  const exp = jwtPayload(token)?.['exp'];
  return typeof exp === 'number' ? exp * 1000 : null;
}

/**
 * @param token token JWT
 * @returns true si el usuario debe cambiar la contraseña que le asignó un
 *          administrador antes de usar el sistema (claim `cambioPassword`)
 */
export function jwtDebeCambiarPassword(token: string): boolean {
  return jwtPayload(token)?.['cambioPassword'] === true;
}

/**
 * @param token token JWT
 * @param ahora instante de referencia en milisegundos
 * @returns true si el token tiene vencimiento y aún no ha llegado
 */
export function isJwtVigente(token: string, ahora: number = Date.now()): boolean {
  const vencimiento = jwtExpiration(token);
  return vencimiento !== null && vencimiento > ahora;
}
