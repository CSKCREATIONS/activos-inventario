"""
Generador de "Hoja de Vida de Equipos" – formato F-TC-002 v5
Usa reportlab para reproducir fielmente el diseño del formulario adjunto.
"""

import io
from datetime import date, datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen.canvas import Canvas

# ─── Paleta ─────────────────────────────────────────────────────────────────
C_HEADER    = colors.HexColor("#1E3A5F")   # Azul oscuro cabecera
C_SEC       = colors.HexColor("#D9E1F2")   # Azul claro sección
C_LABEL     = colors.HexColor("#BDD7EE")   # Azul etiqueta
C_ALT       = colors.HexColor("#F2F6FC")   # Fila alterna
C_BORDER    = colors.HexColor("#8EA9C1")
C_WHITE     = colors.white
C_BLACK     = colors.black
C_RED       = colors.HexColor("#CC0000")   # Texto PREVENTIVO/CORRECTIVO

PW, PH = LETTER
MX      = 18 * mm   # margen horizontal
MY      = 18 * mm   # margen vertical
USEW    = PW - 2 * MX


# ─── Helpers ────────────────────────────────────────────────────────────────

def _rect(c: Canvas, x, y, w, h, *, fill=None, stroke=True):
    """Dibuja un rectángulo con fondo y/o borde."""
    c.saveState()
    if fill:
        c.setFillColor(fill)
        c.rect(x, y, w, h, fill=1, stroke=0)
    if stroke:
        c.setStrokeColor(C_BORDER)
        c.setLineWidth(0.4)
        c.rect(x, y, w, h, fill=0, stroke=1)
    c.restoreState()


def _text(c: Canvas, text: str, x, y, w, h, *,
          size=7, bold=False, color=C_BLACK, align="center"):
    """Texto vertically-centrado dentro de una celda."""
    text = str(text or "")
    c.saveState()
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.setFillColor(color)
    ty = y + (h - size) / 2 + 0.5
    if align == "center":
        c.drawCentredString(x + w / 2, ty, _clip(text, c, w - 4, size))
    elif align == "right":
        c.drawRightString(x + w - 2, ty, _clip(text, c, w - 4, size))
    else:  # left
        c.drawString(x + 3, ty, _clip(text, c, w - 6, size))
    c.restoreState()


def _clip(text: str, c: Canvas, max_w: float, size: float) -> str:
    """Recorta el texto si supera max_w."""
    from reportlab.pdfbase.pdfmetrics import stringWidth
    while text and stringWidth(text, c._fontname, size) > max_w:
        text = text[:-2] + "…"
    return text


def _sec_header(c: Canvas, title: str, x, y, w, h=14) -> float:
    """Encabezado de sección (fondo celeste, texto negrita centrado)."""
    _rect(c, x, y - h, w, h, fill=C_SEC)
    _text(c, title, x, y - h, w, h, bold=True, size=8)
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


# ─── Función principal ───────────────────────────────────────────────────────

