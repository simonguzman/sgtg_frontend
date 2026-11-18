"""Genera el C4 nivel 3 (componentes de la API) completo y por secciones.

Uso: python generar.py   ->  escribe los .puml en esta carpeta.
Renderizar: docker run --rm -v "%cd%:/data" plantuml/plantuml -tpng /data/*.puml
"""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))

# alias: (tipo, nombre, tecnología, descripción)
EXTERNOS = {
    'spa': ('Container', 'Aplicación de página única', 'Angular',
            'Interfaz de los usuarios; consume la API.'),
    'db': ('ContainerDb', 'Base de datos', 'MySQL',
           'Usuarios, trabajos de grado, notificaciones, sesiones y auditoría.'),
    'fs': ('ContainerDb', 'Almacenamiento de archivos', 'Sistema de archivos del servidor',
           'Documentos PDF (máximo 20 MB) de cada trabajo, por tipo y versión.'),
}

GRUPOS = [
    ('filtros', 'Filtros de entrada', {
        'fCorr': ('Filtro de correlación', 'Servlet filter · CorrelacionFilter',
                  'Asigna a cada petición un identificador que se conserva en el log y en la auditoría.'),
        'fJwt': ('Filtro de autenticación JWT', 'Spring Security · JwtAuthenticationFilter',
                 'Valida el token de acceso y registra al usuario y sus roles.'),
        'fAud': ('Filtro de auditoría', 'Servlet filter · AuditoriaFilter',
                 'Registra las operaciones que modifican datos, las descargas y los inicios de sesión.'),
    }),
    ('controladores', 'Controladores REST', {
        'cAuth': ('Controlador de autenticación', 'REST · AuthController',
                  'Inicio de sesión, renovación de la sesión y cierre de sesión.'),
        'cUsr': ('Controlador de usuarios', 'REST · UsuarioController',
                 'Creación, edición, roles, activación, cambio del Comité y de contraseña.'),
        'cPerf': ('Controlador de perfiles académicos', 'REST · PerfilController',
                  'Vinculación y departamento del docente; programa del estudiante.'),
        'cCat': ('Controlador de catálogos', 'REST · CatalogoController',
                 'Departamentos y programas académicos.'),
        'cCal': ('Controlador del calendario', 'REST · CalendarioController',
                 'Festivos de ley y días no hábiles institucionales.'),
        'cNot': ('Controlador de notificaciones', 'REST · NotificacionController',
                 'Bandeja de entrada del usuario autenticado.'),
        'cTG': ('Controlador de trabajos de grado', 'REST · TrabajoGradoController',
                'Operaciones de la propuesta, el anteproyecto, el trabajo en curso, las solicitudes especiales y la sustentación.'),
        'cRel': ('Controlador del reloj', 'REST · RelojController',
                 'Solo en desarrollo: adelanta la fecha y ejecuta la revisión diaria.'),
    }),
    ('casos', 'Casos de uso (dominio)', {
        'uAuth': ('Casos de uso de autenticación', 'ManageAuthCUImplAdapter',
                  'Credenciales, sesiones y bloqueo por intentos fallidos.'),
        'uUsr': ('Casos de uso de usuarios', 'ManageUsuarioCUImplAdapter',
                 'Gestión de usuarios según el alcance de cada gestor.'),
        'uPerf': ('Casos de uso de perfiles', 'ManagePerfilCUImplAdapter',
                  'Registro y consulta de perfiles académicos.'),
        'uCat': ('Casos de uso de catálogos', 'ManageCatalogoCUImplAdapter',
                 'Registro y consulta de departamentos y programas.'),
        'uCal': ('Casos de uso del calendario', 'ManageCalendarioCUImplAdapter',
                 'Registro y consulta de días no hábiles.'),
        'uNot': ('Casos de uso de notificaciones', 'ManageNotificacionCUImplAdapter',
                 'Cada usuario consulta y marca solo sus notificaciones.'),
        'uTG': ('Casos de uso del trabajo de grado', 'ManageTrabajoGradoCUImplAdapter',
                'Valida el puesto del usuario en el trabajo, guarda los archivos y delega las reglas al agregado.'),
        'dTG': ('Agregado TrabajoGrado', 'Modelo de dominio',
                'Registro único que avanza por etapas y aplica las reglas del reglamento.'),
        'notif': ('Notificador del trabajo de grado', 'NotificadorTrabajoGrado',
                  'Genera las notificaciones de cada hecho y de los plazos.'),
        'uSeg': ('Casos de uso de seguridad', 'ManageSeguridadCUImplAdapter',
                 'Detecta alertas a partir de la auditoría reciente.'),
    }),
    ('salida', 'Adaptadores de salida', {
        'gAuth': ('Servicios de sesión y tokens', 'AuthService · JwtService · SesionService',
                  'Verifican credenciales, emiten tokens y guardan las sesiones.'),
        'gAcc': ('Adaptador de intentos de acceso', 'ManageIntentosAccesoGatewayImplAdapter',
                 'Registra los intentos fallidos de inicio de sesión.'),
        'gUsr': ('Adaptador de usuarios', 'ManageUserGatewayImplAdapter · JPA',
                 'Usuarios y roles.'),
        'gPerf': ('Adaptador de perfiles', 'ManagePerfilGatewayImplAdapter · JPA',
                  'Perfiles de docentes y estudiantes.'),
        'gCat': ('Adaptador de catálogos', 'ManageCatalogoGatewayImplAdapter · JPA',
                 'Departamentos y programas.'),
        'gCal': ('Calendario hábil', 'CalendarioHabilImplAdapter · JPA',
                 'Días hábiles: sin fines de semana, festivos de Colombia ni días no hábiles.'),
        'gNot': ('Adaptador de notificaciones', 'ManageNotificacionGatewayImplAdapter · JPA',
                 'Notificaciones de la bandeja.'),
        'gTG': ('Adaptador de trabajos de grado', 'ManageTrabajoGradoGatewayImplAdapter · JPA',
                'Guarda el trabajo de grado completo en un solo repositorio.'),
        'gArch': ('Adaptador de archivos', 'ManageArchivoGatewayImplAdapter',
                  'Guarda y entrega los PDF y calcula su huella.'),
        'gAud': ('Adaptador de auditoría', 'ManageAuditoriaGatewayImplAdapter · JPA',
                 'Auditoría encadenada con el estado antes y después de cada operación.'),
        'gAle': ('Adaptador de alertas', 'ManageAlertaGatewayImplAdapter · JPA',
                 'Guarda las alertas y avisa a los administradores.'),
    }),
    ('tareas', 'Tareas programadas', {
        'sVen': ('Tarea de vencimientos', 'Spring @Scheduled · 00:05',
                 'Recordatorios de plazos, reanudación de suspensiones y cierre por vencimiento.'),
        'sSeg': ('Tareas de seguridad', 'Spring @Scheduled · cada 5 min y 03:30',
                 'Detección de alertas e integridad de la auditoría y los archivos.'),
        'sLim': ('Limpieza de accesos', 'Spring @Scheduled · 03:00',
                 'Borra intentos fallidos antiguos y sesiones vencidas.'),
    }),
]

