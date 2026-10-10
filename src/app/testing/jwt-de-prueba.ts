/**
 * Token JWT de prueba (sin firma válida: el front solo lee su vencimiento).
 *
 * @param segundosParaVencer segundos desde ahora hasta el vencimiento; negativo = ya vencido
 */
export function crearJwtDePrueba(segundosParaVencer = 3600, claims: Record<string, unknown> = {}): string {
  const base64Url = (valor: object) =>
    btoa(JSON.stringify(valor)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + segundosParaVencer;
  return `${base64Url({ alg: 'HS256' })}.${base64Url({ sub: 'test@test.com', exp, ...claims })}.firma`;
}