def generar_hoja_vida_pdf(equipo: dict, historial: list[dict] = None) -> bytes:
    """
    Genera el PDF de Hoja de Vida y devuelve bytes.

    :param equipo:    dict con todos los campos del equipo (incluye los de HV).
    :param historial: lista de dicts con {usuario_nombre, cargo, area/ubicacion, fecha_asignacion}.
    """
    if historial is None:
        historial = []

    buf = io.BytesIO()
    c = Canvas(buf, pagesize=LETTER)

    x0 = MX
    # reportlab: y=0 es la base de la página → empezamos desde arriba
    y = PH - MY   # posición superior actual (iremos bajando)

    ROW = 14      # altura estándar de fila

    # ════════════════════════════════════════════════════════════════════════
    # 1. CABECERA
    # ════════════════════════════════════════════════════════════════════════
    logo_w  = 55 * mm
    meta_w  = 45 * mm
    title_w = USEW - logo_w - meta_w
    cab_h   = 18 * mm

    # Logo box
    _rect(c, x0, y - cab_h, logo_w, cab_h, fill=C_WHITE)
    c.saveState()
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(C_HEADER)
    c.drawCentredString(x0 + logo_w / 2, y - cab_h / 2 - 4, "EMPRESA")
    c.restoreState()

    # Título central
    _rect(c, x0 + logo_w, y - cab_h, title_w, cab_h, fill=C_HEADER, stroke=True)
    c.saveState()
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(C_WHITE)
    c.drawCentredString(x0 + logo_w + title_w / 2, y - cab_h / 2 - 5,
                        "HOJA DE VIDA DE EQUIPOS")
    c.restoreState()

    # Meta (Código / Fecha / Versión)
    mx0   = x0 + logo_w + title_w
    rh    = cab_h / 3
    metas = [("Código", "F-TC-002"), ("Fecha", _fmt_date(date.today())), ("Versión", "5")]
    for i, (k, v) in enumerate(metas):
        bg = C_LABEL if i % 2 == 0 else C_WHITE
        _rect(c, mx0, y - cab_h + (2 - i) * rh, meta_w, rh, fill=bg)
        _text(c, f"{k}:  {v}", mx0, y - cab_h + (2 - i) * rh, meta_w, rh, size=7)

    y -= cab_h

    # ─── Fila PLACA / FECHA ───────────────────────────────────────────────
    hw2 = USEW / 2
    placa_lw = 40
    _rect(c, x0, y - ROW, hw2, ROW, fill=C_WHITE)
    _rect(c, x0, y - ROW, placa_lw, ROW, fill=C_LABEL)
    _text(c, "PLACA", x0, y - ROW, placa_lw, ROW, bold=True)
    _text(c, equipo.get("placa", ""), x0 + placa_lw, y - ROW,
          hw2 - placa_lw, ROW, align="left")

    _rect(c, x0 + hw2, y - ROW, hw2, ROW, fill=C_WHITE)
    _rect(c, x0 + hw2, y - ROW, placa_lw, ROW, fill=C_LABEL)
    _text(c, "Fecha", x0 + hw2, y - ROW, placa_lw, ROW, bold=True)
    _text(c, _fmt_date(equipo.get("fecha_registro")),
          x0 + hw2 + placa_lw, y - ROW, hw2 - placa_lw, ROW, align="left")

    y -= ROW

    # ════════════════════════════════════════════════════════════════════════
    # SECCIÓN 1: DATOS DEL EQUIPO
    # ════════════════════════════════════════════════════════════════════════
    y = _sec_header(c, "1. DATOS DEL EQUIPO", x0, y, USEW)

    # Fila Marca + checkboxes Tipo
    tipo_equipo = equipo.get("tipo_equipo", "")
    CHECKBOXES = [
        ("PORTÁTIL",  ["Laptop"]),
        ("TORRE",     ["Desktop"]),
        ("OTROS",     []),
        ("ONLYONE",   ["All-in-one"]),
        ("MONITOR",   ["Monitor"]),
    ]
    marca_label_w = 40
    marca_val_w   = 80
    total_marca_w = marca_label_w + marca_val_w
    tipo_label_w  = 25
    cb_area_w     = USEW - total_marca_w - tipo_label_w
    cb_w          = cb_area_w / len(CHECKBOXES)

    _rect(c, x0, y - ROW, USEW, ROW, fill=C_WHITE)
    _rect(c, x0, y - ROW, marca_label_w, ROW, fill=C_LABEL)
    _text(c, "Marca", x0, y - ROW, marca_label_w, ROW, bold=True)
    _text(c, equipo.get("marca", ""), x0 + marca_label_w, y - ROW, marca_val_w, ROW, align="left")

    tipo_x = x0 + total_marca_w
    _rect(c, tipo_x, y - ROW, tipo_label_w, ROW, fill=C_LABEL)
    _text(c, "Tipo:", tipo_x, y - ROW, tipo_label_w, ROW, bold=True)

    for i, (label, matches) in enumerate(CHECKBOXES):
        cx = tipo_x + tipo_label_w + i * cb_w
        _rect(c, cx, y - ROW, cb_w, ROW)
        # Caja del checkbox
        bx, by, bs = cx + 3, y - ROW + 3, 7
        _rect(c, bx, by, bs, bs, fill=C_WHITE)
        if tipo_equipo in matches:
            c.saveState()
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(C_HEADER)
            c.drawCentredString(bx + bs / 2, by + 0.5, "✓")
            c.restoreState()
        _text(c, label, cx + bs + 5, y - ROW, cb_w - bs - 7, ROW, size=6, align="left")

    # Fila Modelo
    y -= ROW
    _rect(c, x0, y - ROW, USEW, ROW, fill=C_ALT)
    _rect(c, x0, y - ROW, marca_label_w, ROW, fill=C_LABEL)
    _text(c, "Modelo", x0, y - ROW, marca_label_w, ROW, bold=True)
    _text(c, equipo.get("modelo", ""), x0 + marca_label_w, y - ROW,
          USEW - marca_label_w, ROW, align="left")

    y -= ROW

    # ════════════════════════════════════════════════════════════════════════
    # SECCIÓN 2: CONFIGURACIÓN DE HARDWARE
    # ════════════════════════════════════════════════════════════════════════
    y = _sec_header(c, "2. CONFIGURACIÓN DE HARDWARE", x0, y, USEW)

    hw_label_w = 70
    col_w      = USEW / 2

    disco = equipo.get("disco", "") or ""
    tecno = equipo.get("tecnologia", "") or ""
    ssd_val = disco if "SSD" in disco.upper() or "SSD" in tecno.upper() else ""
    hdd_val = disco if "HDD" in disco.upper() else ""
    if not ssd_val and not hdd_val:
        ssd_val = disco  # si no se puede inferir, poner en SSD

    hw_left  = [("Procesador", equipo.get("procesador", "") or ""),
                ("Memoria RAM", equipo.get("ram", "") or ""),
                ("SSD",         ssd_val),
                ("HDD",         hdd_val)]
    hw_right = [("Marca Monitor", equipo.get("marca_monitor", "") or "N.A"),
                ("Placa Monitor", equipo.get("placa_monitor", "") or "N.A"),
                ("Nombre Equipo", equipo.get("nombre_equipo", "") or ""),
                ("",              "")]

    for i, ((lk, lv), (rk, rv)) in enumerate(zip(hw_left, hw_right)):
        bg = C_ALT if i % 2 else C_WHITE
        _rect(c, x0, y - ROW, USEW, ROW, fill=bg, stroke=False)
        _rect(c, x0, y - ROW, USEW, ROW, fill=None)
        # Izquierda
        _rect(c, x0, y - ROW, hw_label_w, ROW, fill=C_LABEL)
        _text(c, lk, x0, y - ROW, hw_label_w, ROW, bold=True)
        _text(c, lv, x0 + hw_label_w, y - ROW, col_w - hw_label_w, ROW, align="left")
        # Derecha
        _rect(c, x0 + col_w, y - ROW, hw_label_w, ROW, fill=C_LABEL)
        _text(c, rk, x0 + col_w, y - ROW, hw_label_w, ROW, bold=True)
        _text(c, rv, x0 + col_w + hw_label_w, y - ROW, col_w - hw_label_w, ROW, align="left")
        y -= ROW

    # ════════════════════════════════════════════════════════════════════════
    # SECCIÓN 3: SISTEMA OPERATIVO
    # ════════════════════════════════════════════════════════════════════════
    y = _sec_header(c, "4. SISTEMA OPERATIVO INSTALADO", x0, y, USEW)

    desc_w = USEW * 0.55
    lic_w  = USEW - desc_w

    # Sub-cabecera
    _rect(c, x0, y - ROW, desc_w, ROW, fill=C_LABEL)
    _rect(c, x0 + desc_w, y - ROW, lic_w, ROW, fill=C_LABEL)
    _text(c, "Descripción", x0, y - ROW, desc_w, ROW, bold=True)
    _text(c, "Licenciamiento", x0 + desc_w, y - ROW, lic_w, ROW, bold=True)
    y -= ROW

    so_name = " ".join(filter(None, [
        equipo.get("sistema_operativo", ""),
        equipo.get("version_so", ""),
    ]))
    so_rows = [
        (so_name, equipo.get("licenciamiento_so", "") or ""),
        ("OFFICE HOGAR Y EMPRESAS 2016", equipo.get("licenciamiento_office", "") or ""),
    ]
    for i, (d, l) in enumerate(so_rows):
        bg = C_ALT if i % 2 else C_WHITE
        _rect(c, x0, y - ROW, USEW, ROW, fill=bg, stroke=False)
        _rect(c, x0, y - ROW, USEW, ROW)
        _text(c, d, x0, y - ROW, desc_w, ROW, align="left")
        _text(c, l, x0 + desc_w, y - ROW, lic_w, ROW, align="left")
        y -= ROW

    # ════════════════════════════════════════════════════════════════════════
    # SECCIÓN 4: ASIGNACIÓN Y REASIGNACIÓN
    # ════════════════════════════════════════════════════════════════════════
    y = _sec_header(c, "5. ASIGNACION Y REASIGNACION", x0, y, USEW)

    a_cols = [USEW * 0.30, USEW * 0.28, USEW * 0.22, USEW * 0.20]
    a_hdrs = ["Usuario Responsable", "Cargo", "Ubicacion equipo", "Fecha"]

    # Cabecera tabla
    cx = x0
    for w, h in zip(a_cols, a_hdrs):
        _rect(c, cx, y - ROW, w, ROW, fill=C_LABEL)
        _text(c, h, cx, y - ROW, w, ROW, bold=True, size=7)
        cx += w
    y -= ROW

    rows_data = historial[:5] if historial else []
    for i in range(6):
        row = rows_data[i] if i < len(rows_data) else {}
        bg = C_ALT if i % 2 else C_WHITE
        _rect(c, x0, y - ROW, USEW, ROW, fill=bg, stroke=False)
        _rect(c, x0, y - ROW, USEW, ROW)
        vals = [
            row.get("usuario_nombre", ""),
            row.get("cargo", ""),
            row.get("area") or row.get("ubicacion", ""),
            _fmt_date(row.get("fecha_asignacion")) if row else "",
        ]
        cx = x0
        for val, w in zip(vals, a_cols):
            _text(c, val, cx, y - ROW, w, ROW, align="left", size=7)
            cx += w
        y -= ROW

    # ════════════════════════════════════════════════════════════════════════
    # SECCIÓN 5: MANTENIMIENTOS
    # ════════════════════════════════════════════════════════════════════════
    y = _sec_header(c, "6. MANTENIMIENTOS", x0, y, USEW)

    m_cols = [USEW * 0.25, USEW * 0.25, USEW * 0.25, USEW * 0.25]
    m_hdrs_top = ["Fecha realización", "Realizado por", 
    
    "Mantenimiento", ""]
    m_sub      = ["", "", "PREVENTIVO", "CORRECTIVO"]

    # Cabecera doble
    cx = x0
    for w, h in zip(m_cols, m_hdrs_top):
        if h:
            _rect(c, cx, y - ROW, w, ROW, fill=C_LABEL)
            _text(c, h, cx, y - ROW, w, ROW, bold=True, size=7)
        cx += w
    y -= ROW

    cx = x0
    for w, h in zip(m_cols, m_sub):
        if h:
            _rect(c, cx, y - ROW, w, ROW, fill=C_LABEL)
            _text(c, h, cx, y - ROW, w, ROW, bold=True, size=7,
                  color=C_RED if h in ("PREVENTIVO", "CORRECTIVO") else C_BLACK)
        cx += w
    y -= ROW

    for i in range(5):
        bg = C_ALT if i % 2 else C_WHITE
        _rect(c, x0, y - ROW, USEW, ROW, fill=bg, stroke=False)
        _rect(c, x0, y - ROW, USEW, ROW)
        y -= ROW

    # Pie de página
    c.saveState()
    c.setFont("Helvetica", 6)
    c.setFillColor(colors.grey)
    c.drawCentredString(
        PW / 2, MY - 8,
        f"Documento generado automáticamente el {_fmt_date(date.today())} — Sistema de Inventario"
    )
    c.restoreState()

    c.showPage()
    c.save()
    return buf.getvalue()
