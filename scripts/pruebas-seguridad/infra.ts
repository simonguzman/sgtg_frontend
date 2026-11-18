/**
 * Utilidades de las pruebas de seguridad: la copia aislada en Docker, curl y MySQL de verdad, y la
 * transcripción de cada caso (comandos y salida real) que queda como evidencia.
 */
import { spawnSync } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Browser, type TestInfo } from '@playwright/test';

export const AQUI = __dirname;
export const FRONT = path.resolve(AQUI, '..', '..');
export const COMPOSE = path.join(AQUI, 'docker-compose.pruebas.yml');
export const ARCHIVO_ENV = path.join(AQUI, '.env.pruebas');
export const PROYECTO = 'sgtgpruebas';
export const WEB = 'http://localhost:4220';
/** A través de Nginx, como un usuario real */
export const API = `${WEB}/api/v1/sgtg`;
/** Backend directo: solo para preparar datos y obtener tokens (no cuenta para el límite por IP de Nginx) */
export const DIRECTO = 'http://localhost:8095/api/v1/sgtg';
export const MYSQL = `${PROYECTO}-mysql-1`;
export const BACKEND = `${PROYECTO}-backend-1`;
export const WEB_CONT = `${PROYECTO}-web-1`;
export const ADMIN_EMAIL = 'admin.pruebas@unicauca.edu.co';
/** Contraseña definitiva de los usuarios de prueba */
export const CLAVE = 'Trabajo$Grado84';
/** La que asigna el administrador (obliga a cambiarla) */
export const CLAVE_ASIGNADA = 'Ingreso#Temporal71';

// ------------------------------------------------------------------ copia aislada

