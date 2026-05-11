"""
Endpoint de carga masiva por CSV.
POST /api/importar/{entidad}

Entidades soportadas: equipos, usuarios, suministros, accesorios
Respuesta: { total, insertados, errores: [{fila, campos, error}] }
"""
import csv
import io
import os
import re
import uuid
import unicodedata
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.equipo import EquipoModel
from models.usuario import UsuarioModel
from models.suministro import SuministroModel
from models.accesorio import AccesorioModel
from models.documento import DocumentoModel
from utils.files import safe_filename

router = APIRouter()

ENTIDADES = {"equipos", "usuarios", "suministros", "accesorios"}

# ── Campos requeridos por entidad ──────────────────────────────────────────────
REQUIRED: dict[str, list[str]] = {
    "equipos":     ["placa", "tipo_equipo", "criticidad", "confidencialidad"],
    "usuarios":    ["nombre", "cargo", "proceso", "grupo_asignado", "area"],
    "suministros": ["nombre", "tipo"],
    "accesorios":  ["nombre"],
}

# ── Plantillas CSV (cabeceras) ─────────────────────────────────────────────────
HEADERS: dict[str, list[str]] = {
    "equipos": [
        "placa", "serial", "tipo_equipo", "marca", "modelo",
        "sistema_operativo","ram", "disco",
        "criticidad", "confidencialidad", "estado", "fecha_compra",
        "proveedor", "costo", "es_rentado", "observaciones",
        "procesador", "nombre_equipo",
    ],
    "usuarios": [
        "nombre", "cargo", "proceso", "grupo_asignado", "area",
        "correo", "ubicacion", "activo",
    ],
    "suministros": [
        "nombre", "tipo", "referencia", "marca", "modelo",
        "cantidad", "cantidad_minima", "estado", "proveedor",
        "fecha_vencimiento", "costo", "observaciones",
    ],
    "accesorios": [
        "nombre", "cantidad", "estado",
        "observaciones",
    ],
}


def _parse_csv(content: bytes) -> list[dict]:
    # Excel puede guardar como UTF-8 (con BOM) o como ANSI (cp1252) según versión/configuración
    try:
        text = content.decode("utf-8-sig")  # utf-8-sig elimina el BOM de Excel
    except UnicodeDecodeError:
        text = content.decode("cp1252")
    text = text.strip()

    # Excel (según configuración regional) puede exportar CSV con ';' en vez de ','
    sample = text[:4096]
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample, ",;\t|")
        delimiter = dialect.delimiter
    except Exception:
        # Fallback simple cuando Sniffer no acierta
        if ";" in sample and "," not in sample:
            delimiter = ";"

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    return list(reader)


def _parse_xlsx(content: bytes) -> list[dict]:
    """Parsea un .xlsx en memoria y devuelve lista de dicts (cabeceras tal cual).

    Usa openpyxl para leer la primera hoja y construir filas. Devuelve [] si no hay datos.
    """
    try:
        from openpyxl import load_workbook
    except Exception as e:
        raise RuntimeError("openpyxl no está instalado. Instala openpyxl en el entorno.") from e

    wb = load_workbook(filename=io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.values)
    if not rows:
        return []

    # Intentar detectar la fila de cabecera (no siempre es la primera fila en plantillas de Excel)
    header_idx = None
    tokens = ('placa', 'serial', 'usuario', 'tipo', 'marca', 'modelo', 'referencia')
    for i, row in enumerate(rows[:20]):
        row_str = ' '.join([str(x).strip().lower() if x is not None else '' for x in row])
        if any(t in row_str for t in tokens):
            header_idx = i
            break

    if header_idx is None:
        header_idx = 0

    headers = [str(h) if h is not None else "" for h in rows[header_idx]]
    out = []
    for row in rows[header_idx + 1:]:
        d = {}
        for i, h in enumerate(headers):
            try:
                val = row[i]
            except Exception:
                val = None
            d[h] = val if val is not None else ""
        out.append(d)
    return out


