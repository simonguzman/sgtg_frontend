import { jwtDebeCambiarPassword, jwtExpiration } from './jwt-utils';
import { crearJwtDePrueba } from '../../testing/jwt-de-prueba';

describe('jwt-utils', () => {
  it('lee el vencimiento (claim exp) en milisegundos', () => {
    const token = crearJwtDePrueba(60);
    const vencimiento = jwtExpiration(token)!;
    expect(vencimiento).toBeGreaterThan(Date.now());
    expect(vencimiento).toBeLessThanOrEqual(Date.now() + 61_000);
  });

  it('soporta caracteres base64url en el contenido', () => {
    const token = crearJwtDePrueba(60, { nombre: '???>>>' });
    expect(jwtExpiration(token)).not.toBeNull();
  });

  it.each(['', 'no-es-jwt', 'a.b', 'a.%%%.c', `${btoa('{}')}.${btoa('{"exp":"mañana"}')}.c`])(
    'devuelve null si el token no es válido: %s', token => {
      expect(jwtExpiration(token)).toBeNull();
    });

  it('indica si el usuario debe cambiar la contraseña asignada (claim cambioPassword)', () => {
    expect(jwtDebeCambiarPassword(crearJwtDePrueba(60, { cambioPassword: true }))).toBe(true);
    expect(jwtDebeCambiarPassword(crearJwtDePrueba(60))).toBe(false);
    expect(jwtDebeCambiarPassword(crearJwtDePrueba(60, { cambioPassword: 'true' }))).toBe(false);
    expect(jwtDebeCambiarPassword('no-es-jwt')).toBe(false);
  });
});
