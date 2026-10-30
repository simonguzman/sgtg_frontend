import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Política de contraseñas, la misma del backend (`PoliticaPassword`). El
 * backend la vuelve a revisar y además impide repetir las últimas 5
 * contraseñas; aquí solo se adelanta para avisar mientras se escribe.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
/** Límite de BCrypt en el backend */
const PASSWORD_MAX_BYTES = 72;
/** Partes del correo o del documento más cortas que esto no se buscan */
const LONGITUD_MINIMA_DATO = 4;
/** Palabras y secuencias que no puede contener (sin tildes y en minúsculas) */
const PALABRAS_COMUNES = ['password', 'contrasena', 'unicauca', 'sgtg', 'qwerty', '123456', 'abcdef'];

/** Bytes de la contraseña en UTF-8 (como la recibe el backend). */
const bytesUtf8 = (texto: string): number => Array.from(texto).reduce((total, caracter) => {
  const codigo = caracter.codePointAt(0) ?? 0;
  return total + (codigo < 0x80 ? 1 : codigo < 0x800 ? 2 : codigo < 0x10000 ? 3 : 4);
}, 0);

export interface PasswordRequirement {
  texto: string;
  cumple: (password: string) => boolean;
}

/** Requisitos de formato, en el orden en que se muestran. */
export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  {
    texto: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    cumple: p => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH
      && bytesUtf8(p) <= PASSWORD_MAX_BYTES
  },
  { texto: 'Una letra minúscula', cumple: p => /\p{Ll}/u.test(p) },
  { texto: 'Una letra mayúscula', cumple: p => /\p{Lu}/u.test(p) },
  { texto: 'Un número', cumple: p => /\p{Nd}/u.test(p) },
  { texto: 'Un símbolo, por ejemplo * . ! #', cumple: p => /[^\p{L}\p{Nd}]/u.test(p) },
  { texto: 'Sin espacios al inicio ni al final', cumple: p => p.length > 0 && p === p.trim() }
];

/** Mensaje cuando la contraseña contiene datos del usuario o palabras comunes. */
export const PASSWORD_PREDECIBLE = 'Es fácil de adivinar: no puede contener el usuario del correo, '
  + 'el número de documento ni palabras como "password", "unicauca" o "123456".';

const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * @param datos correo y número de documento del usuario
 * @returns true si contiene alguno de los datos del usuario o una palabra común
 */
export function isPasswordPredecible(password: string, datos: readonly (string | null | undefined)[] = []): boolean {
  const normalizada = normalizar(password);
  if (PALABRAS_COMUNES.some(palabra => normalizada.includes(palabra))) return true;
  return datos
    .filter((dato): dato is string => !!dato)
    .map(dato => normalizar(dato.split('@')[0]))
    .some(dato => dato.length >= LONGITUD_MINIMA_DATO && normalizada.includes(dato));
}

/**
 * Validador de una contraseña nueva. Un campo vacío es válido (lo exige
 * `Validators.required` cuando corresponde).
 *
 * - `passwordPolicy`: no cumple algún requisito de formato.
 * - `passwordPredecible`: contiene datos del usuario o palabras comunes.
 *
 * @param datos función que da el correo y el documento del usuario al revisar
 */
export function passwordPolicyValidator(
  datos: () => readonly (string | null | undefined)[] = () => []
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value as string | null;
    if (!password) return null;
    if (!PASSWORD_REQUIREMENTS.every(requisito => requisito.cumple(password))) return { passwordPolicy: true };
    if (isPasswordPredecible(password, datos())) return { passwordPredecible: true };
    return null;
  };
}
