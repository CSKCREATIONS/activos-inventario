import os
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import Response
from models.documento import DocumentoModel
from utils.serializer import serialize
from utils.files import safe_filename

router = APIRouter()

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
# Crear directorio por compatibilidad, aunque ya no guardamos archivos en disco
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Configuración de seguridad
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",        # .xlsx
    "image/png",
    "image/jpeg",
    "text/plain",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _validate_file(content_type: str, size: int) -> None:
    """Lanza excepción si el tipo MIME o tamaño no son permitidos."""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de archivo no permitido. Permitidos: {', '.join(ALLOWED_MIME_TYPES)}"
        )
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo excede el tamaño máximo de {MAX_FILE_SIZE // (1024*1024)} MB"
        )


@router.get("")
async def get_all(
    busqueda: str = Query(""),
    tipo: str = Query(""),
    equipo_id: str = Query(""),
    asignacion_id: str = Query(""),
    usuario_id: str = Query(""),
):
    documentos = await DocumentoModel.find_all(
        busqueda=busqueda,
        tipo=tipo,
        equipo_id=equipo_id,
        asignacion_id=asignacion_id,
        usuario_id=usuario_id,
    )
    return serialize({"data": documentos, "total": len(documentos)})


@router.get("/{id}")
async def get_by_id(id: str):
    doc = await DocumentoModel.find_by_id(id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    return serialize({"data": doc})


@router.get("/{id}/download")
async def download(id: str):
    """Descarga segura de documentos desde el BLOB (única fuente de verdad)."""
    doc = await DocumentoModel.find_by_id(id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    archivo = await DocumentoModel.get_archivo(id)
    if not archivo or not archivo.get("contenido"):
        raise HTTPException(status_code=404, detail="Archivo no disponible para descarga.")

    filename = safe_filename(archivo.get("filename") or "documento", default="documento")
    return Response(
        content=archivo["contenido"],
        media_type=archivo.get("mime_type") or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create(
    nombre: str = Form(...),
    tipo: str = Form(...),
    equipo_id: str = Form(None),
    asignacion_id: str = Form(None),
    usuario_id: str = Form(None),
    url: str = Form(None),   # Se ignora si se sube archivo
    version: int = Form(1),
    cargado_por: str = Form(None),
    archivo: UploadFile = File(...),  # Campo obligatorio
):
    # Validar archivo
    content = await archivo.read()
    await archivo.close()
    _validate_file(archivo.content_type or "application/octet-stream", len(content))

    # Generar nombre único para el almacenamiento interno
    original_filename = archivo.filename or "documento"
    unique_filename = f"{uuid.uuid4().hex}_{safe_filename(original_filename, default='documento')}"

    # Crear documento en BD (url queda como marcador, no se usará para servir)
    nuevo = await DocumentoModel.create({
        "nombre": nombre,
        "tipo": tipo,
        "equipo_id": equipo_id,
        "asignacion_id": asignacion_id,
        "usuario_id": usuario_id,
        "url": f"blob://{unique_filename}",  # solo referencia
        "version": version,
        "cargado_por": cargado_por,
    })

    if nuevo:
        # Guardar contenido en tabla de blobs
        await DocumentoModel.upsert_archivo(
            nuevo["id"],
            filename=original_filename,
            mime_type=archivo.content_type or "application/octet-stream",
            contenido=content,
        )

    return serialize({"data": nuevo, "message": "Documento registrado exitosamente."})


@router.put("/{id}")
async def update(
    id: str,
    nombre: str = Form(None),
    tipo: str = Form(None),
    equipo_id: str = Form(None),
    asignacion_id: str = Form(None),
    usuario_id: str = Form(None),
    url: str = Form(None),
    version: int = Form(None),
    cargado_por: str = Form(None),
    archivo: UploadFile = File(None),  # opcional
):
    existe = await DocumentoModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    data: dict = {}
    for key, val in {
        "nombre": nombre, "tipo": tipo, "equipo_id": equipo_id,
        "asignacion_id": asignacion_id, "usuario_id": usuario_id,
        "url": url, "version": version, "cargado_por": cargado_por,
    }.items():
        if val is not None:
            data[key] = val

    # Si se envía un nuevo archivo, validar y actualizar BLOB
    if archivo:
        content = await archivo.read()
        await archivo.close()
        _validate_file(archivo.content_type or "application/octet-stream", len(content))

        original_filename = archivo.filename or "documento"
        unique_filename = f"{uuid.uuid4().hex}_{safe_filename(original_filename, default='documento')}"
        data["url"] = f"blob://{unique_filename}"  # actualizar referencia

        # Actualizar primero los metadatos
        actualizado = await DocumentoModel.update(id, data)
        if actualizado:
            # Guardar nuevo contenido en blobs (sobrescribe)
            await DocumentoModel.upsert_archivo(
                id,
                filename=original_filename,
                mime_type=archivo.content_type or "application/octet-stream",
                contenido=content,
            )
        return serialize({"data": actualizado, "message": "Documento actualizado con nuevo archivo."})

    # Sin archivo nuevo: solo actualizar metadatos
    actualizado = await DocumentoModel.update(id, data)
    return serialize({"data": actualizado, "message": "Documento actualizado."})


@router.delete("/{id}")
async def remove(id: str):
    existe = await DocumentoModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    try:
        await DocumentoModel.delete(id)
        return {"message": "Documento eliminado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))