/**
 * Lectura del token JWT del backend. Solo se decodifica el contenido (payload)
 * para conocer su vencimiento; la firma la valida el backend en cada petición.
 */

/**
 * @param token token JWT
 * @returns fecha de vencimiento en milisegundos (claim `exp`), o null si el
 *          token no tiene el formato esperado
 */
export function jwtExpiration(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(relleno)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
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