def _s(v) -> str:
    """Convierte cualquier valor de celda a str limpio (evita 'bool has no .strip')."""
    if v is None:
        return ""
    return str(v).strip()


def _normalize_header(h: str) -> str:
    # Normaliza cabeceras: trim, lowercase, espacios -> guion_bajo, elimina caracteres no alfanuméricos
    if h is None:
        return ""
    s = h.strip().lower()
    # Quita tildes/diacríticos: "Área" -> "Area"
    s = "".join(ch for ch in unicodedata.normalize("NFKD", s) if not unicodedata.combining(ch))
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]+", "", s)
    return s


async def _insert_equipo(row: dict) -> dict | None:
    # Normalizar booleano
    row["es_rentado"] = _s(row.get("es_rentado", "0")).lower() in ("1", "true", "si", "sí")
    # Limpiar vacíos → None (convierte todo a str primero)
    data = {k: (_s(v) if _s(v) != "" else None) for k, v in row.items()}
    data["es_rentado"] = row["es_rentado"]
    return await EquipoModel.create(data)


async def _insert_usuario(row: dict) -> None:
    data = {k: (_s(v) if _s(v) != "" else None) for k, v in row.items()}
    activo_raw = _s(data.get("activo") or "1").lower()
    data["activo"] = activo_raw not in ("0", "false", "no")
    await UsuarioModel.create(data)


async def _insert_suministro(row: dict) -> None:
    data = {k: (_s(v) if _s(v) != "" else None) for k, v in row.items()}
    if data.get("cantidad") is not None:
        data["cantidad"] = int(data["cantidad"])
    if data.get("cantidad_minima") is not None:
        data["cantidad_minima"] = int(data["cantidad_minima"])
    if data.get("costo") is not None:
        data["costo"] = float(data["costo"])
    await SuministroModel.create(data)


async def _insert_accesorio(row: dict) -> None:
    data = {k: (_s(v) if _s(v) != "" else None) for k, v in row.items()}
    if data.get("cantidad") is not None:
        data["cantidad"] = int(data["cantidad"])
    await AccesorioModel.create(data)


INSERTERS = {
    "equipos":     _insert_equipo,
    "usuarios":    _insert_usuario,
    "suministros": _insert_suministro,
    "accesorios":  _insert_accesorio,
}


# ── Endpoint principal ────────────────────────────────────────────────────────

