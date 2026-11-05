"""Pruebas de seguridad de SGTG (Anexo 8, RNF-02): 20 casos sobre la interfaz, el API y la base de datos.

Uso (desde esta carpeta):
    python seguridad.py                  # copia aislada desde cero, los 20 casos y la evidencia
    python seguridad.py --sin-navegador  # solo API y base de datos (sin Playwright)
    python seguridad.py --reusar         # no borra los datos de la copia aislada (arranca más rápido)
    python seguridad.py --dejar-arriba   # no detiene la copia aislada al terminar

Cada corrida deja en resultados/<fecha>/ el resumen, la transcripción de cada caso (los comandos que se
ejecutaron y su salida real) y, si están Pillow y Playwright, las imágenes de evidencia.
Ver README.md.
"""
import argparse
import base64
import datetime as dt
import json
import os
import random
import re
import secrets
import shlex
import shutil
import subprocess
import sys
import tempfile
import time

import requests

AQUI = os.path.dirname(os.path.abspath(__file__))
FRONT = os.path.abspath(os.path.join(AQUI, '..', '..'))
COMPOSE = os.path.join(AQUI, 'docker-compose.pruebas.yml')
ARCHIVO_ENV = os.path.join(AQUI, '.env.pruebas')
PROYECTO = 'sgtgpruebas'
WEB = 'http://localhost:4220'
API = WEB + '/api/v1/sgtg'                    # a través de Nginx, como un usuario real
DIRECTO = 'http://localhost:8095/api/v1/sgtg'  # backend directo: solo para preparar datos y obtener tokens
MYSQL = f'{PROYECTO}-mysql-1'
BACKEND = f'{PROYECTO}-backend-1'
WEB_CONT = f'{PROYECTO}-web-1'
ADMIN_EMAIL = 'admin.pruebas@unicauca.edu.co'
CLAVE = 'Trabajo$Grado84'            # contraseña definitiva de los usuarios de prueba
CLAVE_ASIGNADA = 'Ingreso#Temporal71'  # la que asigna el administrador (obliga a cambiarla)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


# ============================================================================ utilidades

def entorno_pruebas():
    """Claves de la copia aislada: se generan al azar la primera vez y se guardan en .env.pruebas."""
    if not os.path.exists(ARCHIVO_ENV):
        valores = {
            'PRUEBAS_JWT_SECRET': secrets.token_hex(48),
            'PRUEBAS_AUDITORIA_CLAVE': secrets.token_hex(32),
            'PRUEBAS_MYSQL_PASSWORD': secrets.token_hex(16),
            'PRUEBAS_ADMIN_PASSWORD': 'Adm.' + secrets.token_hex(8) + 'Q7#',
        }
        with open(ARCHIVO_ENV, 'w', encoding='utf-8') as f:
            f.write('# Claves de la copia aislada de pruebas (generadas al azar; no se suben al repositorio)\n')
            f.writelines(f'{k}={v}\n' for k, v in valores.items())
    valores = {}
    for linea in open(ARCHIVO_ENV, encoding='utf-8'):
        if '=' in linea and not linea.startswith('#'):
            k, v = linea.strip().split('=', 1)
            valores[k] = v
    return valores


def compose(*args):
    cmd = ['docker', 'compose', '-p', PROYECTO, '-f', COMPOSE, '--env-file', ARCHIVO_ENV, *args]
    subprocess.run(cmd, check=True)


def esperar_backend(segundos=900):
    print('Esperando a que el backend responda', end='', flush=True)
    fin = time.time() + segundos
    while time.time() < fin:
        try:
            requests.post(DIRECTO + '/auth/login', json={}, timeout=3)
            # además, que Nginx ya reenvíe al backend
            if requests.get(WEB + '/', timeout=3).status_code == 200:
                print(' listo')
                return
        except requests.RequestException:
            pass
        print('.', end='', flush=True)
        time.sleep(5)
    raise SystemExit('El backend no respondió a tiempo. Revise: docker compose -p sgtgpruebas logs backend')


def token(email, password):
    r = requests.post(DIRECTO + '/auth/login', json={'email': email, 'password': password}, timeout=30)
    r.raise_for_status()
    return r.json()['token']


def contenido_token(tok):
    parte = tok.split('.')[1]
    return json.loads(base64.urlsafe_b64decode(parte + '=' * (-len(parte) % 4)))


class Api:
    def __init__(self, tok):
        self.h = {'Authorization': 'Bearer ' + tok}

    def _ok(self, r):
        if r.status_code >= 400:
            raise RuntimeError(f'{r.request.method} {r.url} -> {r.status_code} {r.text[:300]}')
        return r.json() if r.content and 'json' in r.headers.get('content-type', '') else None

    def get(self, ruta):
        return self._ok(requests.get(DIRECTO + ruta, headers=self.h, timeout=30))

    def post(self, ruta, cuerpo=None):
        return self._ok(requests.post(DIRECTO + ruta, headers=self.h, json=cuerpo, timeout=30))

    def put(self, ruta, cuerpo=None):
        return self._ok(requests.put(DIRECTO + ruta, headers=self.h, json=cuerpo, timeout=30))


