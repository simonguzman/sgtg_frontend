/**
 * Los 20 casos de seguridad del Anexo 8 (RNF-02) sobre la copia aislada: interfaz (navegador), API (curl a través
 * de Nginx) y base de datos (MySQL del contenedor). Cada caso verifica las respuestas reales y deja su evidencia.
 *
 * Orden: los inicios de sesión por Nginx cuentan para el límite por IP, así que SEG-08 va casi al final (después
 * de una pausa) y SEG-19 espera a que el límite se libere para entrar como administrador.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test, type Browser, type Page, type TestInfo } from '@playwright/test';
import {
  ADMIN_EMAIL, API, BACKEND, CLAVE, CLAVE_ASIGNADA, FRONT, Transcripcion, WEB, WEB_CONT, api, contenidoToken,
  datos, obtenerToken, sql,
} from './infra';

const NULO = process.platform === 'win32' ? 'NUL' : '/dev/null';
const JSON_H = ['-H', 'Content-Type: application/json'];
const login = (email: string, password: string) => JSON.stringify({ email, password });
const auth = (token: string) => ['-H', `Authorization: Bearer ${token}`];

/** Un caso: su transcripción se guarda (texto e imagen) aunque alguna verificación falle. */
function caso(id: string, nombre: string,
  cuerpo: (t: Transcripcion, ctx: { browser: Browser; page: Page; info: TestInfo }) => Promise<void>): void {
  test(`${id} ${nombre}`, async ({ browser, page }, info) => {
    const t = new Transcripcion(info);
    t.oculto(datos().adminPassword, '********');
    try {
      await cuerpo(t, { browser, page, info });
    } finally {
      await t.guardar(browser, id);
    }
  });
}