/** Claves de la copia aislada: se generan al azar la primera vez y se guardan en .env.pruebas. */
export function entornoPruebas(): Record<string, string> {
  if (!fs.existsSync(ARCHIVO_ENV)) {
    const hex = (n: number) => crypto.randomBytes(n).toString('hex');
    const valores = {
      PRUEBAS_JWT_SECRET: hex(48),
      PRUEBAS_AUDITORIA_CLAVE: hex(32),
      PRUEBAS_MYSQL_PASSWORD: hex(16),
      PRUEBAS_ADMIN_PASSWORD: `Adm.${hex(8)}Q7#`,
    };
    fs.writeFileSync(ARCHIVO_ENV, '# Claves de la copia aislada de pruebas (generadas al azar; no se suben al repositorio)\n'
      + Object.entries(valores).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  }
  const valores: Record<string, string> = {};
  for (const linea of fs.readFileSync(ARCHIVO_ENV, 'utf8').split(/\r?\n/)) {
    if (linea.includes('=') && !linea.startsWith('#')) {
      const i = linea.indexOf('=');
      valores[linea.slice(0, i)] = linea.slice(i + 1);
    }
  }
  return valores;
}

export function compose(...args: string[]): void {
  const r = spawnSync('docker', ['compose', '-p', PROYECTO, '-f', COMPOSE, '--env-file', ARCHIVO_ENV, ...args],
    { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`docker compose ${args.join(' ')} terminó con código ${r.status}`);
}

// ------------------------------------------------------------------ API (preparación)

export async function obtenerToken(email: string, password: string): Promise<string> {
  const r = await fetch(`${DIRECTO}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`login de ${email} -> ${r.status} ${await r.text()}`);
  return (await r.json()).token;
}

export async function api<T = any>(token: string, metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(DIRECTO + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${ruta} -> ${r.status} ${texto.slice(0, 300)}`);
  return (texto ? JSON.parse(texto) : null) as T;
}

export function contenidoToken(token: string): Record<string, any> {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

// ------------------------------------------------------------------ datos de la corrida

export interface Datos {
  usuarios: Record<'estudiante' | 'bloqueo' | 'docente' | 'politica' | 'director' | 'nuevo', string>;
  ids: Record<string, number>;
  adminPassword: string;
}

export const ARCHIVO_DATOS = () => path.join(process.env['SGTG_RESULTADOS']!, 'datos.json');

export function datos(): Datos {
  return JSON.parse(fs.readFileSync(ARCHIVO_DATOS(), 'utf8'));
}

// ------------------------------------------------------------------ transcripción y verificaciones

type Entrada = ['#' | '$' | '>', string];

/** Lo que se ejecutó en un caso y su salida real, con tokens y contraseñas ocultos. */
export class Transcripcion {
  readonly entradas: Entrada[] = [];
  private readonly ocultar = new Map<string, string>([['@@HTTP', '→ HTTP']]);

  constructor(private readonly info: TestInfo) {
    this.oculto(API, '$API');
    this.oculto(CLAVE, '********');
    this.oculto(CLAVE_ASIGNADA, '********');
    this.oculto('-o NUL ', '-o /dev/null ');  // en Windows curl descarta la salida en NUL
  }

  oculto(real: string, visible: string): void {
    this.ocultar.set(real, visible);
  }

  mostrar(texto: string): string {
    for (const [real, visible] of [...this.ocultar].sort((a, b) => b[0].length - a[0].length)) {
      texto = texto.split(real).join(visible);
    }
    return texto;
  }

  nota(texto: string): void {
    this.entradas.push(['#', texto]);
  }

  /** Reemplaza la salida de la última entrada (para dejar en la evidencia solo lo relevante). */
  salida(texto: string): void {
    this.entradas[this.entradas.length - 1] = ['>', this.mostrar(texto)];
  }

  /** Verificación del caso: queda en el resumen y, si no se cumple, el caso falla (sin detener los demás). */
  verificar(descripcion: string, cumple: boolean): void {
    this.info.annotations.push({ type: 'verificacion', description: `${cumple ? '✔' : '✘'} ${descripcion}` });
    expect.soft(cumple, descripcion).toBe(true);
  }

  /** Ejecuta curl de verdad. Devuelve el código HTTP y el cuerpo. */
  curl(args: string[], opciones: { codigo?: boolean; tiempo?: boolean } = {}): { codigo: number | null; cuerpo: string } {
    const { codigo = true, tiempo = false } = opciones;
    // marcador ASCII (curl.exe en Windows no siempre recibe bien otros caracteres); se muestra como →
    const formato = codigo ? ['-w', `\\n@@HTTP %{http_code}${tiempo ? ' en %{time_total} s' : ''}\\n`] : [];
    const cmd = ['curl', '-s', ...args, ...formato];
    const r = spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8' });
    const salida = (r.stdout ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '');
    this.entradas.push(['$', this.mostrar(cmd.map(comillas).join(' '))]);
    this.entradas.push(['>', this.mostrar(salida)]);
    if (!codigo || !salida.includes('@@HTTP')) return { codigo: null, cuerpo: salida };
    const i = salida.lastIndexOf('@@HTTP');
    return { codigo: Number(salida.slice(i + 7).split(/\s/)[0]), cuerpo: salida.slice(0, i).replace(/\n+$/, '') };
  }

  /** Ejecuta un comando y guarda el comando visible y su salida real. */
  comando(visible: string, programa: string, args: string[], opciones: { cwd?: string; shell?: boolean } = {}): string {
    const r = spawnSync(programa, args, { encoding: 'utf8', cwd: opciones.cwd, shell: opciones.shell });
    const salida = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/\r\n/g, '\n').replace(/\n+$/, '');
    this.entradas.push(['$', visible]);
    this.entradas.push(['>', this.mostrar(salida)]);
    return salida;
  }

  /** Consulta en la base de la copia aislada, mostrada como tabla. */
  sqlVisible(consulta: string): string {
    return this.comando(`docker exec ${MYSQL} mysql -P3307 -uroot -p*** sgtg -e "${consulta}"`,
      'docker', ['exec', MYSQL, 'sh', '-c', mysql(consulta, '-t')]);
  }

  /** Guarda la transcripción (.txt e imagen) en la carpeta de resultados y la adjunta al reporte. */
  async guardar(browser: Browser, id: string): Promise<void> {
    if (!this.entradas.length) return;
    const base = path.join(process.env['SGTG_RESULTADOS']!, id);
    const texto = this.entradas.map(([t, x]) => (t === '#' ? '# ' : t === '$' ? '$ ' : '') + x).join('\n') + '\n';
    fs.writeFileSync(`${base}.txt`, texto);
    const pagina = await browser.newPage({ viewport: { width: 1240, height: 200 } });
    await pagina.setContent(htmlTerminal(this.entradas));
    await pagina.locator('#terminal').screenshot({ path: `${base}_terminal.png` });
    await pagina.close();
    await this.info.attach(`${id} (terminal)`, { path: `${base}_terminal.png`, contentType: 'image/png' });
  }
}

/** Filas de una consulta (sin encabezado, separadas por tabulador), para verificar. */
export function sql(consulta: string): string[][] {
  const r = spawnSync('docker', ['exec', MYSQL, 'sh', '-c', mysql(consulta, '-B -N')], { encoding: 'utf8' });
  return (r.stdout ?? '').split('\n').filter(l => l.trim()).map(l => l.split('\t'));
}

function mysql(consulta: string, formato: string): string {
  return `mysql --default-character-set=utf8mb4 -P3307 -uroot -p"$MYSQL_ROOT_PASSWORD" sgtg ${formato} `
    + `-e "${consulta}" 2>&1 | grep -v "Using a password"`;
}

function comillas(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

// ------------------------------------------------------------------ imagen de terminal

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function colorSalida(linea: string): string {
  const m = /HTTP[/ 0-9.]*?\b([1-5]\d\d)\b/.exec(linea);
  if (linea.startsWith('→') && m) {
    const codigo = Number(m[1]);
    return codigo < 300 ? 'ok' : [413, 429].includes(codigo) ? 'aviso' : 'error';
  }
  if (linea.startsWith('ERROR')) return 'error';
  if (linea.includes('found 0 vulnerabilities')) return 'ok';
  return 'salida';
}

function htmlTerminal(entradas: Entrada[]): string {
  const filas = entradas.map(([tipo, texto], i) => {
    if (tipo === '#') return `<div class="nota${i ? ' sep' : ''}"># ${escapar(texto)}</div>`;
    if (tipo === '$') return `<div class="cmd"><b>$</b> ${escapar(texto)}</div>`;
    return texto.split('\n').filter(l => l.trim())
      .map(l => `<div class="${colorSalida(l)}">${escapar(l)}</div>`).join('');
  }).join('');
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; background: #fff; }
    #terminal { width: 1240px; background: #1e1e2e; font: 19px/26px Consolas, 'DejaVu Sans Mono', monospace; }
    .barra { height: 40px; background: #181825; position: relative; color: #9399b2; text-align: center; line-height: 40px; }
    .barra i { position: absolute; top: 13px; width: 14px; height: 14px; border-radius: 7px; }
    .contenido { padding: 22px; white-space: pre-wrap; word-break: break-all; }
    .nota { color: #9399b2; } .sep { margin-top: 26px; }
    .cmd { color: #e6e6f0; padding-left: 1.2em; text-indent: -1.2em; } .cmd b { color: #89dc8c; }
    .salida { color: #cdd6f4; } .ok { color: #89dc8c; font-weight: bold; }
    .error { color: #f38ba8; font-weight: bold; } .aviso { color: #fab387; font-weight: bold; }
  </style><div id="terminal"><div class="barra"><i style="left:16px;background:#f38ba8"></i>`
    + `<i style="left:40px;background:#f9e2af"></i><i style="left:64px;background:#a6e3a1"></i>`
    + `bash — pruebas de seguridad SGTG</div><div class="contenido">${filas}</div></div>`;
}