def sql(consulta):
    """Ejecuta una consulta en la base de la copia aislada y devuelve las filas (sin encabezado)."""
    r = subprocess.run(['docker', 'exec', MYSQL, 'sh', '-c',
                        f'mysql --default-character-set=utf8mb4 -P3307 -uroot -p"$MYSQL_ROOT_PASSWORD" sgtg -B -N '
                        f'-e "{consulta}" 2>&1 | grep -v "Using a password"'],
                       capture_output=True, text=True, encoding='utf-8')
    return [l.split('\t') for l in r.stdout.strip().split('\n') if l.strip()]


# ============================================================================ casos y evidencia

class Caso:
    def __init__(self, cid, nombre):
        self.id, self.nombre = cid, nombre
        self.entradas = []          # ('#', nota) | ('$', comando) | ('>', salida)
        self.verificaciones = []    # (descripción, cumple)
        self.capturas = []
        self.error = None

    def nota(self, texto):
        self.entradas.append(('#', texto))

    def verificar(self, descripcion, cumple):
        self.verificaciones.append((descripcion, bool(cumple)))
        return cumple

    @property
    def cumple(self):
        return self.error is None and self.verificaciones and all(c for _, c in self.verificaciones)


CASOS = {}
OCULTAR = {'@@HTTP': '→ HTTP'}   # texto real -> cómo se muestra en la evidencia (tokens y contraseñas)


def caso(cid, nombre):
    CASOS[cid] = Caso(cid, nombre)
    return CASOS[cid]


def mostrar(texto):
    for real, visible in sorted(OCULTAR.items(), key=lambda kv: -len(kv[0])):
        texto = texto.replace(real, visible)
    return texto


def curl(c, *args, codigo=True, tiempo=False):
    """Ejecuta curl de verdad y guarda en el caso el comando (con tokens y contraseñas ocultos) y su salida.
    Devuelve (código HTTP, cuerpo)."""
    formato = []
    if codigo:
        # marcador ASCII (curl.exe en Windows no siempre recibe bien otros caracteres); se muestra como →
        formato = ['-w', '\\n@@HTTP %{http_code}' + (' en %{time_total} s' if tiempo else '') + '\\n']
    cmd = ['curl', '-s', *args, *formato]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    salida = r.stdout.rstrip('\n')
    c.entradas.append(('$', mostrar(' '.join(shlex.quote(a) for a in cmd))))
    c.entradas.append(('>', mostrar(salida)))
    estado = None
    if codigo and '@@HTTP' in salida:
        estado = int(salida.rsplit('@@HTTP', 1)[1].split()[0])
        salida = salida.rsplit('@@HTTP', 1)[0].rstrip('\n')
    return estado, salida


def shell(c, visible, cmd_real, cwd=None):
    """Ejecuta un comando (lista o texto) y guarda el comando visible y su salida real."""
    r = subprocess.run(cmd_real, capture_output=True, text=True, encoding='utf-8', cwd=cwd,
                       shell=isinstance(cmd_real, str))
    salida = (r.stdout + r.stderr).rstrip('\n')
    c.entradas.append(('$', visible))
    c.entradas.append(('>', mostrar(salida)))
    return salida


def sql_visible(c, consulta):
    return shell(c, f'docker exec {MYSQL} mysql -P3307 -uroot -p*** sgtg -e "{consulta}"',
                 ['docker', 'exec', MYSQL, 'sh', '-c',
                  f'mysql --default-character-set=utf8mb4 -P3307 -uroot -p"$MYSQL_ROOT_PASSWORD" sgtg -t '
                  f'-e "{consulta}" 2>&1 | grep -v "Using a password"'])


def login_json(email, password):
    return json.dumps({'email': email, 'password': password})


def ejecutar(funcion, c):
    try:
        funcion(c)
    except Exception as e:  # el caso falla, pero la corrida sigue
        c.error = f'{type(e).__name__}: {e}'


# ============================================================================ datos de prueba

