/** Después de los casos: detiene la copia aislada (sin borrar sus datos), salvo DEJAR_ARRIBA=1 o SIN_LEVANTAR=1. */
import * as fs from 'node:fs';
import { ARCHIVO_DATOS, compose } from './infra';

export default async function cierre(): Promise<void> {
  // el archivo de datos lleva la contraseña del administrador de la copia: no se deja con la evidencia
  fs.rmSync(ARCHIVO_DATOS(), { force: true });
  if (process.env['DEJAR_ARRIBA'] !== '1' && process.env['SIN_LEVANTAR'] !== '1') compose('stop');
}