@router.post("/{entidad}")
async def importar_csv(entidad: str, archivo: UploadFile = File(...), dry_run: bool = False):
    if entidad not in ENTIDADES:
        raise HTTPException(
            status_code=400,
            detail=f"Entidad no soportada. Usa: {', '.join(sorted(ENTIDADES))}.",
        )

    filename = (archivo.filename or "").lower()

    content = await archivo.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    # Soportar CSV y Excel (.xlsx)
    filas = []
    try:
        if filename.endswith(".csv"):
            filas = _parse_csv(content)
        elif filename.endswith(".xlsx") or filename.endswith(".xlsm"):
            try:
                filas = _parse_xlsx(content)
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Error al leer el Excel: {e}")
        else:
            raise HTTPException(status_code=400, detail="Solo se aceptan archivos .csv o .xlsx")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al procesar el archivo: {e}")

    if not filas:
        raise HTTPException(status_code=422, detail="El CSV no contiene filas de datos.")

    # Normalizar cabeceras y crear filas con keys normalizadas; convertir todos los valores a str
    try:
        filas_normalizadas = []
        for f in filas:
            normed = { _normalize_header(k): _s(v) for k, v in f.items() }
            filas_normalizadas.append(normed)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al normalizar cabeceras: {e}")

    # Intentar mapear columnas comunes a nombres canónicos cuando el archivo
    # usa cabeceras distintas (por ejemplo: 'PLACA COMPUTADORES' -> 'placa')
    # Esto ayuda a aceptar plantillas de Excel que no coinciden exactamente.
    mapping = {}
    if filas_normalizadas:
        headers_norm = list(filas_normalizadas[0].keys())
        # Mapas de alias sencillos: si la cabecera contiene alguno de estos tokens
        # la usamos como fuente para la columna canónica.
        ALIASES = {
            'placa': ['placa', 'codigo', 'codigo_activo'],
            'serial': ['serial', 'sn', 'numero_serial'],
            'tipo_equipo': ['tipo_equipo', 'tipo', 'torre', 'portatil', 'all_in_one'],
            'criticidad': ['criticidad'],
            'confidencialidad': ['confidencialidad', 'confidecialiad'],
            'usuario_nombre': ['usuario_asignado', 'nombre', 'usuario'],
            'area': ['area'],
            'marca': ['marca'],
            'modelo': ['modelo'],
            'referencia': ['referencia', 'modelo'],
        }

        mapping = {}
        for canon, tokens in ALIASES.items():
            if canon in headers_norm:
                continue
            for h in headers_norm:
                for t in tokens:
                    if t in h:
                        mapping[canon] = h
                        break
                if canon in mapping:
                    break

        # Aplicar mapping a cada fila (añadir la clave canónica si falta)
        if mapping:
            for row in filas_normalizadas:
                for canon, src in mapping.items():
                    if canon not in row or not row.get(canon):
                        row[canon] = row.get(src, '')

    # Validar que existan las columnas requeridas (usando cabeceras normalizadas)
    columnas_csv = set(filas_normalizadas[0].keys())
    faltantes = [c for c in REQUIRED[entidad] if c not in columnas_csv]
    if faltantes:
        if dry_run:
            # En dry_run devolvemos una vista previa y las columnas faltantes
            sample = filas_normalizadas[:20]
            return {
                "total": len(filas_normalizadas),
                "preview": sample,
                "mapping": mapping,
                "missing_columns": faltantes,
            }
        raise HTTPException(
            status_code=422,
            detail=f"El CSV no tiene las columnas requeridas: {', '.join(faltantes)}. "
                   f"Descarga la plantilla para ver el formato correcto.",
        )

    inserter = INSERTERS[entidad]
    insertados = 0
    errores: list[dict] = []

    # Si es dry_run ya devolvimos faltantes; si dry_run sin faltantes devolvemos preview
    if dry_run:
        sample = filas_normalizadas[:20]
        return {
            "total": len(filas_normalizadas),
            "preview": sample,
            "mapping": mapping,
            "missing_columns": [],
        }

    for idx, fila in enumerate(filas_normalizadas, start=2):   # start=2 porque fila 1 es cabecera
        # Ignorar filas completamente vacías
        if all(_s(v) == "" for v in fila.values()):
            continue
        # Validar campos requeridos
        vacios = [c for c in REQUIRED[entidad] if not str(fila.get(c, "")).strip()]
        if vacios:
            errores.append({
                "fila": idx,
                "campos": dict(fila),
                "error": f"Campos obligatorios vacíos: {', '.join(vacios)}",
            })
            continue
        try:
            created = await inserter(fila)
            insertados += 1

            # Auto-attach: si estamos importando equipos, buscar PDFs en Doc/ y registrar
            if entidad == 'equipos' and created:
                try:
                    # buscar archivo en Doc por nombre exacto o por placa/usuario
                    doc_dir = Path(__file__).resolve().parents[2] / 'Doc'
                    placa = (fila.get('placa') or '').strip()
                    usuario = (fila.get('usuario_nombre') or fila.get('nombre') or '').strip()

                    def find_match():
                        # 1) valores en la fila que parecen nombres de archivo
                        for v in fila.values():
                            if not v:
                                continue
                            s = str(v).strip()
                            if s.lower().endswith('.pdf'):
                                p = doc_dir / s
                                if p.exists():
                                    return p
                        # 2) buscar por placa en nombres de archivos
                        if placa:
                            for p in doc_dir.rglob('*.pdf'):
                                if placa.lower() in p.name.lower():
                                    return p
                        # 3) buscar por usuario tokens
                        if usuario:
                            tokens = [t for t in re.split(r"\s+", usuario) if t]
                            for p in doc_dir.rglob('*.pdf'):
                                name = p.name.lower()
                                if any(tok.lower() in name for tok in tokens):
                                    return p
                        return None

                    match = find_match()
                    if match:
                        content = match.read_bytes()
                        UPLOADS_DIR = os.getenv('UPLOADS_DIR', 'uploads')
                        os.makedirs(UPLOADS_DIR, exist_ok=True)
                        # crear nombre único en uploads
                        base = safe_filename(match.stem, default='doc')
                        ext = match.suffix or '.pdf'
                        new_name = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
                        dest = Path(UPLOADS_DIR) / new_name
                        dest.write_bytes(content)

                        # registrar documento
                        nuevo = await DocumentoModel.create({
                            'nombre': match.name,
                            'tipo': 'acta_entrega',
                            'equipo_id': created.get('id'),
                            'asignacion_id': None,
                            'usuario_id': None,
                            'url': f"/uploads/{new_name}",
                            'version': 1,
                            'cargado_por': None,
                        })
                        if nuevo:
                            # guardar blob en documentos_archivos también
                            try:
                                await DocumentoModel.upsert_archivo(nuevo['id'], filename=match.name, mime_type='application/pdf', contenido=content)
                            except Exception:
                                pass
                except Exception:
                    # no bloquear la importación por fallo en adjuntar archivos
                    pass

        except Exception as e:
            msg = str(e)
            if "Duplicate entry" in msg or "1062" in msg:
                msg = "Registro duplicado (placa o correo ya existe)"
            errores.append({"fila": idx, "campos": dict(fila), "error": msg})

    return {
        "total":      len(filas),
        "insertados": insertados,
        "errores":    errores,
    }