def preparar(admin_pass):
    """Crea un departamento, un programa y usuarios propios de esta corrida (correos con un sufijo al azar)."""
    adm = Api(token(ADMIN_EMAIL, admin_pass))
    deps = adm.get('/catalogos/departamentos')
    dep = next((d for d in deps if d['nombre'] == 'Pruebas'), None) or adm.post('/catalogos/departamentos',
                                                                             {'nombre': 'Pruebas'})
    progs = adm.get('/catalogos/programas')
    prog = next((p for p in progs if p['nombre'] == 'Ingeniería de Pruebas'), None) or adm.post(
        '/catalogos/programas', {'nombre': 'Ingeniería de Pruebas', 'departamentoId': dep['id']})
    sufijo = random.randint(1000, 9999)

    def crear(clave, nombre, apellido, roles, activar=True, **perfil):
        email = f'{clave}.{sufijo}@unicauca.edu.co'
        adm.post('/usuarios', dict(
            codigo=str(random.randint(100000000, 999999999)), tipoDocumento='CC',
            numeroDocumento=str(random.randint(1000000000, 1099999999)), email=email, password=CLAVE_ASIGNADA,
            primerNombre=nombre, segundoNombre='', primerApellido=apellido, segundoApellido='Pruebas',
            roles=roles, **perfil))
        if activar:  # primer ingreso: cambia la contraseña asignada por la definitiva
            Api(token(email, CLAVE_ASIGNADA)).put('/usuarios/me/password',
                                                  {'passwordActual': CLAVE_ASIGNADA, 'passwordNueva': CLAVE})
        return email

    u = {
        'estudiante': crear('laura.estudiante', 'Laura', 'Rojas', ['ESTUDIANTE'], programaId=prog['id']),
        'bloqueo': crear('maria.bloqueo', 'María', 'Quintero', ['ESTUDIANTE'], programaId=prog['id']),
        'docente': crear('sandra.docente', 'Sandra', 'Rengifo', ['DOCENTE'], tipoVinculacion='PLANTA',
                         departamentoId=dep['id']),
        'politica': crear('hernan.docente', 'Hernán', 'Gómez', ['DOCENTE'], tipoVinculacion='PLANTA',
                          departamentoId=dep['id']),
        'director': crear('carlos.director', 'Carlos', 'Muñoz', ['DOCENTE'], tipoVinculacion='PLANTA',
                          departamentoId=dep['id']),
        'nuevo': crear('valentina.nueva', 'Valentina', 'Prueba', ['ESTUDIANTE'], activar=False,
                       programaId=prog['id']),
    }
    lista = adm.get('/usuarios')
    lista = lista if isinstance(lista, list) else lista.get('content', [])
    ids = {x['email']: x['id'] for x in lista}
    adm.put(f"/usuarios/{ids[u['director']]}/roles", {'roles': ['DOCENTE', 'DIRECTOR']})
    return adm, u, ids


# ============================================================================ los 20 casos

