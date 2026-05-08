"""Generador de Acta de Entrega de Equipo.

Usa reportlab y devuelve bytes del PDF.
"""

import io
from datetime import date, datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen.canvas import Canvas

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
) -> bytes:
    """Genera el PDF de acta de entrega y devuelve bytes.

    `asignacion` debe incluir: usuario_nombre, cargo, area, fecha_asignacion,
    placa, serial, marca, modelo, tipo_equipo, observaciones.
    """

    accesorios_entregados = accesorios_entregados or []
    entregado_por = entregado_por or "Sistema"

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