API = 'Hace llamados a la API'
JSON = 'JSON/HTTPS, REST'
# (origen, destino, etiqueta, tecnología, solo_en_secciones)
RELACIONES = [
    ('spa', 'fCorr', API, JSON, False),
    ('fCorr', 'fJwt', 'Pasa la petición', '', False),
    ('fJwt', 'fAud', 'Pasa la petición autenticada', '', False),
    ('fJwt', 'gAuth', 'Valida el token', '', False),
    ('fAud', 'gAud', 'Registra la operación', '', False),
] + [('fAud', c, 'Entrega la petición', '', False)
     for c in ['cAuth', 'cUsr', 'cPerf', 'cCat', 'cCal', 'cNot', 'cTG', 'cRel']] + [
    # en las secciones sin filtros, la SPA llega directo al controlador
    *[('spa', c, API, JSON, True) for c in ['cUsr', 'cPerf', 'cCat', 'cCal', 'cNot', 'cTG']],
    ('cAuth', 'uAuth', 'Usa', '', False),
    ('uAuth', 'gAuth', 'Valida credenciales y sesiones', '', False),
    ('uAuth', 'gAcc', 'Registra intentos fallidos', '', False),
    ('cUsr', 'uUsr', 'Usa', '', False),
    ('uUsr', 'gUsr', 'Lee y guarda', '', False),
    ('uUsr', 'gPerf', 'Guarda el perfil', '', False),
    ('uUsr', 'gAuth', 'Cambia contraseñas y cierra sesiones', '', False),
    ('cPerf', 'uPerf', 'Usa', '', False),
    ('uPerf', 'gPerf', 'Lee y guarda', '', False),
    ('cCat', 'uCat', 'Usa', '', False),
    ('uCat', 'gCat', 'Lee y guarda', '', False),
    ('cCal', 'uCal', 'Usa', '', False),
    ('uCal', 'gCal', 'Lee y guarda', '', False),
    ('cNot', 'uNot', 'Usa', '', False),
    ('uNot', 'gNot', 'Lee y marca', '', False),
    ('cTG', 'uTG', 'Usa', '', False),
    ('uTG', 'dTG', 'Delega las reglas', '', False),
    ('uTG', 'gTG', 'Lee y guarda', '', False),
    ('uTG', 'gArch', 'Guarda los documentos', '', False),
    ('uTG', 'gUsr', 'Carga los participantes', '', False),
    ('uTG', 'notif', 'Informa los hechos', '', False),
    ('dTG', 'gCal', 'Calcula plazos en días hábiles', '', False),
    ('notif', 'gNot', 'Guarda las notificaciones', '', False),
    ('cRel', 'sVen', 'Ejecuta la revisión diaria', '', False),
    ('sVen', 'uTG', 'Revisa plazos y vencimientos', '', False),
    ('sSeg', 'uSeg', 'Detecta alertas', '', False),
    ('sSeg', 'gAud', 'Verifica la cadena', '', False),
    ('sSeg', 'gArch', 'Verifica las huellas', '', False),
    ('uSeg', 'gAud', 'Lee la auditoría reciente', '', False),
    ('uSeg', 'gAle', 'Registra alertas', '', False),
    ('gAle', 'gNot', 'Avisa a los administradores', '', False),
    ('sLim', 'gAcc', 'Borra intentos antiguos', '', False),
    ('sLim', 'gAuth', 'Borra sesiones vencidas', '', False),
] + [(g, 'db', 'Lee y escribe', 'JPA/Hibernate', False)
     for g in ['gAuth', 'gAcc', 'gUsr', 'gPerf', 'gCat', 'gCal', 'gNot', 'gTG', 'gAud', 'gAle']] + [
    ('gArch', 'fs', 'Lee y escribe', 'E/S de archivos', False),
]