def correr(args, admin_pass, salida):
    adm, U, IDS = preparar(admin_pass)
    tokens = {
        'TOKEN_EST': token(U['estudiante'], CLAVE),
        'TOKEN_ADMIN': token(ADMIN_EMAIL, admin_pass),
    }
    for k, v in tokens.items():
        OCULTAR[v] = '$' + k
    OCULTAR[API] = '$API'
    OCULTAR[CLAVE] = '********'
    OCULTAR[CLAVE_ASIGNADA] = '********'
    OCULTAR[admin_pass] = '********'
    auth = lambda nombre: ['-H', f'Authorization: Bearer {tokens[nombre]}']  # noqa: E731
    json_h = ['-H', 'Content-Type: application/json']

    # ---------------------------------------------------------------- control de acceso (API)
    def seg04(c):
        c.nota('Consultas al API sin token de acceso')
        for ruta in ('/usuarios/gestion', '/trabajos-grado', '/notificaciones'):
            cod, cuerpo = curl(c, API + ruta)
            c.verificar(f'{ruta} sin token responde 401 sin datos', cod == 401 and not cuerpo.strip())

    def seg05(c):
        c.nota('Estudiante autenticado intenta operaciones de gestión de usuarios')
        cod, cuerpo = curl(c, *auth('TOKEN_EST'), API + '/usuarios/gestion')
        c.verificar('el estudiante recibe 403 al consultar la gestión de usuarios', cod == 403)
        nuevo = {'codigo': '999', 'tipoDocumento': 'CC', 'numeroDocumento': '1099', 'email': 'nuevo@unicauca.edu.co',
                 'password': 'Nueva.Clave2026', 'primerNombre': 'Ana', 'primerApellido': 'Paz',
                 'roles': ['ADMINISTRADOR']}
        cod, _ = curl(c, '-X', 'POST', *auth('TOKEN_EST'), *json_h, '-d', json.dumps(nuevo), API + '/usuarios')
        c.verificar('el estudiante recibe 403 al crear un administrador', cod == 403)
        c.nota('El mismo recurso con el rol de administrador')
        cod, _ = curl(c, '-o', os.devnull, *auth('TOKEN_ADMIN'), API + '/usuarios/gestion')
        c.verificar('el administrador recibe 200', cod == 200)

    def seg06(c):
        cab, cuerpo, firma = tokens['TOKEN_EST'].split('.')
        datos = contenido_token(tokens['TOKEN_EST'])
        alterado = dict(datos, roles=['ADMINISTRADOR'])
        cuerpo_alt = base64.urlsafe_b64encode(json.dumps(alterado).encode()).decode().rstrip('=')
        sin_firma = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip('=')
        tokens['TOKEN_ALTERADO'] = f'{cab}.{cuerpo_alt}.{firma}'
        tokens['TOKEN_SIN_FIRMA'] = f'{sin_firma}.{cuerpo_alt}.'
        OCULTAR[tokens['TOKEN_ALTERADO']] = '$TOKEN_ALTERADO'
        OCULTAR[tokens['TOKEN_SIN_FIRMA']] = '$TOKEN_SIN_FIRMA'
        c.nota('Contenido del token del estudiante (sin la firma): '
               + json.dumps({k: v for k, v in datos.items() if k != 'sub'}, ensure_ascii=False))
        c.nota('Token con el contenido cambiado (roles → ADMINISTRADOR) y la firma original')
        cod, _ = curl(c, *auth('TOKEN_ALTERADO'), API + '/usuarios/gestion')
        c.verificar('token alterado rechazado con 401', cod == 401)
        c.nota('Token sin firma ("alg": "none")')
        cod, _ = curl(c, *auth('TOKEN_SIN_FIRMA'), API + '/usuarios/gestion')
        c.verificar('token sin firma rechazado con 401', cod == 401)
        c.nota('Token inventado')
        cod, _ = curl(c, '-H', 'Authorization: Bearer abc.def.ghi', API + '/usuarios/gestion')
        c.verificar('token inventado rechazado con 401', cod == 401)

    # ---------------------------------------------------------------- autenticación y sesión (API)
    def seg09(c):
        c.nota('Correo que no existe y contraseña incorrecta de un correo que sí existe')
        respuestas = []
        for email in ('noexiste.nadie@unicauca.edu.co', U['docente']):
            cod, cuerpo = curl(c, '-X', 'POST', *json_h, '-d', login_json(email, 'Clave.Falsa2026'),
                               API + '/auth/login', tiempo=True)
            respuestas.append((cod, json.loads(cuerpo).get('message') if cuerpo.startswith('{') else cuerpo))
        c.verificar('las dos respuestas son iguales (código y mensaje)',
                    respuestas[0] == respuestas[1] and respuestas[0][0] == 401)
        c.nota('Intento de inyección SQL en el correo')
        cod, _ = curl(c, '-X', 'POST', *json_h, '-d', login_json("' OR '1'='1' -- ", 'x'), API + '/auth/login')
        c.verificar('la inyección se rechaza (400 o 401) y no inicia sesión', cod in (400, 401))

    def seg07(c):
        correo = U['bloqueo']
        c.nota(f'Cinco contraseñas incorrectas seguidas para {correo}')
        mensajes = []
        for i in range(5):
            cod, cuerpo = curl(c, '-X', 'POST', *json_h, '-d', login_json(correo, f'Incorrecta.{i}2026'),
                               API + '/auth/login')
            mensajes.append(cuerpo)
        c.verificar('el quinto fallo bloquea el correo', 'Demasiados intentos' in mensajes[-1])
        c.nota('Sexto intento, ahora con la contraseña correcta')
        cod, cuerpo = curl(c, '-X', 'POST', *json_h, '-d', login_json(correo, CLAVE), API + '/auth/login')
        c.verificar('con la contraseña correcta también se rechaza durante el bloqueo',
                    cod == 401 and 'Demasiados intentos' in cuerpo)

    def seg10(c):
        c.nota('Inicio de sesión: cabeceras de la respuesta (cookie de renovación)')
        cod, cuerpo = curl(c, '-i', '-X', 'POST', *json_h, '-d', login_json(U['docente'], CLAVE),
                           API + '/auth/login', codigo=False)
        lineas = cuerpo.split('\n')
        cookie = next((l for l in lineas if l.lower().startswith('set-cookie: sgtg_renovacion')), '')
        # en la evidencia solo quedan la línea de estado y la cookie, sin su valor
        estado = next((l for l in lineas if l.startswith('HTTP')), '')
        c.entradas[-1] = ('>', estado + '\n' + re.sub(r'(sgtg_renovacion=)[^;]+', r'\1…', cookie))
        for atributo in ('HttpOnly', 'Secure', 'SameSite=Strict'):
            c.verificar(f'la cookie de renovación es {atributo}', atributo in cookie)
        cuerpo_json = cuerpo[cuerpo.index('{'):] if '{' in cuerpo else '{}'
        d = contenido_token(json.loads(cuerpo_json)['token'])
        c.nota(f'Vigencia del token de acceso: exp − iat = {d["exp"] - d["iat"]} s '
               f'({(d["exp"] - d["iat"]) // 60} minutos)')
        c.verificar('el token de acceso dura 15 minutos', d['exp'] - d['iat'] == 900)

    def seg11(c):
        tokens['TOKEN'] = token(U['docente'], CLAVE)
        OCULTAR[tokens['TOKEN']] = '$TOKEN'
        c.nota('Cierre de sesión: el token deja de servir aunque no haya vencido')
        cod, _ = curl(c, '-o', os.devnull, *auth('TOKEN'), API + '/usuarios/me')
        c.verificar('antes del cierre el token sirve (200)', cod == 200)
        cod, _ = curl(c, '-o', os.devnull, '-X', 'POST', *auth('TOKEN'), API + '/auth/logout')
        c.verificar('el cierre responde 204', cod == 204)
        cod, _ = curl(c, *auth('TOKEN'), API + '/usuarios/me')
        c.verificar('después del cierre el mismo token recibe 401', cod == 401)

    # ---------------------------------------------------------------- contraseñas (API y base de datos)
    def seg13_api(c):
        tokens['TOKEN_NUEVO'] = token(U['nuevo'], CLAVE_ASIGNADA)
        OCULTAR[tokens['TOKEN_NUEVO']] = '$TOKEN_NUEVO'
        c.nota(f"Usuario creado por el administrador con una contraseña asignada ({U['nuevo']}).")
        c.nota('Con esa sesión, antes de cambiar la contraseña:')
        for ruta in ('/notificaciones', '/trabajos-grado'):
            cod, cuerpo = curl(c, *auth('TOKEN_NUEVO'), API + ruta)
            c.verificar(f'{ruta} responde 403 con GC-0012', cod == 403 and 'GC-0012' in cuerpo)
        c.nota('Lo único permitido: consultar su perfil y cambiar la contraseña')
        cod, _ = curl(c, '-o', os.devnull, *auth('TOKEN_NUEVO'), API + '/usuarios/me')
        c.verificar('puede consultar su perfil (200)', cod == 200)

    def seg14_api(c):
        tokens['TOKEN_D'] = token(U['politica'], CLAVE)
        OCULTAR[tokens['TOKEN_D']] = '$TOKEN_D'
        c.nota('Cambio de contraseña con claves que no cumplen la política')
        for nueva in ('corta1!', 'sinsimbolos123ABC', 'Unicauca2026*', 'Qwerty.2026x', CLAVE):
            if nueva == CLAVE:
                c.nota('La misma contraseña actual (no se puede repetir ninguna de las últimas 5)')
            cod, cuerpo = curl(c, '-X', 'PUT', *auth('TOKEN_D'), *json_h,
                               '-d', json.dumps({'passwordActual': CLAVE, 'passwordNueva': nueva}),
                               API + '/usuarios/me/password')
            c.verificar(f'se rechaza «{mostrar(nueva)}» con 400', cod == 400)

    def seg15(c):
        c.nota('Contraseñas guardadas en la tabla credenciales (solo el prefijo del hash)')
        sql_visible(c, 'SELECT LEFT(password_hash,7) AS algoritmo_y_costo, COUNT(*) AS usuarios '
                       'FROM credenciales GROUP BY 1')
        prefijos = {f[0] for f in sql('SELECT DISTINCT LEFT(password_hash,7) FROM credenciales')}
        c.verificar('todas las contraseñas son BCrypt de costo 12', prefijos == {'$2a$12$'})
        columnas = sql("SHOW COLUMNS FROM users LIKE '%pass%'")
        c.entradas.append(('$', f'docker exec {MYSQL} mysql -P3307 -uroot -p*** sgtg -e '
                                '"SHOW COLUMNS FROM users LIKE \'%pass%\'"'))
        c.entradas.append(('>', '(sin columnas de contraseña en users)' if not columnas else str(columnas)))
        c.verificar('la tabla users no tiene columnas de contraseña', not columnas)

    # ---------------------------------------------------------------- archivos, cabeceras, auditoría
    def seg16(c):
        td = token(U['director'], CLAVE)
        tokens['TOKEN_DIR'] = td
        OCULTAR[td] = '$TOKEN_DIR'
        t = Api(td).post('/trabajos-grado/investigacion', {
            'titulo': 'Trabajo de prueba de seguridad',
            'objetivos': ['Probar la carga de archivos', 'Verificar que se rechacen los archivos que no son PDF'],
            'estudiantesIds': [IDS[U['estudiante']]], 'descripcion': 'Solo para las pruebas de seguridad.',
            'lineaInvestigacion': 'Ingeniería de software'})
        ruta = f"{API}/trabajos-grado/{t['id']}/propuesta"
        carpeta = tempfile.mkdtemp()
        falso = os.path.join(carpeta, 'formato_falso.pdf')
        open(falso, 'wb').write(b'MZ\x90\x00 este archivo es un ejecutable renombrado, no un PDF\n')
        exe = os.path.join(carpeta, 'script.exe')
        open(exe, 'wb').write(b'%PDF-1.7 contenido con firma PDF pero extension .exe\n')
        grande = os.path.join(carpeta, 'grande.pdf')
        with open(grande, 'wb') as f:
            f.write(b'%PDF-1.7\n' + b'0' * (70 * 1024 * 1024))
        OCULTAR[carpeta + os.sep] = ''
        OCULTAR[carpeta.replace('\\', '/') + '/'] = ''
        c.nota('Archivo con extensión .pdf cuyo contenido no es un PDF (empieza con «MZ», no con %PDF-)')
        cod, cuerpo = curl(c, *auth('TOKEN_DIR'), '-F', f'archivo=@{falso};type=application/pdf', ruta)
        c.verificar('se rechaza con 400 (no es PDF)', cod == 400 and 'PDF' in cuerpo)
        c.nota('Archivo con firma PDF pero con otra extensión')
        cod, cuerpo = curl(c, *auth('TOKEN_DIR'), '-F', f'archivo=@{exe};type=application/pdf', ruta)
        c.verificar('se rechaza con 400 (extensión distinta de .pdf)', cod == 400)
        c.nota('Archivo de 70 MB (el máximo por solicitud es de 65 MB)')
        cod, _ = curl(c, '-o', os.devnull, *auth('TOKEN_DIR'), '-F', f'archivo=@{grande};type=application/pdf',
                      ruta)
        c.verificar('se rechaza con 413 (demasiado grande)', cod == 413)
        shutil.rmtree(carpeta, ignore_errors=True)

    def seg17(c):
        c.nota('Cabeceras de seguridad de la aplicación (Nginx)')
        _, cab = curl(c, '-I', WEB + '/', codigo=False)
        c.entradas[-1] = ('>', '\n'.join(l for l in cab.split('\n') if l.split(':')[0].lower() in (
            'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy',
            'permissions-policy', 'server') or l.startswith('HTTP')))
        baja = cab.lower()
        for nombre in ('content-security-policy', 'x-frame-options: deny', 'x-content-type-options: nosniff',
                       'referrer-policy', 'permissions-policy'):
            c.verificar(f'la aplicación envía {nombre}', nombre in baja)
        c.verificar('el servidor no revela su versión', 'server: nginx/' not in baja)
        c.nota('Cabeceras de seguridad de las respuestas del API (Spring Security)')
        _, cab = curl(c, '-I', *auth('TOKEN_ADMIN'), API + '/usuarios/me', codigo=False)
        c.entradas[-1] = ('>', '\n'.join(l for l in cab.split('\n') if l.split(':')[0].lower() in (
            'x-frame-options', 'x-content-type-options', 'cache-control', 'pragma') or l.startswith('HTTP')))
        baja = cab.lower()
        c.verificar('el API envía X-Frame-Options y no-store',
                    'x-frame-options: deny' in baja and 'no-store' in baja)

    def seg18(c):
        c.nota('Últimos registros de la auditoría (cada uno sellado y encadenado con el anterior)')
        sql_visible(c, 'SELECT secuencia, metodo, LEFT(ruta,40) AS ruta, estado_http, '
                       'LEFT(sello_anterior,12) AS sello_anterior, LEFT(sello,12) AS sello FROM auditoria '
                       'WHERE secuencia IS NOT NULL ORDER BY secuencia DESC LIMIT 5')
        filas = sql('SELECT secuencia, sello_anterior, sello FROM auditoria WHERE secuencia IS NOT NULL '
                    'ORDER BY secuencia DESC LIMIT 20')
        encadenados = all(filas[i][1] == filas[i + 1][2] for i in range(len(filas) - 1))
        c.verificar('cada registro guarda el sello del anterior', len(filas) > 1 and encadenados)
        c.nota('Intento de modificar y de borrar un registro directamente en la base de datos')
        sal = sql_visible(c, 'UPDATE auditoria SET estado_http=200 WHERE secuencia=1')
        c.verificar('la base de datos rechaza la modificación', 'ERROR 1644' in sal)
        sal = sql_visible(c, 'DELETE FROM auditoria WHERE secuencia=1')
        c.verificar('la base de datos rechaza el borrado', 'ERROR 1644' in sal)
        c.nota('Verificación de la cadena de sellos al arrancar el backend')
        log = shell(c, f'docker logs {BACKEND} 2>&1 | grep "Auditoría íntegra" | tail -1',
                    f'docker logs {BACKEND} 2>&1', None)
        linea = next((l for l in reversed(log.split('\n')) if 'Auditoría íntegra' in l), '')
        c.entradas[-1] = ('>', linea[:200])
        c.verificar('al arrancar, la verificación reporta la auditoría íntegra', bool(linea))

    def seg20(c):
        c.nota('Vulnerabilidades conocidas en las dependencias que se despliegan (FrontEnd)')
        if not shutil.which('npm'):
            c.nota('npm no está instalado en este equipo: caso omitido')
            c.verificar('npm disponible', False)
            return
        sal = shell(c, 'cd sgtg_frontend && npm audit --omit=dev', 'npm audit --omit=dev', cwd=FRONT)
        c.entradas[-1] = ('>', '\n'.join(sal.split('\n')[-2:]))
        c.verificar('0 vulnerabilidades en las dependencias de producción', 'found 0 vulnerabilities' in sal)

    # ---------------------------------------------------------------- límite por IP y alertas (al final)
    def seg08(c):
        c.nota('30 intentos de inicio de sesión seguidos desde la misma IP (correos distintos)')
        codigos = []
        for i in range(1, 31):
            r = subprocess.run(['curl', '-s', '-o', os.devnull, '-w', '%{http_code}', '-X', 'POST',
                                '-H', 'Content-Type: application/json', '-d',
                                login_json(f'prueba{i}@unicauca.edu.co', 'x'), API + '/auth/login'],
                               capture_output=True, text=True)
            codigos.append(r.stdout.strip())
        c.entradas.append(('$', 'for i in $(seq 1 30); do\n'
                                '  curl -s -o /dev/null -w "%{http_code} " -X POST -H "Content-Type: application/json" \\\n'
                                '       -d "{\\"email\\":\\"prueba$i@unicauca.edu.co\\",\\"password\\":\\"x\\"}" '
                                '$API/auth/login\ndone; echo'))
        c.entradas.append(('>', ' '.join(codigos)))
        primero = codigos.index('429') if '429' in codigos else None
        c.verificar('Nginx responde 429 cuando se supera el límite', primero is not None)
        c.verificar('después del primer 429 todos son 429', primero is not None and
                    all(x == '429' for x in codigos[primero:]))
        c.verificar('las primeras peticiones pasan (el límite no afecta el uso normal)',
                    primero is not None and primero >= 10)
        c.nota('Respuesta completa de un intento rechazado por el límite')
        curl(c, '-X', 'POST', *json_h, '-d', login_json('a@unicauca.edu.co', 'x'), API + '/auth/login')
        c.nota('Registro de accesos de Nginx: las peticiones rechazadas (429) no llegan al backend')
        log = shell(c, f'docker logs {WEB_CONT} 2>&1 | grep "auth/login" | grep -c "\\" 429 "',
                    ['docker', 'logs', WEB_CONT])
        cuenta = sum(1 for l in log.split('\n') if 'auth/login' in l and '" 429 ' in l)
        c.entradas[-1] = ('>', str(cuenta))
        c.verificar('los 429 quedan en el log de Nginx', cuenta > 0)

    def seg19_api(c):
        c.nota('Alertas generadas por la revisión automática tras los casos SEG-07 a SEG-09 y SEG-08')
        tipos = set()
        fin = time.time() + 120
        while time.time() < fin:
            tipos = {f[0] for f in sql('SELECT DISTINCT tipo FROM alertas_seguridad')}
            if {'CORREO_BLOQUEADO', 'FUERZA_BRUTA_IP'} <= tipos:
                break
            time.sleep(5)
        sql_visible(c, 'SELECT tipo, clave, LEFT(detalle,70) AS detalle FROM alertas_seguridad ORDER BY id')
        c.verificar('hay alerta de correo bloqueado', 'CORREO_BLOQUEADO' in tipos)
        c.verificar('hay alerta de fuerza bruta desde una IP', 'FUERZA_BRUTA_IP' in tipos)

    # ---------------------------------------------------------------- orden de ejecución
    # Los inicios de sesión por Nginx cuentan para el límite por IP: SEG-08 va al final y antes de las
    # capturas que necesitan iniciar sesión otra vez se espera a que el límite se libere.
    nombres = {
        'SEG-01': 'Acceso a vistas internas sin sesión', 'SEG-02': 'Acceso por URL con un rol no autorizado',
        'SEG-03': 'Visibilidad del menú por rol', 'SEG-04': 'Consultas al API sin token',
        'SEG-05': 'Operaciones del API con un rol no autorizado', 'SEG-06': 'Token alterado o falsificado',
        'SEG-07': 'Bloqueo por intentos fallidos', 'SEG-08': 'Límite de inicios de sesión por IP',
        'SEG-09': 'Respuestas que no revelan cuentas e inyección SQL',
        'SEG-10': 'Vigencia del token y cookie de renovación', 'SEG-11': 'Cierre de sesión',
        'SEG-12': 'Cierre por inactividad', 'SEG-13': 'Cambio obligatorio de la contraseña asignada',
        'SEG-14': 'Política de contraseñas', 'SEG-15': 'Almacenamiento de las contraseñas',
        'SEG-16': 'Carga de archivos que no son PDF', 'SEG-17': 'Cabeceras de seguridad',
        'SEG-18': 'Integridad de la auditoría', 'SEG-19': 'Alertas de seguridad',
        'SEG-20': 'Vulnerabilidades en las dependencias'}
    for cid, nombre in nombres.items():
        caso(cid, nombre)
    pasos_api = [('SEG-04', seg04), ('SEG-05', seg05), ('SEG-06', seg06), ('SEG-09', seg09), ('SEG-07', seg07),
                 ('SEG-10', seg10), ('SEG-11', seg11), ('SEG-13', seg13_api), ('SEG-14', seg14_api),
                 ('SEG-15', seg15), ('SEG-16', seg16), ('SEG-17', seg17), ('SEG-18', seg18), ('SEG-20', seg20)]
    for cid, f in pasos_api:
        print(f'  {cid} {CASOS[cid].nombre}…')
        ejecutar(f, CASOS[cid])

    nav = None
    if not args.sin_navegador:
        try:
            import navegador as nav
        except ImportError as e:
            print(f'  (sin navegador: {e}; los casos de la interfaz quedan pendientes)')
            nav = None
    if nav:
        print('  Casos en la interfaz (Playwright)…')
        nav.antes_del_limite(CASOS, U, CLAVE, CLAVE_ASIGNADA, ADMIN_EMAIL, admin_pass, salida, ejecutar)

    print('  Esperando 60 s a que se libere el límite por IP antes de SEG-08…')
    time.sleep(60)
    print('  SEG-08 Límite de inicios de sesión por IP…')
    ejecutar(seg08, CASOS['SEG-08'])
    print('  SEG-19 Alertas de seguridad…')
    ejecutar(seg19_api, CASOS['SEG-19'])
    if nav:
        print('  Esperando 65 s para iniciar sesión como administrador y ver las alertas…')
        time.sleep(65)
        nav.despues_del_limite(CASOS, ADMIN_EMAIL, admin_pass, salida, ejecutar)


