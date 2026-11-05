/**
 * Antes de los casos: levanta la copia aislada (desde cero, salvo REUSAR=1) y crea los datos de esta corrida
 * (un departamento, un programa y usuarios propios, con correos que llevan un sufijo al azar).
 */
import * as fs from 'node:fs';
import {
  ADMIN_EMAIL, API, ARCHIVO_DATOS, CLAVE, CLAVE_ASIGNADA, DIRECTO, WEB, api, compose, entornoPruebas, obtenerToken,
  type Datos,
} from './infra';

const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));

async function esperarBackend(): Promise<void> {
  process.stdout.write('Esperando a que la copia aislada responda');
  const fin = Date.now() + 15 * 60_000;
  while (Date.now() < fin) {
    try {
      await fetch(`${DIRECTO}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      // además, que Nginx ya reenvíe al backend
      if ((await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status === 400
        && (await fetch(WEB)).ok) {
        console.log(' lista');
        return;
      }
    } catch {
      // todavía arrancando
    }
    process.stdout.write('.');
    await pausa(5000);
  }
  throw new Error('La copia aislada no respondió a tiempo. Revise: docker compose -p sgtgpruebas logs backend');
}

export default async function preparacion(): Promise<void> {
  const claves = entornoPruebas();
  if (process.env['SIN_LEVANTAR'] !== '1') {
    if (process.env['REUSAR'] !== '1') compose('down', '-v');
    compose('up', '-d', '--build');
  }
  await esperarBackend();
  fs.mkdirSync(process.env['SGTG_RESULTADOS']!, { recursive: true });

  const adminPassword = claves['PRUEBAS_ADMIN_PASSWORD'];
  const adm = await obtenerToken(ADMIN_EMAIL, adminPassword);
  const deps = await api<any[]>(adm, 'GET', '/catalogos/departamentos');
  const dep = deps.find(d => d.nombre === 'Pruebas') ?? await api(adm, 'POST', '/catalogos/departamentos', { nombre: 'Pruebas' });
  const progs = await api<any[]>(adm, 'GET', '/catalogos/programas');
  const prog = progs.find(p => p.nombre === 'Ingeniería de Pruebas')
    ?? await api(adm, 'POST', '/catalogos/programas', { nombre: 'Ingeniería de Pruebas', departamentoId: dep.id });
  const sufijo = 1000 + Math.floor(Math.random() * 9000);
  const azar = (min: number, rango: number) => String(min + Math.floor(Math.random() * rango));

  async function crear(clave: string, nombre: string, apellido: string, roles: string[], perfil: object,
    activar = true): Promise<string> {
    const email = `${clave}.${sufijo}@unicauca.edu.co`;
    await api(adm, 'POST', '/usuarios', {
      codigo: azar(100_000_000, 899_999_999), tipoDocumento: 'CC', numeroDocumento: azar(1_000_000_000, 99_999_999),
      email, password: CLAVE_ASIGNADA, primerNombre: nombre, segundoNombre: '', primerApellido: apellido,
      segundoApellido: 'Pruebas', roles, ...perfil,
    });
    if (activar) {  // primer ingreso: cambia la contraseña asignada por la definitiva
      await api(await obtenerToken(email, CLAVE_ASIGNADA), 'PUT', '/usuarios/me/password',
        { passwordActual: CLAVE_ASIGNADA, passwordNueva: CLAVE });
    }
    return email;
  }

  const estudiante = { programaId: prog.id };
  const docente = { tipoVinculacion: 'PLANTA', departamentoId: dep.id };
  const usuarios: Datos['usuarios'] = {
    estudiante: await crear('laura.estudiante', 'Laura', 'Rojas', ['ESTUDIANTE'], estudiante),
    bloqueo: await crear('maria.bloqueo', 'María', 'Quintero', ['ESTUDIANTE'], estudiante),
    docente: await crear('sandra.docente', 'Sandra', 'Rengifo', ['DOCENTE'], docente),
    politica: await crear('hernan.docente', 'Hernán', 'Gómez', ['DOCENTE'], docente),
    director: await crear('carlos.director', 'Carlos', 'Muñoz', ['DOCENTE'], docente),
    nuevo: await crear('valentina.nueva', 'Valentina', 'Prueba', ['ESTUDIANTE'], estudiante, false),
  };
  const lista = await api<any>(adm, 'GET', '/usuarios');
  const ids = Object.fromEntries((Array.isArray(lista) ? lista : lista.content ?? []).map((u: any) => [u.email, u.id]));
  await api(adm, 'PUT', `/usuarios/${ids[usuarios.director]}/roles`, { roles: ['DOCENTE', 'DIRECTOR'] });

  fs.writeFileSync(ARCHIVO_DATOS(), JSON.stringify({ usuarios, ids, adminPassword } satisfies Datos, null, 1));
  console.log(`Datos de prueba creados. Resultados en: ${process.env['SGTG_RESULTADOS']}`);
}
