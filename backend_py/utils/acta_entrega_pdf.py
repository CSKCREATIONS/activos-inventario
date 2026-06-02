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
    "cargo": (310, 660),

    # =========================
    # EQUIPO
    # =========================
    "equipo_qty": (205, 614),
    "equipo_ref": (330, 614),
    "equipo_activo": (498, 614),

    # MONITOR
    "monitor_qty": (205, 600),
    "monitor_ref": (330, 600),
    "monitor_activo": (498, 600),

    # TECLADO
    "teclado_qty": (205, 588),
    "teclado_ref": (330, 588),
    "teclado_activo": (498, 588),

    # MOUSE
    "mouse_qty": (205, 574),
    "mouse_ref": (330, 574),
    "mouse_activo": (498, 574),

    # PARLANTES
    "parlantes_qty": (205, 560),
    "parlantes_ref": (330, 560),
    "parlantes_activo": (498, 560),

    # LECTOR
    "lector_codigo_de_barras_qty": (205, 540),
    "lector_codigo_de_barras_ref": (330, 540),
    "lector_codigo_de_barras_activo": (498, 540),

    # IMPRESORA
    "impresora_qty": (205, 524),
    "impresora_ref": (330, 524),
    "impresora_activo": (498, 524),

    # =========================
    # ACCESORIOS
    # =========================
    "regulador_qty": (205, 447),
    "regulador_ref": (348, 474),
    "equipo_activo": (498, 614),

    "extension_qty": (205, 447),
    "extension_ref": (350, 460),

    "ups_qty": (205, 447),
    "ups_ref": (365, 447),
    "equipo_activo": (498, 614),

    "telefono_qty": (205, 433),
    "telefono_ref": (350, 433),
    "equipo_activo": (498, 614),

    "otros_qty": (205, 420),
    "otros_ref": (340, 420),

    # =========================
    # OBSERVACIONES
    # =========================
    "obs": (50, 392),
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
        # Equipos/Accesorios disponibles en el PDF
        "MONITOR": "monitor",
        "TECLADO": "teclado",
        "MOUSE": "mouse",
        "PARLANTES": "parlantes",
        "LECTOR": "lector_codigo_de_barras",
        "LECTOR DE CÓDIGO DE BARRAS": "lector_codigo_de_barras",
        "IMPRESORA": "impresora",
        "ESCÁNER": "impresora",  # Mapear escáner a impresora si no hay campo específico
        "CARGADOR": "otros",
        # Otros accesorios
        "REGULADOR": "regulador",
        "EXTENSIÓN": "extension",
        "UPS": "ups",
        "TELÉFONO": "telefono",
        "OTROS": "otros",
    }

    # Debug: log de accesorios recibidos
    print(f"[ACTA] ===== ACCESORIOS DEBUG =====")
    print(f"[ACTA] Accesorios recibidos (RAW): {accesorios_entregados}")
    print(f"[ACTA] Tipo: {type(accesorios_entregados)}")
    print(f"[ACTA] Es None: {accesorios_entregados is None}")
    print(f"[ACTA] Es lista vacia: {accesorios_entregados == []}")
    if accesorios_entregados:
        print(f"[ACTA] Cantidad de accesorios: {len(accesorios_entregados)}")
    else:
        print(f"[ACTA] VACIO O NULO")

    # Normalizar nombres de accesorios
    # Los accesorios pueden venir como:
    # - strings: "Monitor"
    # - dicts: {'id': 'e10', 'nombre': 'Monitor', ...}
    accesorios_normalizados = []
    accesorios_texto_observaciones = ""  # Para guardar texto que irá a observaciones
    
    for acc in accesorios_entregados:
        # Si es dict, extraer el nombre
        if isinstance(acc, dict):
            acc_str = acc.get("nombre") or acc.get("tipo_equipo") or str(acc)
            acc_str = str(acc_str).strip()
        else:
            # Si es string u otro, convertir directamente
            acc_str = str(acc).strip() if acc else ""
        
        print(f"[ACTA]   Item procesado: '{acc_str}' (tipo orig: {type(acc).__name__})")
        if acc_str:
            accesorios_normalizados.append(acc_str)

    print(f"[ACTA] Accesorios normalizados: {accesorios_normalizados}")
    print(f"[ACTA] Total normalizados: {len(accesorios_normalizados)}")
    print(f"[ACTA] ===== FIN DEBUG ======")

    # Colocar cada accesorio en su campo específico (si existe)
    # Los que no encuentren campo van a observaciones
    
    accesorios_no_colocados = []  # Para los que no encuentren campo
    
    for acc_str in accesorios_normalizados:
        key = acc_map.get(acc_str.upper())

        if not key:
            # Si no coincide exactamente, intentar buscar con variaciones
            for pattern, mapped_key in acc_map.items():
                if pattern.lower() in acc_str.lower() or acc_str.lower() in pattern.lower():
                    key = mapped_key
                    break

        if key and f"{key}_qty" in POS and f"{key}_ref" in POS:
            # Escribir cantidad (1)
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

            # Escribir referencia (nombre del accesorio)
            _text(
                oc,
                acc_str,
                POS[f"{key}_ref"][0],
                POS[f"{key}_ref"][1],
                120,
                12,
                size=8
            )
            print(f"[ACTA] [OK] Accesorio '{acc_str}' procesado en campo '{key}'")
        else:
            # No encontró campo -> agregar a observaciones
            accesorios_no_colocados.append(acc_str)
            print(f"[ACTA] Accesorio '{acc_str}' no tiene campo, se agregará a observaciones")
    
    # Si hay accesorios sin colocar, agregarlos a observaciones
    if accesorios_no_colocados:
        accesorios_texto_observaciones = "Accesorios: " + ", ".join(accesorios_no_colocados)
        print(f"[ACTA] Accesorios sin colocar, agregando a observaciones: {accesorios_texto_observaciones}")

    # ─────────────────────────
    # OBSERVACIONES
    # ─────────────────────────

    obs = str(asignacion.get("observaciones") or "")
    
    # Si hay accesorios que no se colocaron en campos específicos, agregarlos a observaciones
    if accesorios_texto_observaciones:
        if obs:
            obs = accesorios_texto_observaciones + "\n" + obs
        else:
            obs = accesorios_texto_observaciones
        print(f"[ACTA] Observaciones finales con accesorios no colocados: {obs[:100]}...")

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
# TEST ROBUSTO
# ─────────────────────────────────────────────