# ============================================================================ informe

def informe(salida):
    try:
        import terminal
    except ImportError:
        terminal = None
    lineas = [f'Pruebas de seguridad de SGTG — {dt.datetime.now():%Y-%m-%d %H:%M}', '']
    for n, c in enumerate(CASOS.values(), start=1):
        if not c.verificaciones and c.error is None:
            estado = 'PENDIENTE'
        else:
            estado = 'CUMPLE' if c.cumple else 'NO CUMPLE'
        lineas.append(f'{c.id}  {estado:<10} {c.nombre}')
        for desc, ok in c.verificaciones:
            lineas.append(f'          {"✔" if ok else "✘"} {desc}')
        if c.error:
            lineas.append(f'          ✘ error: {c.error}')
        base = os.path.join(salida, c.id)
        if c.entradas:
            with open(base + '.txt', 'w', encoding='utf-8') as f:
                for tipo, t in c.entradas:
                    f.write(('# ' if tipo == '#' else '$ ' if tipo == '$' else '') + t + '\n')
            if terminal:
                terminal.dibujar(c.entradas, base + '_terminal.png')
    total = sum(1 for c in CASOS.values() if c.cumple)
    lineas += ['', f'Resultado: {total} de {len(CASOS)} casos cumplen.']
    texto = '\n'.join(lineas)
    open(os.path.join(salida, 'resumen.txt'), 'w', encoding='utf-8').write(texto + '\n')
    print('\n' + texto)
    print(f'\nEvidencia en: {salida}')
    return total == len(CASOS)