# ── Descarga de plantillas ────────────────────────────────────────────────────

@router.get("/{entidad}/plantilla")
async def descargar_plantilla(entidad: str):
    from fastapi.responses import Response

    if entidad not in ENTIDADES:
        raise HTTPException(
            status_code=400,
            detail=f"Entidad no soportada. Usa: {', '.join(sorted(ENTIDADES))}.",
        )

    headers_row = HEADERS[entidad]
    output = io.StringIO()
    # Delimitador ';' suele abrirse en columnas correctamente en Excel (ES)
    writer = csv.writer(output, delimiter=";")
    writer.writerow(headers_row)

    # Fila de ejemplo
    ejemplos: dict[str, list] = {
        "equipos": [
            "EAC000001", "SN123456", "Laptop", "Lenovo", "ThinkPad L14",
            "Windows 11", "16 GB", "512 GB SSD",
            "Alta", "Confidencial", "Disponible", "2024-01-10",
            "Proveedor SAS", "3500000", "0", "",
            "Intel Core i5", "ITAM-PC-001",
        ],
        "usuarios": [
            "Juan Pérez", "Asesor", "Servicio al Cliente",
            "Grupo A", "Tecnología", "juan.perez@empresa.com",
            "Piso 2", "1",
        ],
        "suministros": [
            "Toner HP 26A", "Toner", "CF226A", "HP", "LaserJet Pro M402",
            "5", "2", "Disponible", "TechSupplies SAS",
            "", "85000", "",
        ],
        "accesorios": [
            "Mouse inalámbrico", "SN-001",
            "1", "Disponible", "",
        ],
    }

    writer.writerow(ejemplos[entidad])

    csv_bytes = output.getvalue().encode("utf-8-sig")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="plantilla_{entidad}.csv"'
        },
    )