/** Captura de la página con una barra arriba que muestra la dirección real en la que quedó. */
async function captura(browser: Browser, page: Page, info: TestInfo, id: string, nombre: string): Promise<void> {
  const png = await page.screenshot();
  const vista = await browser.newPage({ viewport: { width: 1440, height: 866 } });
  await vista.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0">
    <div style="height:56px;background:#dee1e6;display:flex;align-items:center;padding:0 16px">
      <div style="flex:1;height:38px;border-radius:19px;background:#fff;display:flex;align-items:center;padding-left:24px;
        font:22px 'Segoe UI',sans-serif;color:#282828">${page.url()}</div></div>
    <img style="display:block" src="data:image/png;base64,${png.toString('base64')}"></body>`);
  const ruta = path.join(process.env['SGTG_RESULTADOS']!, `${id}_${nombre}.png`);
  await vista.screenshot({ path: ruta });
  await vista.close();
  await info.attach(`${id} ${nombre}`, { path: ruta, contentType: 'image/png' });
}

async function entrar(page: Page, email: string, password: string, esperarSalida = true): Promise<void> {
  await page.goto(`${WEB}/auth/login`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  if (esperarSalida) await page.waitForURL(u => !u.pathname.startsWith('/auth/login'));
  await reposar(page);
}

async function reposar(page: Page, ms = 1500): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => undefined);
  await page.waitForTimeout(ms);
}

const enMenu = async (page: Page, texto: string) => (await page.getByText(texto, { exact: true }).count()) > 0;

// ============================================================================ control de acceso

caso('SEG-01', 'Acceso a vistas internas sin sesión', async (t, { browser, page, info }) => {
  for (const ruta of ['/users', '/thesis-work', '/notifications']) {
    await page.goto(WEB + ruta);
    await reposar(page);
    t.verificar(`sin sesión, ${ruta} lleva al inicio de sesión`, page.url().includes('/auth/login'));
    if (ruta === '/users') await captura(browser, page, info, 'SEG-01', 'sin_sesion');
  }
});

caso('SEG-02', 'Acceso por URL con un rol no autorizado', async (t, { browser, page, info }) => {
  await entrar(page, datos().usuarios.estudiante, CLAVE);
  for (const ruta of ['/users', '/statistics']) {
    await page.goto(WEB + ruta);
    await reposar(page);
    t.verificar(`el estudiante que escribe ${ruta} queda en su bandeja de entrada`, page.url().endsWith('/notifications'));
    if (ruta === '/users') await captura(browser, page, info, 'SEG-02', 'estudiante_users');
  }
});

caso('SEG-03', 'Visibilidad del menú por rol', async (t, { browser, info }) => {
  const { usuarios, adminPassword } = datos();
  const perfiles: [string, string, string, (p: Page) => Promise<boolean>][] = [
    ['estudiante', usuarios.estudiante, CLAVE,
      async p => !(await enMenu(p, 'Usuarios')) && !(await enMenu(p, 'Estadísticas'))],
    ['director', usuarios.director, CLAVE, async p => (await enMenu(p, 'Estadísticas')) && !(await enMenu(p, 'Usuarios'))],
    ['admin', ADMIN_EMAIL, adminPassword, async p => (await enMenu(p, 'Usuarios')) && (await enMenu(p, 'Estadísticas'))],
  ];
  const esperado: Record<string, string> = {
    estudiante: 'el estudiante no ve Usuarios ni Estadísticas en el menú',
    director: 'el director ve Estadísticas pero no Usuarios',
    admin: 'el administrador ve Usuarios y Estadísticas',
  };
  for (const [rol, email, clave, revisar] of perfiles) {
    const contexto = await browser.newContext({ viewport: { width: 1440, height: 810 }, locale: 'es-CO' });
    const p = await contexto.newPage();
    await entrar(p, email, clave);
    t.verificar(esperado[rol], await revisar(p));
    await captura(browser, p, info, 'SEG-03', `menu_${rol}`);
    await contexto.close();
  }
});

caso('SEG-04', 'Consultas al API sin token', async t => {
  t.nota('Consultas al API sin token de acceso');
  for (const ruta of ['/usuarios/gestion', '/trabajos-grado', '/notificaciones']) {
    const r = t.curl([API + ruta]);
    t.verificar(`${ruta} sin token responde 401 sin datos`, r.codigo === 401 && !r.cuerpo.trim());
  }
});

caso('SEG-05', 'Operaciones del API con un rol no autorizado', async t => {
  const est = await obtenerToken(datos().usuarios.estudiante, CLAVE);
  const adm = await obtenerToken(ADMIN_EMAIL, datos().adminPassword);
  t.oculto(est, '$TOKEN_EST');
  t.oculto(adm, '$TOKEN_ADMIN');
  t.nota('Estudiante autenticado intenta operaciones de gestión de usuarios');
  let r = t.curl([...auth(est), `${API}/usuarios/gestion`]);
  t.verificar('el estudiante recibe 403 al consultar la gestión de usuarios', r.codigo === 403);
  const nuevo = {
    codigo: '999', tipoDocumento: 'CC', numeroDocumento: '1099', email: 'nuevo@unicauca.edu.co',
    password: 'Nueva.Clave2026', primerNombre: 'Ana', primerApellido: 'Paz', roles: ['ADMINISTRADOR'],
  };
  r = t.curl(['-X', 'POST', ...auth(est), ...JSON_H, '-d', JSON.stringify(nuevo), `${API}/usuarios`]);
  t.verificar('el estudiante recibe 403 al crear un administrador', r.codigo === 403);
  t.nota('El mismo recurso con el rol de administrador');
  r = t.curl(['-o', NULO, ...auth(adm), `${API}/usuarios/gestion`]);
  t.verificar('el administrador recibe 200', r.codigo === 200);
});

caso('SEG-06', 'Token alterado o falsificado', async t => {
  const est = await obtenerToken(datos().usuarios.estudiante, CLAVE);
  const [cabecera, , firma] = est.split('.');
  const contenido = contenidoToken(est);
  const b64 = (s: string) => Buffer.from(s).toString('base64url');
  const alterado = `${cabecera}.${b64(JSON.stringify({ ...contenido, roles: ['ADMINISTRADOR'] }))}.${firma}`;
  const sinFirma = `${b64('{"alg":"none","typ":"JWT"}')}.${b64(JSON.stringify({ ...contenido, roles: ['ADMINISTRADOR'] }))}.`;
  t.oculto(alterado, '$TOKEN_ALTERADO');
  t.oculto(sinFirma, '$TOKEN_SIN_FIRMA');
  const { sub: _, ...visible } = contenido;
  t.nota(`Contenido del token del estudiante (sin la firma): ${JSON.stringify(visible)}`);
  t.nota('Token con el contenido cambiado (roles → ADMINISTRADOR) y la firma original');
  t.verificar('token alterado rechazado con 401', t.curl([...auth(alterado), `${API}/usuarios/gestion`]).codigo === 401);
  t.nota('Token sin firma ("alg": "none")');
  t.verificar('token sin firma rechazado con 401', t.curl([...auth(sinFirma), `${API}/usuarios/gestion`]).codigo === 401);
  t.nota('Token inventado');
  t.verificar('token inventado rechazado con 401', t.curl([...auth('abc.def.ghi'), `${API}/usuarios/gestion`]).codigo === 401);
});

// ============================================================================ autenticación y sesión

caso('SEG-09', 'Respuestas que no revelan cuentas e inyección SQL', async t => {
  // cuatro rondas: con la quinta el correo registrado quedaría bloqueado (y respondería otro mensaje)
  t.nota('Correo que no existe y contraseña incorrecta de un correo que sí existe (cuatro rondas alternadas)');
  const correos = ['noexiste.nadie@unicauca.edu.co', datos().usuarios.docente];
  const respuestas = new Set<string>();
  const tiempos: number[][] = [[], []];
  for (let ronda = 0; ronda < 4; ronda++) {
    correos.forEach((email, i) => {
      const r = t.curl(['-X', 'POST', ...JSON_H, '-d', login(email, 'Clave.Falsa2026'), `${API}/auth/login`], { tiempo: true });
      respuestas.add(`${r.codigo} ${r.cuerpo.startsWith('{') ? JSON.parse(r.cuerpo).message : r.cuerpo}`);
      const salida = t.entradas[t.entradas.length - 1][1];
      tiempos[i].push(Number(/en ([\d.]+) s/.exec(salida)?.[1] ?? NaN));
      if (ronda > 0) t.entradas.splice(-2, 2, ['>', `   (${ronda + 1}.ª ronda) ${email}: ${salida.split('\n').pop()}`]);
    });
  }
  // la mediana deja de lado una petición aislada que tarde más (por ejemplo, mientras corre una tarea programada)
  const mediana = (v: number[]) => { const o = [...v].sort((a, b) => a - b); return (o[1] + o[2]) / 2; };
  const [m0, m1] = tiempos.map(mediana);
  t.nota(`Mediana del tiempo de respuesta: correo inexistente ${m0.toFixed(2)} s, correo registrado ${m1.toFixed(2)} s`);
  t.verificar('las respuestas son iguales (código y mensaje)', respuestas.size === 1 && [...respuestas][0].startsWith('401'));
  t.verificar('el tiempo de respuesta no revela si el correo existe (medianas a menos de 0,3 s)', Math.abs(m0 - m1) < 0.3);
  t.nota('Intento de inyección SQL en el correo');
  const r = t.curl(['-X', 'POST', ...JSON_H, '-d', login("' OR '1'='1' -- ", 'x'), `${API}/auth/login`]);
  t.verificar('la inyección se rechaza (400 o 401) y no inicia sesión', r.codigo === 400 || r.codigo === 401);
});

caso('SEG-07', 'Bloqueo por intentos fallidos', async (t, { browser, page, info }) => {
  const correo = datos().usuarios.bloqueo;
  t.nota(`Cinco contraseñas incorrectas seguidas para ${correo}`);
  let ultimo = '';
  for (let i = 0; i < 5; i++) {
    ultimo = t.curl(['-X', 'POST', ...JSON_H, '-d', login(correo, `Incorrecta.${i}2026`), `${API}/auth/login`]).cuerpo;
  }
  t.verificar('el quinto fallo bloquea el correo', ultimo.includes('Demasiados intentos'));
  t.nota('Sexto intento, ahora con la contraseña correcta');
  const r = t.curl(['-X', 'POST', ...JSON_H, '-d', login(correo, CLAVE), `${API}/auth/login`]);
  t.verificar('con la contraseña correcta también se rechaza durante el bloqueo',
    r.codigo === 401 && r.cuerpo.includes('Demasiados intentos'));
  await entrar(page, correo, CLAVE, false);
  await page.waitForTimeout(1500);
  t.verificar('la pantalla de inicio de sesión muestra el bloqueo',
    (await page.getByText('Demasiados intentos fallidos', { exact: false }).count()) > 0);
  await captura(browser, page, info, 'SEG-07', 'pantalla_bloqueo');
});

caso('SEG-10', 'Vigencia del token y cookie de renovación', async t => {
  t.nota('Inicio de sesión: cabeceras de la respuesta (cookie de renovación)');
  const r = t.curl(['-i', '-X', 'POST', ...JSON_H, '-d', login(datos().usuarios.docente, CLAVE), `${API}/auth/login`],
    { codigo: false });
  const lineas = r.cuerpo.split('\n');
  const cookie = lineas.find(l => l.toLowerCase().startsWith('set-cookie: sgtg_renovacion')) ?? '';
  // en la evidencia solo quedan la línea de estado y la cookie, sin su valor
  t.salida(`${lineas.find(l => l.startsWith('HTTP')) ?? ''}\n${cookie.replace(/(sgtg_renovacion=)[^;]+/, '$1…')}`);
  for (const atributo of ['HttpOnly', 'Secure', 'SameSite=Strict']) {
    t.verificar(`la cookie de renovación es ${atributo}`, cookie.includes(atributo));
  }
  const token = JSON.parse(r.cuerpo.slice(r.cuerpo.indexOf('{'))).token;
  const { exp, iat } = contenidoToken(token);
  t.nota(`Vigencia del token de acceso: exp − iat = ${exp - iat} s (${(exp - iat) / 60} minutos)`);
  t.verificar('el token de acceso dura 15 minutos', exp - iat === 900);
});

caso('SEG-11', 'Cierre de sesión', async t => {
  const token = await obtenerToken(datos().usuarios.docente, CLAVE);
  t.oculto(token, '$TOKEN');
  t.nota('Cierre de sesión: el token deja de servir aunque no haya vencido');
  t.verificar('antes del cierre el token sirve (200)', t.curl(['-o', NULO, ...auth(token), `${API}/usuarios/me`]).codigo === 200);
  t.verificar('el cierre responde 204', t.curl(['-o', NULO, '-X', 'POST', ...auth(token), `${API}/auth/logout`]).codigo === 204);
  t.verificar('después del cierre el mismo token recibe 401', t.curl([...auth(token), `${API}/usuarios/me`]).codigo === 401);
});

caso('SEG-12', 'Cierre por inactividad', async (t, { browser, page, info }) => {
  await page.clock.install({ time: new Date() });  // reloj controlable para adelantar el tiempo
  await entrar(page, datos().usuarios.docente, CLAVE);
  await captura(browser, page, info, 'SEG-12', 'antes');
  await page.clock.fastForward('31:00');
  await page.waitForTimeout(2500);
  await reposar(page, 500);
  t.verificar('tras 31 minutos sin actividad vuelve al inicio de sesión', page.url().includes('/auth/login'));
  t.verificar('muestra el aviso de sesión cerrada por inactividad',
    (await page.getByText('Sesión cerrada por inactividad').count()) > 0);
  await captura(browser, page, info, 'SEG-12', 'inactividad');
});

// ============================================================================ contraseñas

caso('SEG-13', 'Cambio obligatorio de la contraseña asignada', async (t, { browser, page, info }) => {
  const correo = datos().usuarios.nuevo;
  const token = await obtenerToken(correo, CLAVE_ASIGNADA);
  t.oculto(token, '$TOKEN_NUEVO');
  t.nota(`Usuario creado por el administrador con una contraseña asignada (${correo}).`);
  t.nota('Con esa sesión, antes de cambiar la contraseña:');
  for (const ruta of ['/notificaciones', '/trabajos-grado']) {
    const r = t.curl([...auth(token), API + ruta]);
    t.verificar(`${ruta} responde 403 con GC-0012`, r.codigo === 403 && r.cuerpo.includes('GC-0012'));
  }
  t.nota('Lo único permitido: consultar su perfil y cambiar la contraseña');
  t.verificar('puede consultar su perfil (200)', t.curl(['-o', NULO, ...auth(token), `${API}/usuarios/me`]).codigo === 200);
  await entrar(page, correo, CLAVE_ASIGNADA);
  t.verificar('al iniciar sesión lo lleva a cambiar la contraseña', page.url().includes('/auth/cambiar-password'));
  await page.goto(`${WEB}/notifications`);
  await reposar(page);
  t.verificar('al escribir otra dirección sigue en el cambio de contraseña', page.url().includes('/auth/cambiar-password'));
  await captura(browser, page, info, 'SEG-13', 'cambio_obligatorio');
});

caso('SEG-14', 'Política de contraseñas', async (t, { browser, page, info }) => {
  const token = await obtenerToken(datos().usuarios.politica, CLAVE);
  t.oculto(token, '$TOKEN_D');
  t.nota('Cambio de contraseña con claves que no cumplen la política');
  for (const nueva of ['corta1!', 'sinsimbolos123ABC', 'Unicauca2026*', 'Qwerty.2026x', CLAVE]) {
    if (nueva === CLAVE) t.nota('La misma contraseña actual (no se puede repetir ninguna de las últimas 5)');
    const r = t.curl(['-X', 'PUT', ...auth(token), ...JSON_H, '-d',
      JSON.stringify({ passwordActual: CLAVE, passwordNueva: nueva }), `${API}/usuarios/me/password`]);
    t.verificar(`se rechaza «${t.mostrar(nueva)}» con 400`, r.codigo === 400);
  }
  // en la interfaz: el usuario con contraseña asignada intenta una que no cumple
  await entrar(page, datos().usuarios.nuevo, CLAVE_ASIGNADA);
  const campos = page.locator('input[type=password]');
  await campos.nth(1).fill('valentina2026');
  await campos.nth(2).fill('valentina2026');
  await page.waitForTimeout(800);
  t.verificar('con una contraseña que no cumple la política no se puede enviar el formulario',
    await page.getByRole('button', { name: 'Cambiar contraseña' }).isDisabled());
  await captura(browser, page, info, 'SEG-14', 'formulario');
});

caso('SEG-15', 'Almacenamiento de las contraseñas', async t => {
  t.nota('Contraseñas guardadas en la tabla credenciales (solo el prefijo del hash)');
  t.sqlVisible('SELECT LEFT(password_hash,7) AS algoritmo_y_costo, COUNT(*) AS usuarios FROM credenciales GROUP BY 1');
  const prefijos = new Set(sql('SELECT DISTINCT LEFT(password_hash,7) FROM credenciales').map(f => f[0]));
  t.verificar('todas las contraseñas son BCrypt de costo 12', prefijos.size === 1 && prefijos.has('$2a$12$'));
  const columnas = sql("SHOW COLUMNS FROM users LIKE '%pass%'");
  t.sqlVisible("SHOW COLUMNS FROM users LIKE '%pass%'");
  t.salida(columnas.length ? JSON.stringify(columnas) : '(sin columnas de contraseña en users)');
  t.verificar('la tabla users no tiene columnas de contraseña', columnas.length === 0);
});

// ============================================================================ archivos, cabeceras, auditoría

caso('SEG-16', 'Carga de archivos que no son PDF', async t => {
  const { usuarios, ids } = datos();
  const td = await obtenerToken(usuarios.director, CLAVE);
  t.oculto(td, '$TOKEN_DIR');
  const trabajo = await api(td, 'POST', '/trabajos-grado/investigacion', {
    titulo: 'Trabajo de prueba de seguridad',
    objetivos: ['Probar la carga de archivos', 'Verificar que se rechacen los archivos que no son PDF'],
    estudiantesIds: [ids[usuarios.estudiante]], descripcion: 'Solo para las pruebas de seguridad.',
    lineaInvestigacion: 'Ingeniería de software',
  });
  const ruta = `${API}/trabajos-grado/${trabajo.id}/propuesta`;
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'sgtg-seg-'));
  t.oculto(carpeta + path.sep, '');
  const falso = path.join(carpeta, 'formato_falso.pdf');
  fs.writeFileSync(falso, Buffer.concat([Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
    Buffer.from(' este archivo es un ejecutable renombrado, no un PDF\n')]));
  const exe = path.join(carpeta, 'script.exe');
  fs.writeFileSync(exe, '%PDF-1.7 contenido con firma PDF pero extension .exe\n');
  const grande = path.join(carpeta, 'grande.pdf');
  fs.writeFileSync(grande, Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(70 * 1024 * 1024, '0')]));
  try {
    t.nota('Archivo con extensión .pdf cuyo contenido no es un PDF (empieza con «MZ», no con %PDF-)');
    let r = t.curl([...auth(td), '-F', `archivo=@${falso};type=application/pdf`, ruta]);
    t.verificar('se rechaza con 400 (no es PDF)', r.codigo === 400 && r.cuerpo.includes('PDF'));
    t.nota('Archivo con firma PDF pero con otra extensión');
    r = t.curl([...auth(td), '-F', `archivo=@${exe};type=application/pdf`, ruta]);
    t.verificar('se rechaza con 400 (extensión distinta de .pdf)', r.codigo === 400);
    t.nota('Archivo de 70 MB (el máximo por solicitud es de 65 MB)');
    r = t.curl(['-o', NULO, ...auth(td), '-F', `archivo=@${grande};type=application/pdf`, ruta]);
    t.verificar('se rechaza con 413 (demasiado grande)', r.codigo === 413);
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
});

caso('SEG-17', 'Cabeceras de seguridad', async t => {
  const filtrar = (cab: string, nombres: string[]) => cab.split('\n')
    .filter(l => l.startsWith('HTTP') || nombres.includes(l.split(':')[0].toLowerCase())).join('\n');
  t.nota('Cabeceras de seguridad de la aplicación (Nginx)');
  let cab = t.curl(['-I', `${WEB}/`], { codigo: false }).cuerpo;
  t.salida(filtrar(cab, ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy',
    'permissions-policy', 'server']));
  let baja = cab.toLowerCase();
  for (const nombre of ['content-security-policy', 'x-frame-options: deny', 'x-content-type-options: nosniff',
    'referrer-policy', 'permissions-policy']) {
    t.verificar(`la aplicación envía ${nombre}`, baja.includes(nombre));
  }
  t.verificar('el servidor no revela su versión', !baja.includes('server: nginx/'));
  const adm = await obtenerToken(ADMIN_EMAIL, datos().adminPassword);
  t.oculto(adm, '$TOKEN_ADMIN');
  t.nota('Cabeceras de seguridad de las respuestas del API (Spring Security)');
  cab = t.curl(['-I', ...auth(adm), `${API}/usuarios/me`], { codigo: false }).cuerpo;
  t.salida(filtrar(cab, ['x-frame-options', 'x-content-type-options', 'cache-control', 'pragma']));
  baja = cab.toLowerCase();
  t.verificar('el API envía X-Frame-Options y no-store', baja.includes('x-frame-options: deny') && baja.includes('no-store'));
});

caso('SEG-18', 'Integridad de la auditoría', async t => {
  t.nota('Últimos registros de la auditoría (cada uno sellado y encadenado con el anterior)');
  t.sqlVisible('SELECT secuencia, metodo, LEFT(ruta,40) AS ruta, estado_http, LEFT(sello_anterior,12) AS sello_anterior, '
    + 'LEFT(sello,12) AS sello FROM auditoria WHERE secuencia IS NOT NULL ORDER BY secuencia DESC LIMIT 5');
  const filas = sql('SELECT secuencia, sello_anterior, sello FROM auditoria WHERE secuencia IS NOT NULL '
    + 'ORDER BY secuencia DESC LIMIT 20');
  t.verificar('cada registro guarda el sello del anterior',
    filas.length > 1 && filas.slice(0, -1).every((f, i) => f[1] === filas[i + 1][2]));
  t.nota('Intento de modificar y de borrar un registro directamente en la base de datos');
  t.verificar('la base de datos rechaza la modificación',
    t.sqlVisible('UPDATE auditoria SET estado_http=200 WHERE secuencia=1').includes('ERROR 1644'));
  t.verificar('la base de datos rechaza el borrado',
    t.sqlVisible('DELETE FROM auditoria WHERE secuencia=1').includes('ERROR 1644'));
  t.nota('Verificación programada de la cadena de sellos (recalcula todos los sellos desde el primer registro)');
  // la copia arranca vacía: se espera la primera verificación que ya incluya los registros de las pruebas
  const registros = (l: string) => Number(/Auditoría íntegra: (\d+)/.exec(l)?.[1] ?? 0);
  let linea = '';
  for (const fin = Date.now() + 90_000; Date.now() < fin;) {
    const r = spawnSync('docker', ['logs', BACKEND], { encoding: 'utf8' });
    linea = `${r.stdout}${r.stderr}`.split('\n').reverse().find(l => l.includes('Auditoría íntegra')) ?? '';
    if (registros(linea) > 0) break;
    await new Promise(r => setTimeout(r, 5000));
  }
  t.entradas.push(['$', `docker logs ${BACKEND} 2>&1 | grep "Auditoría íntegra" | tail -1`]);
  t.entradas.push(['>', linea.trim().slice(0, 200)]);
  t.verificar(`la verificación recalcula la cadena y la reporta íntegra (${registros(linea)} registros)`,
    registros(linea) > 0);
});

caso('SEG-20', 'Vulnerabilidades en las dependencias', async t => {
  t.nota('Vulnerabilidades conocidas en las dependencias que se despliegan (FrontEnd)');
  const salida = t.comando('cd sgtg_frontend && npm audit --omit=dev', 'npm audit --omit=dev', [],
    { cwd: FRONT, shell: true });
  t.salida(salida.split('\n').slice(-2).join('\n'));
  t.verificar('0 vulnerabilidades en las dependencias de producción', salida.includes('found 0 vulnerabilities'));
});

// ============================================================================ límite por IP y alertas (al final)

caso('SEG-08', 'Límite de inicios de sesión por IP', async t => {
  // espera a que se libere el límite (los inicios de sesión de los casos anteriores también cuentan)
  await new Promise(r => setTimeout(r, 60_000));
  t.nota('30 intentos de inicio de sesión seguidos desde la misma IP (correos distintos)');
  const codigos: string[] = [];
  for (let i = 1; i <= 30; i++) {
    const r = t.curl(['-o', NULO, '-X', 'POST', ...JSON_H, '-d', login(`prueba${i}@unicauca.edu.co`, 'x'), `${API}/auth/login`]);
    codigos.push(String(r.codigo));
    t.entradas.splice(-2);  // en la evidencia se muestra como un solo ciclo
  }
  t.entradas.push(['$', 'for i in $(seq 1 30); do\n  curl -s -o /dev/null -w "%{http_code} " -X POST '
    + '-H "Content-Type: application/json" \\\n       -d "{\\"email\\":\\"prueba$i@unicauca.edu.co\\",\\"password\\":\\"x\\"}" '
    + '$API/auth/login\ndone; echo']);
  t.entradas.push(['>', codigos.join(' ')]);
  const primero = codigos.indexOf('429');
  t.verificar('Nginx responde 429 cuando se supera el límite', primero >= 0);
  t.verificar('después del primer 429 todos son 429', primero >= 0 && codigos.slice(primero).every(c => c === '429'));
  t.verificar('las primeras peticiones pasan (el límite no afecta el uso normal)', primero >= 10);
  t.nota('Respuesta completa de un intento rechazado por el límite');
  t.curl(['-X', 'POST', ...JSON_H, '-d', login('a@unicauca.edu.co', 'x'), `${API}/auth/login`]);
  t.nota('Registro de accesos de Nginx: las peticiones rechazadas (429) no llegan al backend');
  const log = t.comando(`docker logs ${WEB_CONT} 2>&1 | grep "auth/login" | grep -c '" 429 '`, 'docker', ['logs', WEB_CONT]);
  const cuenta = log.split('\n').filter(l => l.includes('auth/login') && l.includes('" 429 ')).length;
  t.salida(String(cuenta));
  t.verificar('los 429 quedan en el log de Nginx', cuenta > 0);
});

caso('SEG-19', 'Alertas de seguridad', async (t, { browser, page, info }) => {
  t.nota('Alertas generadas por la revisión automática después de los casos SEG-07, SEG-08 y SEG-09');
  let tipos = new Set<string>();
  const fin = Date.now() + 120_000;
  while (Date.now() < fin) {
    tipos = new Set(sql('SELECT DISTINCT tipo FROM alertas_seguridad').map(f => f[0]));
    if (tipos.has('CORREO_BLOQUEADO') && tipos.has('FUERZA_BRUTA_IP')) break;
    await new Promise(r => setTimeout(r, 5000));
  }
  t.sqlVisible('SELECT tipo, clave, LEFT(detalle,70) AS detalle FROM alertas_seguridad ORDER BY id');
  t.verificar('hay alerta de correo bloqueado', tipos.has('CORREO_BLOQUEADO'));
  t.verificar('hay alerta de fuerza bruta desde una IP', tipos.has('FUERZA_BRUTA_IP'));
  // el límite por IP de SEG-08 tarda un minuto en liberarse antes de poder entrar como administrador
  await new Promise(r => setTimeout(r, 65_000));
  await entrar(page, ADMIN_EMAIL, datos().adminPassword);
  await page.goto(`${WEB}/notifications`);
  await reposar(page);
  t.verificar('las alertas llegan a la bandeja de entrada del administrador',
    (await page.getByText('Alerta de seguridad', { exact: false }).count()) > 0);
  await captura(browser, page, info, 'SEG-19', 'bandeja_admin');
});
