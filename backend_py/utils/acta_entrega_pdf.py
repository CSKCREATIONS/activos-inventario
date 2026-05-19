"""
Generador de Acta de Entrega de Equipo
--------------------------------------

- Usa una plantilla PDF como fondo
- Superpone los datos encima
- Devuelve bytes del PDF

Requisitos:
pip install reportlab pypdf

"""

import io
import os

from datetime import date, datetime
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen.canvas import Canvas

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

try:
    from pypdf import PdfReader, PdfWriter
except Exception:
    from PyPDF2 import PdfReader, PdfWriter


# ─────────────────────────────────────────────
# COLORES
# ─────────────────────────────────────────────

C_HEADER = colors.HexColor("#1E3A5F")
C_SEC = colors.HexColor("#D9E1F2")
C_LABEL = colors.HexColor("#BDD7EE")
C_ALT = colors.HexColor("#F2F6FC")
C_BORDER = colors.HexColor("#8EA9C1")
C_WHITE = colors.white
C_BLACK = colors.black


# ─────────────────────────────────────────────
# TAMAÑOS
# ─────────────────────────────────────────────

PW, PH = LETTER
MX = 18 * mm
MY = 18 * mm
USEW = PW - 2 * MX


# ─────────────────────────────────────────────
# FUENTES
# ─────────────────────────────────────────────

DEFAULT_FONT = "Helvetica"
DEFAULT_FONT_BOLD = "Helvetica-Bold"

try:

    pdfmetrics.registerFont(
        TTFont(
            "Arial",
            "C:/Windows/Fonts/arial.ttf"
        )
    )

    pdfmetrics.registerFont(
        TTFont(
            "Arial-Bold",
            "C:/Windows/Fonts/arialbd.ttf"
        )
    )

    DEFAULT_FONT = "Arial"
    DEFAULT_FONT_BOLD = "Arial-Bold"

except Exception:
    pass


# ─────────────────────────────────────────────
# POSICIONES ABSOLUTAS
# ─────────────────────────────────────────────

POS = {

    # Fecha
    "fecha": (310, 705),

    # =========================
    # ENTREGADO POR
    # =========================

    # =========================
    # FUNCIONARIO
    # =========================
    "nombre": (305, 673),
    "cargo": (308, 660),
    "area": (175, 624),

    # =========================
    # EQUIPO
    # =========================
    "equipo_qty": (255, 548),
    "equipo_ref": (340, 548),
    "equipo_activo": (520, 548),

    # MONITOR
    "monitor_qty": (255, 530),
    "monitor_ref": (340, 530),
    "monitor_activo": (520, 530),

    # TECLADO
    "teclado_qty": (255, 512),
    "teclado_ref": (340, 512),
    "teclado_activo": (520, 512),

    # MOUSE
    "mouse_qty": (255, 494),
    "mouse_ref": (340, 494),
    "mouse_activo": (520, 494),

    # PARLANTES
    "parlantes_qty": (255, 476),
    "parlantes_ref": (340, 476),
    "parlantes_activo": (520, 476),

    # LECTOR
    "lector_codigo_de_barras_qty": (255, 458),
    "lector_codigo_de_barras_ref": (340, 458),
    "lector_codigo_de_barras_activo": (520, 458),

    # IMPRESORA
    "impresora_qty": (255, 440),
    "impresora_ref": (340, 440),
    "impresora_activo": (520, 440),

    # =========================
    # ACCESORIOS
    # =========================
    "regulador_qty": (255, 392),
    "regulador_ref": (340, 392),

    "extension_qty": (255, 374),
    "extension_ref": (340, 374),

    "ups_qty": (255, 356),
    "ups_ref": (340, 356),

    "telefono_qty": (255, 338),
    "telefono_ref": (340, 338),

    "otros_qty": (255, 320),
    "otros_ref": (340, 320),

    # =========================
    # OBSERVACIONES
    # =========================
    "obs": (40, 255),
}


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _fmt_date(val):

    if not val:
        return ""

    if isinstance(val, (date, datetime)):
        return val.strftime("%d/%m/%Y")

    try:
        d = datetime.strptime(str(val)[:10], "%Y-%m-%d")
        return d.strftime("%d/%m/%Y")
    except Exception:
        return str(val)


