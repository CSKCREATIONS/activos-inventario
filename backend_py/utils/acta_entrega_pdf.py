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
import json
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

from utils.accesorios import formatear_accesorio

import base64
from io import BytesIO
from reportlab.lib.utils import ImageReader


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
    pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", "C:/Windows/Fonts/arialbd.ttf"))
    DEFAULT_FONT = "Arial"
    DEFAULT_FONT_BOLD = "Arial-Bold"
except Exception:
    pass


# ─────────────────────────────────────────────
# POSICIONES ABSOLUTAS
# ─────────────────────────────────────────────

POS = {
    "fecha": (310, 705),
    "nombre": (150, 673),
    "cargo": (150, 660),
    "equipo_qty": (205, 614), "equipo_ref": (330, 614), "equipo_activo": (498, 614),
    "monitor_qty": (205, 600), "monitor_ref": (330, 600), "monitor_activo": (498, 600),
    "teclado_qty": (205, 588), "teclado_ref": (330, 588), "teclado_activo": (498, 588),
    "mouse_qty": (205, 574), "mouse_ref": (330, 574), "mouse_activo": (498, 574),
    "parlantes_qty": (205, 560), "parlantes_ref": (330, 560), "parlantes_activo": (498, 560),
    "lector_codigo_de_barras_qty": (205, 540), "lector_codigo_de_barras_ref": (330, 540),
    "lector_codigo_de_barras_activo": (498, 540),
    "impresora_qty": (205, 524), "impresora_ref": (330, 524), "impresora_activo": (498, 524),
    "regulador_qty": (205, 447), "regulador_ref": (348, 474),
    "extension_qty": (205, 447), "extension_ref": (350, 460),
    "ups_qty": (205, 447), "ups_ref": (365, 447),
    "telefono_qty": (205, 433), "telefono_ref": (350, 433),
    "otros_qty": (205, 420), "otros_ref": (340, 420),
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
    while text and stringWidth(text, c._fontname, size) > max_w:
        text = text[:-1]
    return text


def _text(c: Canvas, text: str, x, y, w, h, *, size=8, bold=False, color=C_BLACK, align="left"):
    text = str(text or "")
    c.saveState()
    fname = DEFAULT_FONT_BOLD if bold else DEFAULT_FONT
    try:
        c.setFont(fname, size)
    except Exception:
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.setFillColor(color)
    ty = y + (h / 2) - (size / 3)
    p = c.beginPath()
    p.rect(x, y, w, h)
    c.clipPath(p, stroke=0)
    clipped = _clip(text, c, w - 6, size)
    if align == "center":
        c.drawCentredString(x + w / 2, ty, clipped)
    elif align == "right":
        c.drawRightString(x + w - 2, ty, clipped)
    else:
        c.drawString(x + 3, ty, clipped)
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
        raise FileNotFoundError("No se encontró la plantilla PDF")

    tpl = PdfReader(plantilla_path)
    overlay = io.BytesIO()
    oc = Canvas(overlay, pagesize=LETTER)

    # ================== FECHA ==================
    fecha_txt = _fmt_date(asignacion.get("fecha_asignacion") or asignacion.get("fecha_acta"))
    if fecha_txt:
        _text(oc, fecha_txt, POS["fecha"][0], POS["fecha"][1], 120, 12, size=9, align="center")

    # ================== DATOS DE QUIEN RECIBE EL EQUIPO (todos los usuarios) ==================
    todos_usuarios = asignacion.get("todos_usuarios_completos", [])
    if not todos_usuarios:
        # Fallback si no está la lista enriquecida
        nombre = asignacion.get("usuario_nombre") or ""
        cargo = asignacion.get("cargo") or ""
        todos_usuarios = [{"nombre": nombre, "cargo": cargo}]
    else:
        # Asegurar que el primer elemento sea el principal (ya lo es)
        pass

    # Construir un solo string para nombres y otro para cargos
    nombres_str = " - ".join([u.get("nombre", "") for u in todos_usuarios])
    cargos_str = " - ".join([u.get("cargo", "") for u in todos_usuarios])

    # Dibujar en las posiciones fijas, permitiendo múltiples líneas si es necesario
    # Altura suficiente para hasta 2 líneas (ajustable)
    _text(oc, nombres_str, POS["nombre"][0], POS["nombre"][1], 350, 14, size=9, bold=False, align="center")
    _text(oc, cargos_str, POS["cargo"][0], POS["cargo"][1], 350, 14, size=9, bold=False, align="center")

    # No se necesita sección adicional de responsables

    # ================== EQUIPOS ==================
    per_rows = ["equipo", "monitor", "teclado", "mouse", "parlantes", "lector_codigo_de_barras", "impresora"]

    def pick(*keys):
        for kk in keys:
            v = asignacion.get(kk)
            if v:
                return str(v)
        return ""

    # Ajuste de coordenadas: alinear todas las referencias en la misma columna X
    # (por si alguna tenía valor diferente)
    for row_name in per_rows:
        qty = pick(f'{row_name}_cantidad')
        if row_name == "equipo":
            qty = qty or "1"
        if row_name == "equipo":
            ref = pick('modelo', 'marca')
        if row_name == "equipo":
            ref = pick('modelo', 'marca')
        else:
            # Para accesorios, obtener marca y modelo por separado y unirlos
            marca = asignacion.get(f"{row_name}_marca", "")
            modelo = asignacion.get(f"{row_name}_modelo", "")
            if marca and modelo:
                ref = f"{marca} {modelo}"
            elif marca:
                ref = marca
            elif modelo:
                ref = modelo
            else:
                ref = ""
           
        if row_name == "equipo":
            activo = pick('placa', 'serial')
        else:
            activo = pick(f"{row_name}_placa", f"{row_name}_serial", f"{row_name}_activo")
        size_ref = 7 if row_name == "lector_codigo_de_barras" else 8
        # Las coordenadas X deben ser consistentes para todas las filas
        x_qty = POS[f"{row_name}_qty"][0]
        x_ref = POS[f"{row_name}_ref"][0]
        x_activo = POS[f"{row_name}_activo"][0]
        y = POS[f"{row_name}_qty"][1]  # asumimos misma Y para cada fila
        _text(oc, qty, x_qty, y, 35, 12, size=8, align="center")
        _text(oc, ref, x_ref, y, 120, 12, size=size_ref, align="left")
        _text(oc, activo, x_activo, y, 100, 12, size=8, align="left")
    # ================== ACCESORIOS ==================

    # ================== OBSERVACIONES ==================
    obs = str(asignacion.get("observaciones") or "")
    if obs:
        oc.setFont(DEFAULT_FONT, 8)
        text = oc.beginText()
        text.setTextOrigin(POS["obs"][0], POS["obs"][1])
        max_chars = 90
        for line in obs.splitlines():
            while len(line) > max_chars:
                text.textLine(line[:max_chars])
                line = line[max_chars:]
            text.textLine(line)
        oc.drawText(text)

    # ================== FIRMAS ==================
    firma_x = 60
    separacion = 45
    # Valores Y según cantidad de firmas
    firma_y_single = 298   # para una sola firma (más baja)
    firma_y_multi = 298    # para varias firmas (más alta)

    firmas = asignacion.get("firmas", [])
    
    if isinstance(firmas, str):
        try:
            firmas = json.loads(firmas)
            
        except:
            firmas = []

    if not firmas and asignacion.get("firmado") and asignacion.get("firma_responsable"):
        nombre_principal = asignacion.get("usuario_nombre") or "Usuario principal"
        firmas = [{
            "user_id": asignacion.get("usuario_id", ""),
            "nombre": nombre_principal,
            "signature": asignacion.get("firma_responsable"),
            "fecha": asignacion.get("fecha_firma", "")
        }]

    num_firmas = len(firmas)
    # Elegir Y inicial según cantidad
    if num_firmas == 1:
        firma_y = firma_y_single
    else:
        firma_y = firma_y_multi


    if firmas:
        for i, firma in enumerate(firmas):
            
            print("TIENE SIGNATURE:", bool(firma.get("signature")))
            y_actual = firma_y - i * separacion
            if y_actual < 50:
                break
            oc.setFont("Helvetica-Bold", 9)
            oc.drawString(firma_x, y_actual + 15, f"Firma de: {firma.get('nombre', 'Usuario')}")
            firma_data = firma.get("signature", "")

            print("TIPO:", type(firma_data))
            print("VALOR:", str(firma_data)[:100])

            if firma_data:
                try:

                    if "base64," in firma_data:
                        firma_data = firma_data.split(",", 1)[1]

                    

                    img_data = base64.b64decode(firma_data)

                    print("BYTES:", len(img_data))

                    with open("firma_debug.png", "wb") as f:
                        f.write(img_data)

                    img = ImageReader(BytesIO(img_data))

                    oc.drawImage(
                        img,
                        firma_x,
                        y_actual,
                        width=120,
                        height=40,
                        preserveAspectRatio=True,
                        mask="auto"
                    )

                    

                except Exception as e:
                    print("ERROR:", e)
            else:
                oc.drawString(firma_x, y_actual, "")
    else:
        oc.setFont("Helvetica-Bold", 9)
        oc.drawString(firma_x, firma_y_single + 15, "")
        oc.drawString(firma_x, firma_y_single, "")
        oc.drawString(firma_x, firma_y_single - 20, "")

    oc.showPage()
    oc.save()

    overlay.seek(0)
    overlay_pdf = PdfReader(overlay)
    
    
    writer = PdfWriter()
    
    for i, page in enumerate(tpl.pages):
        # Aplicar el overlay a cada página (usando la primera página del overlay)
        if overlay_pdf.pages:
            page.merge_page(overlay_pdf.pages[0])
        writer.add_page(page)
    
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


# ─────────────────────────────────────────────
# TEST
# ─────────────────────────────────────────────

if __name__ == "__main__":
    datos = {
        "usuario_nombre": "Julian Andres Castro Rodriguez",
        "cargo": "Auxiliar de Tecnologia e Infraestructura",
        "area": "Departamento de Tecnologia",
        "fecha_asignacion": "2026-05-15",
        "tipo_equipo": "Portatil",
        "placa": "PC-001",
        "serial": "SN123456789",
        "marca": "Dell",
        "modelo": "Optiplex 7090",
        "equipo_cantidad": "1",
        "equipo_modelo": "Optiplex 7090",
        "equipo_placa": "PC-001",
        "monitor_cantidad": "2",
        "monitor_modelo": "Dell E2423H 24",
        "monitor_placa": "MON-442",
        "teclado_cantidad": "1",
        "teclado_modelo": "Logitech K120 USB",
        "teclado_placa": "TEC-221",
        "mouse_cantidad": "1",
        "mouse_modelo": "Logitech M90",
        "mouse_placa": "MOU-876",
        "parlantes_cantidad": "1",
        "parlantes_modelo": "Genius SP-HF180",
        "parlantes_placa": "PAR-765",
        "lector_codigo_de_barras_cantidad": "1",
        "lector_codigo_de_barras_modelo": "Honeywell Voyager XP 1470G",
        "lector_codigo_de_barras_placa": "LECT-555",
        "impresora_cantidad": "1",
        "impresora_modelo": "HP LaserJet Pro M404dn",
        "impresora_placa": "IMP-999",
        "observaciones": "Equipo entregado en perfecto estado. Accesorios completos.",
        "todos_usuarios_completos": [
            {"nombre": "Julian Castro", "cargo": "Auxiliar"},
            {"nombre": "María García", "cargo": "Analista"},
            {"nombre": "Pedro López", "cargo": "Soporte"}
        ],
    }
    pdf_bytes = generar_acta_entrega_pdf(
        datos,
        accesorios_opciones=["REGULADOR", "EXTENSIÓN", "UPS", "TELÉFONO", "OTROS"],
        accesorios_entregados=["REGULADOR", "UPS", "EXTENSIÓN", "TELÉFONO", "OTROS"],
        entregado_por="Coordinador de Tecnologia",
    )
    output = "test_acta.pdf"
    with open(output, "wb") as f:
        f.write(pdf_bytes)
    print(f"\nPDF generado correctamente: {output}")
    os.startfile(output)