"""Casos de seguridad sobre la interfaz (Playwright). Los llama seguridad.py; si Playwright no está instalado,
esos casos quedan pendientes y el resto de la corrida sigue."""
import datetime as dt
import os

from playwright.sync_api import sync_playwright

WEB = 'http://localhost:4220'


def _con_barra(ruta, url):
    try:
        import terminal
        terminal.con_barra(ruta, url)
    except ImportError:
        pass  # sin Pillow la captura queda sin la barra de dirección


def _abrir(pw):
    for canal in ('msedge', 'chrome', None):  # el navegador que haya en el equipo
        try:
            return pw.chromium.launch(channel=canal) if canal else pw.chromium.launch()
        except Exception:
            continue
    raise RuntimeError('No se encontró un navegador. Instale uno con: python -m playwright install chromium')


def _pagina(browser, reloj=False):
    ctx = browser.new_context(viewport={'width': 1440, 'height': 810}, locale='es-CO',
                              timezone_id='America/Bogota')
    page = ctx.new_page()
    if reloj:  # reloj controlable, para adelantar el tiempo en la prueba de inactividad
        page.clock.install(time=dt.datetime.now())
    page.set_default_timeout(15000)
    return page


def _esperar(page, ms=1500):
    try:
        page.wait_for_load_state('networkidle', timeout=6000)
    except Exception:
        pass
    page.wait_for_timeout(ms)


def _login(page, email, password, esperar_salida=True):
    page.goto(WEB + '/auth/login')
    page.fill('#email', email)
    page.fill('#password', password)
    page.get_by_role('button', name='Iniciar sesión').click()
    if esperar_salida:
        page.wait_for_url(lambda u: '/auth/login' not in u)
    _esperar(page)


def _captura(caso, page, salida, nombre):
    ruta = os.path.join(salida, f'{caso.id}_{nombre}.png')
    page.screenshot(path=ruta)
    _con_barra(ruta, page.url)
    caso.capturas.append(ruta)


def _menu(page, texto):
    return page.get_by_text(texto, exact=True).count() > 0


def antes_del_limite(CASOS, U, CLAVE, CLAVE_ASIGNADA, ADMIN_EMAIL, admin_pass, salida, ejecutar):
    with sync_playwright() as pw:
        browser = _abrir(pw)

        def seg01(c):
            for ruta in ('/users', '/thesis-work', '/notifications'):
                p = _pagina(browser)
                p.goto(WEB + ruta)
                _esperar(p)
                c.verificar(f'sin sesión, {ruta} lleva al inicio de sesión', '/auth/login' in p.url)
                if ruta == '/users':
                    _captura(c, p, salida, 'sin_sesion')
                p.context.close()

        def seg02_03(c2, c3):
            p = _pagina(browser)
            _login(p, U['estudiante'], CLAVE)
            c3.verificar('el estudiante no ve Usuarios ni Estadísticas en el menú',
                         not _menu(p, 'Usuarios') and not _menu(p, 'Estadísticas'))
            _captura(c3, p, salida, 'menu_estudiante')
            for ruta in ('/users', '/statistics'):
                p.goto(WEB + ruta)
                _esperar(p)
                c2.verificar(f'el estudiante que escribe {ruta} queda en su bandeja de entrada',
                             p.url.endswith('/notifications'))
                if ruta == '/users':
                    _captura(c2, p, salida, 'estudiante_users')
            p.context.close()
            p = _pagina(browser)
            _login(p, U['director'], CLAVE)
            c3.verificar('el director ve Estadísticas pero no Usuarios',
                         _menu(p, 'Estadísticas') and not _menu(p, 'Usuarios'))
            _captura(c3, p, salida, 'menu_director')
            p.context.close()
            p = _pagina(browser)
            _login(p, ADMIN_EMAIL, admin_pass)
            c3.verificar('el administrador ve Usuarios y Estadísticas',
                         _menu(p, 'Usuarios') and _menu(p, 'Estadísticas'))
            _captura(c3, p, salida, 'menu_admin')
            p.context.close()

        def seg07(c):
            p = _pagina(browser)
            _login(p, U['bloqueo'], CLAVE, esperar_salida=False)
            p.wait_for_timeout(1500)
            c.verificar('la pantalla de inicio de sesión muestra el bloqueo',
                        p.get_by_text('Demasiados intentos fallidos', exact=False).count() > 0)
            _captura(c, p, salida, 'pantalla_bloqueo')
            p.context.close()

        def seg13_14(c13, c14):
            p = _pagina(browser)
            _login(p, U['nuevo'], CLAVE_ASIGNADA)
            c13.verificar('al iniciar sesión lo lleva a cambiar la contraseña', '/auth/cambiar-password' in p.url)
            p.goto(WEB + '/notifications')
            _esperar(p)
            c13.verificar('al escribir otra dirección sigue en el cambio de contraseña',
                          '/auth/cambiar-password' in p.url)
            _captura(c13, p, salida, 'cambio_obligatorio')
            campos = p.locator('input[type=password]')
            campos.nth(1).fill('valentina2026')
            campos.nth(2).fill('valentina2026')
            p.wait_for_timeout(800)
            boton = p.get_by_role('button', name='Cambiar contraseña')
            c14.verificar('con una contraseña que no cumple la política no se puede enviar el formulario',
                          boton.is_disabled())
            _captura(c14, p, salida, 'formulario')
            p.context.close()

        def seg12(c):
            p = _pagina(browser, reloj=True)
            _login(p, U['docente'], CLAVE)
            _captura(c, p, salida, 'antes')
            p.clock.fast_forward('31:00')
            p.wait_for_timeout(2500)
            _esperar(p, 500)
            c.verificar('tras 31 minutos sin actividad vuelve al inicio de sesión', '/auth/login' in p.url)
            c.verificar('muestra el aviso de sesión cerrada por inactividad',
                        p.get_by_text('Sesión cerrada por inactividad').count() > 0)
            _captura(c, p, salida, 'inactividad')
            p.context.close()

        ejecutar(seg01, CASOS['SEG-01'])
        ejecutar(lambda c: seg02_03(c, CASOS['SEG-03']), CASOS['SEG-02'])
        ejecutar(seg07, CASOS['SEG-07'])
        ejecutar(lambda c: seg13_14(c, CASOS['SEG-14']), CASOS['SEG-13'])
        ejecutar(seg12, CASOS['SEG-12'])
        browser.close()


def despues_del_limite(CASOS, ADMIN_EMAIL, admin_pass, salida, ejecutar):
    with sync_playwright() as pw:
        browser = _abrir(pw)

        def seg19(c):
            p = _pagina(browser)
            _login(p, ADMIN_EMAIL, admin_pass)
            p.goto(WEB + '/notifications')
            _esperar(p)
            c.verificar('las alertas llegan a la bandeja de entrada del administrador',
                        p.get_by_text('Alerta de seguridad', exact=False).count() > 0)
            _captura(c, p, salida, 'bandeja_admin')
            p.context.close()

        ejecutar(seg19, CASOS['SEG-19'])
        browser.close()