def main():
    p = argparse.ArgumentParser(description='Pruebas de seguridad de SGTG sobre una copia aislada en Docker.')
    p.add_argument('--reusar', action='store_true', help='no borrar los datos de la copia aislada al empezar')
    p.add_argument('--sin-levantar', action='store_true', help='la copia aislada ya está arriba')
    p.add_argument('--sin-navegador', action='store_true', help='omitir los casos de la interfaz (Playwright)')
    p.add_argument('--dejar-arriba', action='store_true', help='no detener la copia aislada al terminar')
    args = p.parse_args()
    for programa in ('docker', 'curl'):
        if not shutil.which(programa):
            raise SystemExit(f'Falta {programa} en el PATH.')

    claves = entorno_pruebas()
    if not args.sin_levantar:
        if not args.reusar:
            compose('down', '-v')
        compose('up', '-d', '--build')
    esperar_backend()

    salida = os.path.join(AQUI, 'resultados', dt.datetime.now().strftime('%Y-%m-%d_%H%M%S'))
    os.makedirs(salida, exist_ok=True)
    try:
        correr(args, claves['PRUEBAS_ADMIN_PASSWORD'], salida)
    finally:
        ok = informe(salida)
        if not args.dejar_arriba and not args.sin_levantar:
            compose('stop')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
