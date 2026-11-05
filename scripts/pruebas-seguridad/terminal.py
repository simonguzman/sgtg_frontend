"""Dibuja la transcripción real de un caso (comandos y su salida) como una imagen con aspecto de terminal,
para usarla como evidencia en el Anexo 8. Necesita Pillow; si no está, seguridad.py solo guarda el .txt."""
import os
import re
import textwrap

from PIL import Image, ImageDraw, ImageFont

COLUMNAS = 118
ALTO_LINEA = 26
MARGEN = 22
FONDO = (30, 30, 46)
BARRA = (24, 24, 37)
C_PROMPT = (137, 220, 140)
C_CMD = (230, 230, 240)
C_SALIDA = (205, 214, 244)
C_NOTA = (147, 153, 178)
C_OK = (137, 220, 140)
C_ERROR = (243, 139, 168)
C_AVISO = (250, 179, 135)


def _fuente(negrita=False):
    candidatas = [r'C:\Windows\Fonts\consolab.ttf' if negrita else r'C:\Windows\Fonts\consola.ttf',
                  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf' if negrita
                  else '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
                  '/System/Library/Fonts/Menlo.ttc']
    for ruta in candidatas:
        if os.path.exists(ruta):
            return ImageFont.truetype(ruta, 19)
    return ImageFont.load_default()


F = _fuente()
FB = _fuente(True)


def _lineas(entradas):
    res = []
    for tipo, texto in entradas:
        if tipo == '#':
            if res:
                res.append(('', ''))
            res += [('nota', '# ' + l) for l in textwrap.wrap(texto, COLUMNAS - 2)]
        elif tipo == '$':
            for i, l in enumerate(texto.split('\n')):
                for j, trozo in enumerate(textwrap.wrap(l, COLUMNAS - 2, drop_whitespace=False) or ['']):
                    res.append(('cmd0' if i == 0 and j == 0 else 'cmd', trozo))
        else:
            for l in texto.split('\n'):
                if l.strip():
                    res += [('salida', l[k:k + COLUMNAS]) for k in range(0, len(l), COLUMNAS)]
    return res


def _color(t):
    m = re.search(r'HTTP[/ 0-9.]*?\b([1-5]\d\d)\b', t)
    if t.startswith('→') and m:
        codigo = int(m.group(1))
        return C_OK if codigo < 300 else (C_AVISO if codigo in (413, 429) else C_ERROR)
    if t.startswith('ERROR'):
        return C_ERROR
    if 'found 0 vulnerabilities' in t:
        return C_OK
    return C_SALIDA


def dibujar(entradas, ruta, titulo='bash — pruebas de seguridad SGTG'):
    lineas = _lineas(entradas)
    ancho = MARGEN * 2 + int(F.getlength('M') * COLUMNAS) + 10
    alto = 40 + MARGEN * 2 + ALTO_LINEA * len(lineas)
    im = Image.new('RGB', (ancho, alto), FONDO)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, ancho, 40), fill=BARRA)
    for i, c in enumerate([(243, 139, 168), (249, 226, 175), (166, 227, 161)]):
        d.ellipse((16 + i * 24, 13, 30 + i * 24, 27), fill=c)
    d.text((ancho / 2, 20), titulo, font=F, fill=C_NOTA, anchor='mm')
    y, x = 40 + MARGEN, MARGEN
    sangria = F.getlength('$ ')
    for tipo, t in lineas:
        if tipo == 'nota':
            d.text((x, y), t, font=F, fill=C_NOTA)
        elif tipo == 'cmd0':
            d.text((x, y), '$ ', font=FB, fill=C_PROMPT)
            d.text((x + sangria, y), t, font=F, fill=C_CMD)
        elif tipo == 'cmd':
            d.text((x + sangria, y), t, font=F, fill=C_CMD)
        elif tipo == 'salida':
            d.text((x, y), t, font=FB if t.startswith('→') else F, fill=_color(t))
        y += ALTO_LINEA
    im.save(ruta)


def con_barra(ruta_png, url):
    """Agrega arriba de una captura del navegador una barra con la URL real que tenía la página."""
    fuente = None
    for r in (r'C:\Windows\Fonts\segoeui.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(r):
            fuente = ImageFont.truetype(r, 22)
            break
    fuente = fuente or ImageFont.load_default()
    im = Image.open(ruta_png)
    alto = 56
    lienzo = Image.new('RGB', (im.width, im.height + alto), (222, 225, 230))
    d = ImageDraw.Draw(lienzo)
    d.rounded_rectangle((16, 9, im.width - 16, alto - 9), radius=19, fill=(255, 255, 255))
    d.text((40, alto / 2), url, font=fuente, fill=(40, 40, 40), anchor='lm')
    lienzo.paste(im, (0, alto))
    lienzo.save(ruta_png)
