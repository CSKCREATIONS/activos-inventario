"""Generador de Acta de Entrega de Equipo.

Usa reportlab y devuelve bytes del PDF.
"""

import io
from datetime import date, datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen.canvas import Canvas
from pathlib import Path
try:
    from pypdf import PdfReader, PdfWriter
except Exception:
    from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# Reusar paleta similar a hoja_vida_pdf.py
C_HEADER = colors.HexColor("#1E3A5F")
C_SEC = colors.HexColor("#D9E1F2")
C_LABEL = colors.HexColor("#BDD7EE")
C_ALT = colors.HexColor("#F2F6FC")
C_BORDER = colors.HexColor("#8EA9C1")
C_WHITE = colors.white
C_BLACK = colors.black

PW, PH = LETTER
MX = 18 * mm
MY = 18 * mm
USEW = PW - 2 * MX

# Defaults: can be overridden when we detect/register template fonts
DEFAULT_FONT = "Helvetica"
DEFAULT_FONT_BOLD = "Helvetica-Bold"


def _rect(c: Canvas, x, y, w, h, *, fill=None, stroke=True):
    c.saveState()
    if fill:
        c.setFillColor(fill)
        c.rect(x, y, w, h, fill=1, stroke=0)
    if stroke:
        c.setStrokeColor(C_BORDER)
        c.setLineWidth(0.4)
        c.rect(x, y, w, h, fill=0, stroke=1)
    c.restoreState()


def _clip(text: str, c: Canvas, max_w: float, size: float) -> str:
    from reportlab.pdfbase.pdfmetrics import stringWidth

    text = str(text or "")
    while text and stringWidth(text, c._fontname, size) > max_w:
        text = text[:-2] + "…"
    return text


def _text(
    c: Canvas,
    text: str,
    x,
    y,
    w,
    h,
    *,
    size=8,
    bold=False,
    color=C_BLACK,
    align="left",
):
    text = str(text or "")
    c.saveState()
    # Use detected/registered default fonts to better match the plantilla
    fname = DEFAULT_FONT_BOLD if bold else DEFAULT_FONT
    try:
        c.setFont(fname, size)
    except Exception:
        # fallback
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.setFillColor(color)
    ty = y + (h - size) / 2 + 0.5
    if align == "center":
        c.drawCentredString(x + w / 2, ty, _clip(text, c, w - 4, size))
    elif align == "right":
        c.drawRightString(x + w - 2, ty, _clip(text, c, w - 4, size))
    else:
        c.drawString(x + 3, ty, _clip(text, c, w - 6, size))
    c.restoreState()


def _sec_header(c: Canvas, title: str, x, y, w, h=14) -> float:
    _rect(c, x, y - h, w, h, fill=C_SEC)
    _text(c, title, x, y - h, w, h, bold=True, size=9, align="center")
    return y - h


def _fmt_date(val) -> str:
    if not val:
        return ""
    if isinstance(val, (date, datetime)):
        return val.strftime("%d/%m/%Y")
    try:
        d = datetime.strptime(str(val)[:10], "%Y-%m-%d")
        return d.strftime("%d/%m/%Y")
    except Exception:
        return str(val)


