"""
Generador de Acta de Entrega de Equipo
--------------------------------------
Usa plantilla PDF como fondo y superpone datos.
Requiere: reportlab, pypdf
"""
import io
import os
import json
import base64
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

# Colores y tamaños
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

# Fuentes
DEFAULT_FONT = "Helvetica"
DEFAULT_FONT_BOLD = "Helvetica-Bold"
try:
    pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", "C:/Windows/Fonts/arialbd.ttf"))
    DEFAULT_FONT = "Arial"
    DEFAULT_FONT_BOLD = "Arial-Bold"
except:
    pass

# Posiciones en el PDF
POS = {
    "fecha": (310, 705),
    "nombre": (305, 673),
    "cargo": (310, 660),
    "equipo_qty": (205, 614),
    "equipo_ref": (330, 614),
    "equipo_activo": (498, 614),
    "monitor_qty": (205, 600),
    "monitor_ref": (330, 600),
    "monitor_activo": (498, 600),
    "teclado_qty": (205, 588),
    "teclado_ref": (330, 588),
    "teclado_activo": (498, 588),
    "mouse_qty": (205, 574),
    "mouse_ref": (330, 574),
    "mouse_activo": (498, 574),
    "parlantes_qty": (205, 560),
    "parlantes_ref": (330, 560),
    "parlantes_activo": (498, 560),
    "lector_codigo_de_barras_qty": (205, 540),
    "lector_codigo_de_barras_ref": (330, 540),
    "lector_codigo_de_barras_activo": (498, 540),
    "impresora_qty": (205, 524),
    "impresora_ref": (330, 524),
    "impresora_activo": (498, 524),
    "regulador_qty": (205, 447),
    "regulador_ref": (348, 474),
    "extension_qty": (205, 447),
    "extension_ref": (350, 460),
    "ups_qty": (205, 447),
    "ups_ref": (365, 447),
    "telefono_qty": (205, 433),
    "telefono_ref": (350, 433),
    "otros_qty": (205, 420),
    "otros_ref": (340, 420),
    "obs": (50, 392),
}

def _fmt_date(val):
    if not val: return ""
    if isinstance(val, (date, datetime)):
        return val.strftime("%d/%m/%Y")
    try:
        d = datetime.strptime(str(val)[:10], "%Y-%m-%d")
        return d.strftime("%d/%m/%Y")
    except:
        return str(val)

def _clip(text, c, max_w, size):
    from reportlab.pdfbase.pdfmetrics import stringWidth
    text = str(text or "")
    while text and stringWidth(text, c._fontname, size) > max_w:
        text = text[:-2] + "…"
    return text

def _text(c, text, x, y, w, h, size=8, bold=False, color=C_BLACK, align="left"):
    text = str(text or "")
    c.saveState()
    fname = DEFAULT_FONT_BOLD if bold else DEFAULT_FONT
    try:
        c.setFont(fname, size)
    except:
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