SECCIONES = [
    ('c4-nivel3-1-entrada-autenticacion', 'Entrada a la API, autenticación y sesión',
     ['spa', 'fCorr', 'fJwt', 'fAud', 'cAuth', 'uAuth', 'gAuth', 'gAcc', 'gAud', 'db']),
    ('c4-nivel3-2-usuarios-configuracion', 'Usuarios, perfiles y configuración',
     ['spa', 'cUsr', 'cPerf', 'cCat', 'cCal', 'uUsr', 'uPerf', 'uCat', 'uCal',
      'gUsr', 'gPerf', 'gCat', 'gCal', 'gAuth', 'db']),
    ('c4-nivel3-3-trabajo-grado', 'Trabajo de grado',
     ['spa', 'cTG', 'uTG', 'dTG', 'notif', 'gTG', 'gArch', 'gUsr', 'gCal', 'gNot', 'db', 'fs']),
    ('c4-nivel3-4-notificaciones-tareas', 'Notificaciones y tareas programadas',
     ['spa', 'cNot', 'uNot', 'gNot', 'cRel', 'sVen', 'uTG', 'sLim', 'gAcc', 'gAuth', 'db']),
    ('c4-nivel3-5-auditoria-seguridad', 'Auditoría y alertas de seguridad',
     ['fAud', 'sSeg', 'uSeg', 'gAud', 'gAle', 'gArch', 'gNot', 'db', 'fs']),
]

CABECERA = """@startuml {nombre}
' C4 nivel 3 (componentes) de la API de SGTG. Generado por generar.py: no editar a mano.
!include <C4/C4_Component>
LAYOUT_TOP_DOWN()
skinparam dpi 110
UpdateElementStyle("component", $bgColor="#1E5A8E", $fontColor="#FFFFFF", $borderColor="#0B3D66")
UpdateElementStyle("container", $bgColor="#438DD5", $fontColor="#FFFFFF", $borderColor="#2E6295")
AddRelTag("p", $lineStyle=DashedLine())

title {titulo}
"""


def esc(t):
    return t.replace('"', "'")


def generar(nombre, titulo, incluidos=None, completo=False):
    todos = set(EXTERNOS)
    for _, _, comps in GRUPOS:
        todos |= set(comps)
    inc = set(incluidos) if incluidos else todos
    out = [CABECERA.format(nombre=nombre, titulo=titulo)]
    for a, (tipo, n, tec, d) in EXTERNOS.items():
        if a in inc:
            out.append(f'{tipo}({a}, "{esc(n)}", "{esc(tec)}", "{esc(d)}")')
    out.append('Container_Boundary(api, "API de la aplicación (Java y Spring Boot)") {')
    for g, titulo_g, comps in GRUPOS:
        presentes = [a for a in comps if a in inc]
        if not presentes:
            continue
        out.append(f'  Boundary({g}, "{titulo_g}") {{')
        for a in presentes:
            n, tec, d = comps[a]
            out.append(f'    Component({a}, "{esc(n)}", "{esc(tec)}", "{esc(d)}")')
        out.append('  }')
    out.append('}')
    for o, d, et, tec, solo_seccion in RELACIONES:
        if o not in inc or d not in inc:
            continue
        if solo_seccion and (completo or 'fCorr' in inc):
            continue
        out.append(f'Rel({o}, {d}, "{esc(et)}", "{esc(tec)}", $tags="p")')
    out.append('@enduml\n')
    open(os.path.join(AQUI, nombre + '.puml'), 'w', encoding='utf-8').write('\n'.join(out))


for nombre, titulo, inc in SECCIONES:
    generar(nombre, f'SGTG API — C4 nivel 3: {titulo}', inc)
generar('c4-nivel3-componentes-api', 'SGTG API — C4 nivel 3 (componentes)', completo=True)
print('ok')