def generar_acta_entrega_pdf(
    asignacion: dict,
    *,
    accesorios_opciones: list[str],
    accesorios_entregados: list[str] | None = None,
    entregado_por: str | None = None,
    plantilla_path: str | None = None,
) -> bytes:
    """Genera el PDF de acta de entrega y devuelve bytes.

    `asignacion` debe incluir: usuario_nombre, cargo, area, fecha_asignacion,
    placa, serial, marca, modelo, tipo_equipo, observaciones.
    """

    accesorios_entregados = accesorios_entregados or []
    entregado_por = entregado_por or ""

    buf = io.BytesIO()
    c = Canvas(buf, pagesize=LETTER)

    x0 = MX
    y = PH - MY

    # Cabecera principal (logo / título) + campos pequeños a la derecha (Código / Fecha / Versión)
    cab_h = 20 * mm
    _rect(c, x0, y - cab_h, USEW, cab_h, fill=C_HEADER, stroke=False)
    c.saveState()
    c.setFillColor(C_WHITE)
    c.setFont("Helvetica-Bold", 15)
    accesorios_entregados = accesorios_entregados or []
    entregado_por = entregado_por or ""

    # Si hay una plantilla PDF disponible, la usamos como fondo y superponemos solo los campos.
    if plantilla_path is None:
        # Resolver la plantilla respecto a la raíz del repo, no al cwd del servidor
        repo_root = Path(__file__).resolve().parents[2]
        default_tpl = repo_root / 'Doc' / 'Julian Castro Sena Acta.pdf'
        if default_tpl.exists():
            plantilla_path = str(default_tpl)

    if plantilla_path and Path(plantilla_path).exists():
        # Intentar detectar y registrar fuentes usadas en la plantilla
        def _register_template_fonts(path: str):
            global DEFAULT_FONT, DEFAULT_FONT_BOLD
            try:
                tpl_check = PdfReader(path)
            except Exception:
                return
            found = set()
            for p in tpl_check.pages:
                try:
                    res = p.get('/Resources') or p.get('Resources')
                except Exception:
                    res = None
                if not res:
                    continue
                fonts = None
                try:
                    fonts = res.get('/Font') or res.get('Font')
                except Exception:
                    fonts = None
                if not fonts:
                    continue
                for k, v in fonts.items():
                    try:
                        bf = v.get('/BaseFont') or v.get('BaseFont')
                        if bf:
                            found.add(str(bf))
                    except Exception:
                        continue

            fonts_dir = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'
            if not fonts_dir.exists():
                return

            for bf in found:
                name = str(bf).strip('/').lower()
                # try to find a matching ttf file in Windows fonts
                candidates = [p for p in fonts_dir.iterdir() if name.replace('ps', '').replace('-', '').replace('_', '') in p.name.lower() or name.split('+')[-1].lower() in p.name.lower()]
                # fallback mapping for common fonts
                if not candidates:
                    mapping = {
                        'arial': ['arial.ttf', 'arialbd.ttf'],
                        'times': ['times.ttf', 'timesbd.ttf', 'times.ttf'],
                        'helvetica': ['arial.ttf'],
                        'calibri': ['calibri.ttf', 'calibrib.ttf'],
                    }
                    for k, files in mapping.items():
                        if k in name:
                            for fn in files:
                                p = fonts_dir / fn
                                if p.exists():
                                    candidates.append(p)
                                    break
                if not candidates:
                    continue
                font_file = candidates[0]
                font_reg_name = font_file.stem
                try:
                    pdfmetrics.registerFont(TTFont(font_reg_name, str(font_file)))
                    DEFAULT_FONT = font_reg_name
                    # try to find bold variant
                    bold_candidates = [p for p in candidates if 'bd' in p.name.lower() or 'bold' in p.name.lower()]
                    if bold_candidates:
                        bold_file = bold_candidates[0]
                        bold_name = bold_file.stem
                        pdfmetrics.registerFont(TTFont(bold_name, str(bold_file)))
                        DEFAULT_FONT_BOLD = bold_name
                    else:
                        DEFAULT_FONT_BOLD = DEFAULT_FONT
                    # Only register first match
                    break
                except Exception:
                    continue

        _register_template_fonts(plantilla_path)

        # Si no se proporcionó información relevante, devolver la plantilla tal cual
        keys_to_check = [
            'usuario_nombre',
            'cargo',
            'area',
            'fecha_asignacion',
            'placa',
            'serial',
            'marca',
            'modelo',
            'tipo_equipo',
            'observaciones',
        ]
        has_data = any(bool(asignacion.get(k)) for k in keys_to_check) or bool(accesorios_entregados) or bool(entregado_por)
        if not has_data:
            return Path(plantilla_path).read_bytes()

        # Crear overlay con reportlab (una página por cada página de la plantilla)
        overlay = io.BytesIO()
        oc = Canvas(overlay, pagesize=LETTER)

        x0 = MX
        y = PH - MY

        tpl = PdfReader(plantilla_path)
        n_pages = len(tpl.pages)

        # Construir una página overlay por cada página de la plantilla.
        for pi in range(n_pages):
            # Solo dibujamos contenido en la primera página (ajustable si se necesitan más)
            if pi == 0:
                # Avanzar debajo del header de la plantilla (ajustado para coincidir mejor con la plantilla)
                cab_h = 20 * mm
                yy = PH - MY - cab_h + 2 * mm

                # Fecha (solo el valor dentro de la cajita) y entregado_por (derecha)
                meta_h = 12
                fecha_val = asignacion.get('fecha_asignacion') or asignacion.get('fecha_acta')
                fecha_txt = _fmt_date(fecha_val)
                if fecha_txt:
                    _text(oc, fecha_txt, x0 + 6, yy - meta_h, 140, meta_h, size=9, align='center')
                if entregado_por:
                    _text(oc, entregado_por, x0 + USEW / 2, yy - meta_h, USEW / 2 - 6, meta_h, size=9, align='left')
                yy -= meta_h + 4

                # Bloque datos del funcionario
                sec_h = 10
                yy -= sec_h

                ROW = 14
                # Ajuste: reducir ancho del label para que el nombre quede más a la izquierda
                label_w = 90

                nombre = asignacion.get('usuario_nombre') or ''
                cargo = asignacion.get('cargo') or ''
                area = asignacion.get('area') or ''
                data_x = x0 + label_w + 6
                data_w = USEW - label_w - 12
                if nombre:
                    _text(oc, nombre, data_x, yy - ROW, data_w, ROW, size=9)
                yy -= ROW
                if cargo:
                    _text(oc, cargo, data_x, yy - ROW, data_w, ROW, size=9)
                yy -= ROW
                if area:
                    _text(oc, area, data_x, yy - ROW, data_w, ROW, size=9)
                yy -= ROW

                yy -= 6

                # Avanzar header de 'CARACTERÍSTICAS...'
                hdr_h = ROW
                yy -= hdr_h
                # Corregir posible deslizamiento: ajustar inicio de filas de periféricos
                yy += ROW

                # Posiciones de datos del equipo: columnas (PERIFÉRICO | CANTIDAD | REFERENCIA | ACTIVO)
                # Ajustes de ancho para alinear con plantilla
                per_label_w = 120
                qty_w = 50
                activo_w = 110
                ref_w = USEW - per_label_w - qty_w - activo_w
                label_x = x0
                qty_x = x0 + per_label_w
                ref_x = qty_x + qty_w
                activo_x = ref_x + ref_w

                # Filas tal cual aparecen en la plantilla
                per_rows = [
                    'EQUIPO',
                    'MONITOR',
                    'TECLADO',
                    'MOUSE',
                    'PARLANTES',
                    'LECTOR CÓDIGO DE BARRAS',
                    'IMPRESORA',
                ]

                def _norm_label_key(lbl: str) -> str:
                    k = lbl.lower()
                    k = k.replace(' ', '_').replace('-', '_')
                    for a, b in [('á','a'),('é','e'),('í','i'),('ó','o'),('ú','u')]:
                        k = k.replace(a, b)
                    return k

                def pick(*keys):
                    for kk in keys:
                        v = asignacion.get(kk)
                        if v:
                            return str(v)
                    return ''

                for label in per_rows:
                    lk = _norm_label_key(label)

                    # cantidad: por defecto 1 para equipo, monitor, teclado y mouse
                    if lk in ('equipo', 'monitor', 'teclado', 'mouse'):
                        qty_val = pick(f'{lk}_cantidad', 'cantidad') or '1'
                    else:
                        qty_val = pick(f'{lk}_cantidad',)

                    # referencia: buscar por prioridad en campos específicos luego genéricos
                    ref_val = pick(
                        f'{lk}_referencia',
                        f'{lk}_modelo',
                        f'{lk}_marca',
                        'referencia',
                        'modelo',
                        'tipo_equipo',
                        'marca',
                    )

                    # activo: placa/activo/serial preferidos
                    activo_val = pick(
                        f'{lk}_placa',
                        f'{lk}_activo',
                        f'{lk}_serial',
                        'placa',
                        'activo',
                        'serial',
                    )

                    # Dibujar en sus columnas correspondientes
                    if qty_val:
                        _text(oc, qty_val, qty_x, yy - ROW, qty_w, ROW, size=8, align='center')
                    if ref_val:
                        _text(oc, ref_val, ref_x, yy - ROW, ref_w, ROW, size=9)
                    if activo_val:
                        _text(oc, activo_val, activo_x, yy - ROW, activo_w - 6, ROW, size=8)

                    yy -= ROW

                yy -= 8

                # Avanzar header de 'ACCESORIOS'
                yy -= sec_h
                # Avanzar fila header
                yy -= ROW

                # Accesorios list
                acc_items = ["REGULADOR", "EXTENSIÓN", "UPS", "TELÉFONO", "OTROS"]
                acc_label_w = USEW * 0.5
                acc_qty_w = 40
                acc_ref_w = USEW - acc_label_w - acc_qty_w
                for i, acc in enumerate(acc_items):
                    cantidad = '1' if acc in accesorios_entregados else ''
                    ref = acc if acc in accesorios_entregados else ''
                    if cantidad:
                        _text(oc, cantidad, x0 + acc_label_w, yy - ROW, acc_qty_w, ROW, size=8, align='center')
                    if ref:
                        _text(oc, ref, x0 + acc_label_w + acc_qty_w, yy - ROW, acc_ref_w, ROW, size=8)
                    yy -= ROW

                yy -= 10

                # Observaciones
                yy -= sec_h
                obs_h = 48
                obs = str(asignacion.get('observaciones') or '')
                if obs:
                    oc.setFont(DEFAULT_FONT, 8)
                    ty = yy - 14
                    for line in obs.splitlines():
                        oc.drawString(x0 + 6, ty, line)
                        ty -= 10

            # finalizar página overlay (vacía o con contenido)
            oc.showPage()

        oc.save()
        overlay.seek(0)

        # Merge overlay sobre plantilla, página por página
        over = PdfReader(overlay)
        for i in range(len(tpl.pages)):
            if i < len(over.pages):
                try:
                    tpl.pages[i].merge_page(over.pages[i])
                except Exception:
                    # fallback to older method name (PyPDF2)
                    try:
                        tpl.pages[i].mergePage(over.pages[i])
                    except Exception:
                        pass

        writer = PdfWriter()
        for p in tpl.pages:
            writer.add_page(p)
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    # Si no existe plantilla, usar generación completa por código (fallback)
    buf = io.BytesIO()
    c = Canvas(buf, pagesize=LETTER)

    x0 = MX
    y = PH - MY

    # Cabecera
    cab_h = 18 * mm
    _rect(c, x0, y - cab_h, USEW, cab_h, fill=C_HEADER, stroke=False)
    c.saveState()
    c.setFillColor(C_WHITE)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(PW / 2, y - cab_h / 2 - 5, "ACTA DE ENTREGA DE EQUIPO")
    c.setFont("Helvetica", 8)
    acta_id = str(asignacion.get("id", ""))
    c.drawCentredString(PW / 2, y - cab_h + 5, f"N° {acta_id[:8].upper()}")
    c.restoreState()
    y -= cab_h + 6

    # Meta
    meta_h = 12
    _rect(c, x0, y - meta_h, USEW, meta_h, fill=C_WHITE)
    _text(
        c,
        f"Fecha: {_fmt_date(asignacion.get('fecha_asignacion') or date.today())}",
        x0,
        y - meta_h,
        USEW / 2,
        meta_h,
        size=8,
        bold=True,
    )
    _text(
        c,
        f"Entregado por: {entregado_por}",
        x0 + USEW / 2,
        y - meta_h,
        USEW / 2,
        meta_h,
        size=8,
        bold=True,
    )
    y -= meta_h + 10

    ROW = 14
    label_w = 90

    # Datos del funcionario
    y = _sec_header(c, "DATOS DEL FUNCIONARIO", x0, y, USEW)

    funcionario_rows = [
        ("Nombre", asignacion.get("usuario_nombre")),
        ("Cargo", asignacion.get("cargo")),
        ("Área", asignacion.get("area")),
    ]
    for i, (k, v) in enumerate(funcionario_rows):
        bg = C_ALT if i % 2 else C_WHITE
        _rect(c, x0, y - ROW, USEW, ROW, fill=bg, stroke=False)
        _rect(c, x0, y - ROW, USEW, ROW)
        _rect(c, x0, y - ROW, label_w, ROW, fill=C_LABEL)
        _text(c, k, x0, y - ROW, label_w, ROW, bold=True)
        _text(c, v or "", x0 + label_w, y - ROW, USEW - label_w, ROW)
        y -= ROW

    y -= 6

    # Datos del equipo
    y = _sec_header(c, "DATOS DEL EQUIPO", x0, y, USEW)

    equipo_rows = [
        ("Tipo", asignacion.get("tipo_equipo")),
        ("Placa", asignacion.get("placa")),
        ("Serial", asignacion.get("serial")),
        ("Marca", asignacion.get("marca")),
        ("Modelo", asignacion.get("modelo")),
    ]
    for i, (k, v) in enumerate(equipo_rows):
        bg = C_ALT if i % 2 else C_WHITE
        _rect(c, x0, y - ROW, USEW, ROW, fill=bg, stroke=False)
        _rect(c, x0, y - ROW, USEW, ROW)
        _rect(c, x0, y - ROW, label_w, ROW, fill=C_LABEL)
        _text(c, k, x0, y - ROW, label_w, ROW, bold=True)
        _text(c, v or "", x0 + label_w, y - ROW, USEW - label_w, ROW)
        y -= ROW

    y -= 6

    # Checklist accesorios
    y = _sec_header(c, "CHECKLIST DE ACCESORIOS", x0, y, USEW)

    box = 8
    col_w = USEW / 2
    row_h = 12

    if not accesorios_opciones:
        accesorios_opciones = []

    # Render 2 columnas
    for idx, label in enumerate(accesorios_opciones):
        col = idx % 2
        row = idx // 2
        cx = x0 + col * col_w
        cy = y - row_h * (row + 1)
        _rect(c, cx, cy, col_w, row_h, fill=C_WHITE)
        bx = cx + 6
        by = cy + (row_h - box) / 2
        _rect(c, bx, by, box, box, fill=C_WHITE)
        if label in accesorios_entregados:
            c.saveState()
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(C_HEADER)
            c.drawCentredString(bx + box / 2, by + 0.5, "✓")
            c.restoreState()
        _text(c, label, bx + box + 6, cy, col_w - (box + 18), row_h, size=8)

    rows_count = (len(accesorios_opciones) + 1) // 2
    y -= max(rows_count, 1) * row_h

    # Accesorios extra (no tipificados)
    extras = [a for a in accesorios_entregados if a not in accesorios_opciones]
    if extras:
        y -= 6
        _rect(c, x0, y - ROW, USEW, ROW, fill=C_WHITE)
        _rect(c, x0, y - ROW, label_w, ROW, fill=C_LABEL)
        _text(c, "Otros", x0, y - ROW, label_w, ROW, bold=True)
        _text(c, ", ".join(extras), x0 + label_w, y - ROW, USEW - label_w, ROW)
        y -= ROW

    y -= 10

    # Observaciones
    y = _sec_header(c, "OBSERVACIONES", x0, y, USEW)
    obs_h = 42
    _rect(c, x0, y - obs_h, USEW, obs_h, fill=C_WHITE)
    obs = str(asignacion.get("observaciones") or "")
    c.saveState()
    c.setFont("Helvetica", 8)
    c.setFillColor(C_BLACK)
    text = c.beginText(x0 + 6, y - 14)
    max_chars = 110
    for line in (obs.splitlines() or [""]):
        while len(line) > max_chars:
            text.textLine(line[:max_chars])
            line = line[max_chars:]
        text.textLine(line)
    c.drawText(text)
    c.restoreState()
    y -= obs_h + 14

    # Firmas
    sig_h = 34
    _rect(c, x0, y - sig_h, USEW, sig_h, fill=C_WHITE)
    c.saveState()
    c.setStrokeColor(C_BORDER)
    c.setLineWidth(0.6)
    mid = x0 + USEW / 2
    c.line(x0 + 25, y - 18, mid - 25, y - 18)
    c.line(mid + 25, y - 18, x0 + USEW - 25, y - 18)
    c.restoreState()

    _text(
        c,
        "Entregado por",
        x0,
        y - sig_h,
        USEW / 2,
        sig_h,
        size=8,
        align="center",
    )
    _text(
        c,
        "Recibido por",
        x0 + USEW / 2,
        y - sig_h,
        USEW / 2,
        sig_h,
        size=8,
        align="center",
    )

    # Pie
    c.saveState()
    c.setFont("Helvetica", 6)
    c.setFillColor(colors.grey)
    c.drawCentredString(
        PW / 2,
        MY - 8,
        f"Documento generado automáticamente el {_fmt_date(date.today())} — Sistema de Inventario",
    )
    c.restoreState()

    c.showPage()
    c.save()
    return buf.getvalue()