def _clip(text: str, c: Canvas, max_w: float, size: float) -> str:

    from reportlab.pdfbase.pdfmetrics import stringWidth

    text = str(text or "")

    while text:

        w = stringWidth(text, c._fontname, size)

        if w <= max_w:
            break

        text = text[:-1]

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

    fname = DEFAULT_FONT_BOLD if bold else DEFAULT_FONT

    try:
        c.setFont(fname, size)

    except Exception:
        c.setFont(
            "Helvetica-Bold" if bold else "Helvetica",
            size
        )

    c.setFillColor(color)

    ty = y + (h / 2) - (size / 3)

    p = c.beginPath()
    p.rect(x, y, w, h)

    c.clipPath(p, stroke=0)

    clipped = _clip(text, c, w - 6, size)

    if align == "center":

        c.drawCentredString(
            x + w / 2,
            ty,
            clipped
        )

    elif align == "right":

        c.drawRightString(
            x + w - 2,
            ty,
            clipped
        )

    else:

        c.drawString(
            x + 3,
            ty,
            clipped
        )

    c.restoreState()


# ─────────────────────────────────────────────
# GENERADOR PDF
# ─────────────────────────────────────────────

def generar_acta_entrega_pdf(
    asignacion: dict,
    *,
    accesorios_opciones: list[str],
    accesorios_entregados: list[str] | None = None,
    entregado_por: str | None = None,
    plantilla_path: str | None = None,
) -> bytes:

    accesorios_entregados = accesorios_entregados or []
    entregado_por = entregado_por or ""

    if plantilla_path is None:

        repo_root = Path(__file__).resolve().parents[2]

        default_tpl = repo_root / "Doc" / "Julian Castro Sena Acta.pdf"

        if default_tpl.exists():
            plantilla_path = str(default_tpl)

    if not plantilla_path or not Path(plantilla_path).exists():
        raise FileNotFoundError(
            "No se encontró la plantilla PDF"
        )

    tpl = PdfReader(plantilla_path)

    overlay = io.BytesIO()

    oc = Canvas(
        overlay,
        pagesize=LETTER
    )

    # ─────────────────────────
    # FECHA
    # ─────────────────────────

    fecha_val = (
        asignacion.get("fecha_asignacion")
        or asignacion.get("fecha_acta")
    )

    fecha_txt = _fmt_date(fecha_val)

    if fecha_txt:

        _text(
            oc,
            fecha_txt,
            POS["fecha"][0],
            POS["fecha"][1],
            120,
            12,
            size=9,
            align="center"
        )

    # ─────────────────────────
    # FUNCIONARIO
    # ─────────────────────────

    nombre = asignacion.get("usuario_nombre") or ""
    cargo = asignacion.get("cargo") or ""
    area = asignacion.get("area") or ""

    if nombre:

        _text(
            oc,
            nombre,
            POS["nombre"][0],
            POS["nombre"][1],
            320,
            12,
            size=9
        )

    if cargo:

        _text(
            oc,
            cargo,
            POS["cargo"][0],
            POS["cargo"][1],
            320,
            12,
            size=9
        )


    # ─────────────────────────
    # EQUIPOS
    # ─────────────────────────

    per_rows = [
        "equipo",
        "monitor",
        "teclado",
        "mouse",
        "parlantes",
        "lector_codigo_de_barras",
        "impresora",
    ]

    def pick(*keys):

        for kk in keys:

            v = asignacion.get(kk)

            if v:
                return str(v)

        return ""

    for row_name in per_rows:

        qty = pick(f'{row_name}_cantidad') 

        if row_name == "equipo":
            qty = qty or "1"

        if row_name == "equipo":

            ref = pick(
                'modelo',
                'marca',
                'tipo_equipo',
            )
        else:

            ref = pick(
                f"{row_name}_modelo",
                f"{row_name}_marca",
                f"{row_name}_tipo",
            )

        if row_name == "equipo":

            activo = pick(
                'placa',
                'serial',
            )
        else:

            activo = pick(
                f"{row_name}_placa",
                f"{row_name}_serial",
                f"{row_name}_activo"
            )
        

        size_ref = 7 if row_name == "lector_codigo_de_barras" else 8

        _text(
            oc,
            qty,
            POS[f"{row_name}_qty"][0],
            POS[f"{row_name}_qty"][1],
            35,
            12,
            size=8,
            align="center"
        )

        _text(
            oc,
            ref,
            POS[f"{row_name}_ref"][0],
            POS[f"{row_name}_ref"][1],
            120,
            12,
            size=size_ref
        )

        _text(
            oc,
            activo,
            POS[f"{row_name}_activo"][0],
            POS[f"{row_name}_activo"][1],
            100,
            12,
            size=8
        )

    # ─────────────────────────
    # ACCESORIOS
    # ─────────────────────────

    acc_map = {
        "REGULADOR": "regulador",
        "EXTENSIÓN": "extension",
        "UPS": "ups",
        "TELÉFONO": "telefono",
        "OTROS": "otros",
    }

    for acc in accesorios_entregados:

        key = acc_map.get(acc.upper())

        if not key:
            continue

        _text(
            oc,
            "1",
            POS[f"{key}_qty"][0],
            POS[f"{key}_qty"][1],
            35,
            12,
            size=8,
            align="center"
        )

        _text(
            oc,
            acc,
            POS[f"{key}_ref"][0],
            POS[f"{key}_ref"][1],
            120,
            12,
            size=8
        )

    # ─────────────────────────
    # OBSERVACIONES
    # ─────────────────────────

    obs = str(asignacion.get("observaciones") or "")

    if obs:

        oc.setFont(DEFAULT_FONT, 8)

        text = oc.beginText()

        text.setTextOrigin(
            POS["obs"][0],
            POS["obs"][1]
        )

        max_chars = 90

        for line in obs.splitlines():

            while len(line) > max_chars:

                text.textLine(line[:max_chars])

                line = line[max_chars:]

            text.textLine(line)

        oc.drawText(text)

    oc.showPage()
    oc.save()

    overlay.seek(0)

    overlay_pdf = PdfReader(overlay)

    tpl.pages[0].merge_page(
        overlay_pdf.pages[0]
    )

    writer = PdfWriter()

    for page in tpl.pages:
        writer.add_page(page)

    out = io.BytesIO()

    writer.write(out)

    return out.getvalue()


# ─────────────────────────────────────────────
# TEST
# ─────────────────────────────────────────────

if __name__ == "__main__":

    datos = {
        "usuario_nombre": "Julian Castro",
        "cargo": "Auxiliar TI",
        "area": "Tecnologia",
        "fecha_asignacion": "2026-05-15",
        "placa": "PC-001",
        "serial": "SN123456",
        "marca": "Dell",
        "modelo": "Optiplex 7090",
        "tipo_equipo": "Portatil",
        "observaciones": "Equipo entregado en buen estado.",
    }

    pdf_bytes = generar_acta_entrega_pdf(
        datos,
        accesorios_opciones=[
            "REGULADOR",
            "EXTENSIÓN",
            "UPS",
            "TELÉFONO",
            "OTROS",
        ],
        accesorios_entregados=[
            "REGULADOR",
            "UPS",
        ],
        entregado_por="Administrador TI",
    )

    output = "test_acta.pdf"

    with open(output, "wb") as f:
        f.write(pdf_bytes)

    print(f"PDF generado: {output}")

    os.startfile(output)