def _agregar_firmas_a_pagina(page, firmas):
    """Agrega las firmas a una página del PDF (todas las páginas)."""
    if not firmas:
        return
    
    packet = io.BytesIO()
    can = Canvas(packet, pagesize=LETTER)
    
    x_firma = 350
    y_inicial = 50
    altura_firma = 60
    
    for idx, firma in enumerate(firmas):
        y_pos = y_inicial + (idx * altura_firma)
        nombre = firma.get("nombre", "Usuario")
        fecha = firma.get("fecha", "")
        
        # Dibujar imagen de la firma
        try:
            img_data = firma.get("signature", "")
            if img_data and "," in img_data:
                img_base64 = img_data.split(",")[1]
                img_bytes = base64.b64decode(img_base64)
                img_io = io.BytesIO(img_bytes)
                can.drawImage(img_io, x_firma, y_pos, width=100, height=40, mask='auto')
        except Exception as e:
            print(f"Error al dibujar firma: {e}")
        
        # Dibujar texto con nombre
        can.setFont("Helvetica", 8)
        can.drawString(x_firma, y_pos - 10, f"Firmado por: {nombre}")
        if fecha:
            can.drawString(x_firma, y_pos - 20, f"Fecha: {fecha}")
    
    can.save()
    packet.seek(0)
    overlay_pdf = PdfReader(packet)
    if overlay_pdf.pages:
        page.merge_page(overlay_pdf.pages[0])

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
    
    # Obtener tipo de equipo para decidir si mostrar sección portátil
    tipo_equipo = asignacion.get("tipo_equipo", "").lower()
    es_portatil = tipo_equipo in ("laptop", "portátil", "notebook")
    
    # Cargar plantilla
    if plantilla_path is None:
        repo_root = Path(__file__).resolve().parents[2]
        default_tpl = repo_root / "Doc" / "Julian Castro Sena Acta.pdf"
        if default_tpl.exists():
            plantilla_path = str(default_tpl)
    if not plantilla_path or not Path(plantilla_path).exists():
        raise FileNotFoundError("No se encontró la plantilla PDF")
    
    tpl = PdfReader(plantilla_path)
    writer = PdfWriter()
    
    # Crear overlay con datos del acta
    overlay = io.BytesIO()
    oc = Canvas(overlay, pagesize=LETTER)
    
    # Fecha
    fecha_val = asignacion.get("fecha_asignacion") or asignacion.get("fecha_acta")
    if fecha_val:
        _text(oc, _fmt_date(fecha_val), POS["fecha"][0], POS["fecha"][1], 120, 12, size=9, align="center")
    
    # Funcionario
    nombre = asignacion.get("usuario_nombre") or ""
    cargo = asignacion.get("cargo") or ""
    if nombre:
        _text(oc, nombre, POS["nombre"][0], POS["nombre"][1], 320, 12, size=9)
    if cargo:
        _text(oc, cargo, POS["cargo"][0], POS["cargo"][1], 320, 12, size=9)
    
    # Equipos principales
    per_rows = ["equipo", "monitor", "teclado", "mouse", "parlantes", "lector_codigo_de_barras", "impresora"]
    def pick(*keys):
        for kk in keys:
            v = asignacion.get(kk)
            if v: return str(v)
        return ""
    
    for row_name in per_rows:
        qty = pick(f'{row_name}_cantidad') or "1"
        if row_name == "equipo":
            ref = pick('modelo', 'marca', 'tipo_equipo')
            activo = pick('placa', 'serial')
        else:
            ref = pick(f"{row_name}_modelo", f"{row_name}_marca", f"{row_name}_tipo")
            activo = pick(f"{row_name}_placa", f"{row_name}_serial", f"{row_name}_activo")
        _text(oc, qty, POS[f"{row_name}_qty"][0], POS[f"{row_name}_qty"][1], 35, 12, size=8, align="center")
        _text(oc, ref, POS[f"{row_name}_ref"][0], POS[f"{row_name}_ref"][1], 120, 12, size=8)
        _text(oc, activo, POS[f"{row_name}_activo"][0], POS[f"{row_name}_activo"][1], 100, 12, size=8)
    
    # === SECCIÓN PORTÁTIL (solo si es laptop) ===
    if es_portatil:
        # Aquí van los campos específicos de portátil (batería, cargador, etc.)
        # Por ejemplo:
        _text(oc, "1", POS["bateria_qty"][0] if "bateria_qty" in POS else (205, 500), POS["bateria_qty"][1] if "bateria_qty" in POS else (205, 500), 35, 12, size=8, align="center")
        _text(oc, "Batería original", POS["bateria_ref"][0] if "bateria_ref" in POS else (330, 500), POS["bateria_ref"][1] if "bateria_ref" in POS else (330, 500), 120, 12, size=8)
        _text(oc, "SN-BAT-001", POS["bateria_activo"][0] if "bateria_activo" in POS else (498, 500), POS["bateria_activo"][1] if "bateria_activo" in POS else (498, 500), 100, 12, size=8)
    
    # Accesorios adicionales
    acc_map = {
        "MONITOR": "monitor", "TECLADO": "teclado", "MOUSE": "mouse",
        "PARLANTES": "parlantes", "LECTOR": "lector_codigo_de_barras", "IMPRESORA": "impresora",
        "CARGADOR": "otros", "REGULADOR": "regulador", "EXTENSIÓN": "extension",
        "UPS": "ups", "TELÉFONO": "telefono", "OTROS": "otros"
    }
    
    accesorios_normalizados = []
    for acc in accesorios_entregados:
        acc_str = formatear_accesorio(acc)
        if acc_str:
            accesorios_normalizados.append(acc_str)
    
    accesorios_no_colocados = []
    for acc_str in accesorios_normalizados:
        key = None
        for pattern, mapped_key in acc_map.items():
            if pattern.lower() in acc_str.lower() or acc_str.lower() in pattern.lower():
                key = mapped_key
                break
        if key and f"{key}_qty" in POS and f"{key}_ref" in POS:
            _text(oc, "1", POS[f"{key}_qty"][0], POS[f"{key}_qty"][1], 35, 12, size=8, align="center")
            _text(oc, acc_str, POS[f"{key}_ref"][0], POS[f"{key}_ref"][1], 120, 12, size=8)
        else:
            accesorios_no_colocados.append(acc_str)
    
    # Observaciones
    obs = str(asignacion.get("observaciones") or "")
    if accesorios_no_colocados:
        obs = (obs + "\n" if obs else "") + "Accesorios: " + ", ".join(accesorios_no_colocados)
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
    
    oc.showPage()
    oc.save()
    overlay.seek(0)
    overlay_pdf = PdfReader(overlay)
    
    # Fusionar la primera página con los datos
    if tpl.pages:
        tpl.pages[0].merge_page(overlay_pdf.pages[0])
    
    # Obtener firmas
    firmas = asignacion.get("firmas")
    if isinstance(firmas, str):
        try:
            firmas = json.loads(firmas)
        except:
            firmas = []
    
    # Agregar firmas a TODAS las páginas
    for i, page in enumerate(tpl.pages):
        if firmas:
            _agregar_firmas_a_pagina(page, firmas)
        writer.add_page(page)
    
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()