if __name__ == "__main__":

    datos = {

        # =========================
        # FUNCIONARIO
        # =========================

        "usuario_nombre": "Julian Andres Castro Rodriguez",
        "cargo": "Auxiliar de Tecnologia e Infraestructura",
        "area": "Departamento de Tecnologia",

        # =========================
        # FECHAS
        # =========================

        "fecha_asignacion": "2026-05-15",

        # =========================
        # EQUIPO PRINCIPAL
        # =========================

        "tipo_equipo": "Portatil",
        "placa": "PC-001",
        "serial": "SN123456789",
        "marca": "Dell",
        "modelo": "Optiplex 7090",

        # =========================
        # EQUIPO
        # =========================

        "equipo_cantidad": "1",
        "equipo_modelo": "Optiplex 7090",
        "equipo_placa": "PC-001",

        # =========================
        # MONITOR
        # =========================

        "monitor_cantidad": "2",
        "monitor_modelo": "Dell E2423H 24",
        "monitor_placa": "MON-442",

        # =========================
        # TECLADO
        # =========================

        "teclado_cantidad": "1",
        "teclado_modelo": "Logitech K120 USB",
        "teclado_placa": "TEC-221",

        # =========================
        # MOUSE
        # =========================

        "mouse_cantidad": "1",
        "mouse_modelo": "Logitech M90",
        "mouse_placa": "MOU-876",

        # =========================
        # PARLANTES
        # =========================

        "parlantes_cantidad": "1",
        "parlantes_modelo": "Genius SP-HF180",
        "parlantes_placa": "PAR-765",

        # =========================
        # LECTOR CODIGO BARRAS
        # =========================

        "lector_codigo_de_barras_cantidad": "1",
        "lector_codigo_de_barras_modelo": "Honeywell Voyager XP 1470G",
        "lector_codigo_de_barras_placa": "LECT-555",

        # =========================
        # IMPRESORA
        # =========================

        "impresora_cantidad": "1",
        "impresora_modelo": "HP LaserJet Pro M404dn",
        "impresora_placa": "IMP-999",

        # =========================
        # OBSERVACIONES
        # =========================

        "observaciones": (
            "Equipo entregado en perfecto estado Se realiza entrega con accesorios completos cargador original monitor adicional y periféricos funcionando correctamente. Usuario recibe conforme."
        ),
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
            "EXTENSIÓN",
            "TELÉFONO",
            "OTROS",
        ],

        entregado_por="Coordinador de Tecnologia",
    )

    output = "test_acta.pdf"

    with open(output, "wb") as f:
        f.write(pdf_bytes)

    print(f"\nPDF generado correctamente: {output}")

    # Abrir automáticamente
    os.startfile(output)