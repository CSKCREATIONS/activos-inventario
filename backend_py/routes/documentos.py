import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse, Response
from models.documento import DocumentoModel
from utils.serializer import serialize
from utils.files import safe_filename

router = APIRouter()

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")


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
    """Descarga segura de documentos: primero intenta BD (BLOB), luego fallback a /uploads."""
    doc = await DocumentoModel.find_by_id(id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    archivo = await DocumentoModel.get_archivo(id)
    if archivo and archivo.get("contenido"):
        filename = safe_filename(archivo.get("filename") or "documento", default="documento")
        return Response(
            content=archivo["contenido"],
            media_type=archivo.get("mime_type") or "application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # Fallback: si el documento apunta a /uploads/.., intentamos leerlo del disco.
    url = (doc.get("url") or "").strip()
    if url.startswith("/uploads/"):
        filename = Path(url).name
        file_path = os.path.join(UPLOADS_DIR, filename)
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                content = f.read()
            safe_name = safe_filename(filename, default="documento")
            media_type = "application/pdf" if safe_name.lower().endswith(".pdf") else "application/octet-stream"
            return Response(
                content=content,
                media_type=media_type,
                headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
            )

    raise HTTPException(status_code=404, detail="Archivo no disponible para descarga.")


@router.post("", status_code=201)
async def create(
    nombre: str = Form(...),
    tipo: str = Form(...),
    equipo_id: str = Form(None),
    asignacion_id: str = Form(None),
    usuario_id: str = Form(None),
    url: str = Form(None),
    version: int = Form(1),
    cargado_por: str = Form(None),
    file: UploadFile = File(None),
):
    final_url = url
    if file:
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        safe_name = safe_filename(file.filename, default="documento")
        file_path = os.path.join(UPLOADS_DIR, safe_name)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        final_url = f"/uploads/{safe_name}"

    if not final_url:
        raise HTTPException(status_code=400, detail="Se requiere una URL o un archivo adjunto.")

    try:
        nuevo = await DocumentoModel.create(
            {
                "nombre": nombre,
                "tipo": tipo,
                "equipo_id": equipo_id,
                "asignacion_id": asignacion_id,
                "usuario_id": usuario_id,
                "url": final_url,
                "version": version,
                "cargado_por": cargado_por,
            }
        )
        return serialize({"data": nuevo, "message": "Documento registrado exitosamente."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    file: UploadFile = File(None),
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

    if file:
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        safe_name = safe_filename(file.filename, default="documento")
        file_path = os.path.join(UPLOADS_DIR, safe_name)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        data["url"] = f"/uploads/{safe_name}"

    try:
        actualizado = await DocumentoModel.update(id, data)
        return serialize({"data": actualizado, "message": "Documento actualizado."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
