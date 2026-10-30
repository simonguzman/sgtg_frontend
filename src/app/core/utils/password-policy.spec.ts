import { FormControl } from '@angular/forms';
import { isPasswordPredecible, PASSWORD_REQUIREMENTS, passwordPolicyValidator } from './password-policy';

const DATOS = ['ana.perez@unicauca.edu.co', '1061234567'];

describe('password-policy (igual que PoliticaPassword del backend)', () => {
  const validar = (password: string, datos: string[] = DATOS) =>
    passwordPolicyValidator(() => datos)(new FormControl(password));

  it('acepta una contraseña con minúscula, mayúscula, número y símbolo', () => {
    expect(validar('Clave123*')).toBeNull();
    expect(validar('Montaña verde 7!')).toBeNull();
  });

  it('un campo vacío lo deja a Validators.required', () => {
    expect(validar('')).toBeNull();
  });

  it.each(['Cort1*', 'sinmayuscula1*', 'SINMINUSCULA1*', 'SinNumero**', 'SinSimbolo123', ' Clave123*', 'Clave123* '])(
    'rechaza %p por formato', password => {
      expect(validar(password)).toEqual({ passwordPolicy: true });
    });

  it('limita la longitud a 64 caracteres y 72 bytes (BCrypt)', () => {
    const sesentaYCuatro = 'Aa1*' + 'x'.repeat(60);
    expect(validar(sesentaYCuatro)).toBeNull();
    expect(validar(sesentaYCuatro + 'x')).toEqual({ passwordPolicy: true });
    expect(validar('Aa1*' + 'ñ'.repeat(60))).toEqual({ passwordPolicy: true });
  });

  it.each(['Ana.Perez1*', 'Clave1061234567*', 'MiPassword1*', 'Contraseña1*', 'Unicauca2026*', 'Clave123456*', 'Qwerty12*'])(
    'rechaza %p por fácil de adivinar', password => {
      expect(validar(password)).toEqual({ passwordPredecible: true });
    });

  it('las partes cortas del correo o del documento no cuentan', () => {
    expect(isPasswordPredecible('Clave123*', ['cla@unicauca.edu.co', '123'])).toBe(false);
    expect(isPasswordPredecible('Clave123*', [null, undefined])).toBe(false);
  });

  it('cada requisito se puede revisar por separado para mostrarlo', () => {
    const cumplidos = PASSWORD_REQUIREMENTS.map(requisito => requisito.cumple('abc'));
    expect(cumplidos).toEqual([false, true, false, false, false, true]);
  });
});
