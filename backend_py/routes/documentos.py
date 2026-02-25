import os
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from models.documento import DocumentoModel
from utils.serializer import serialize

router = APIRouter()

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")


@router.get("")
async def get_all(
    busqueda: str = Query(""),
    tipo: str = Query(""),
    equipo_id: str = Query(""),
    usuario_id: str = Query(""),
):
    documentos = await DocumentoModel.find_all(
        busqueda=busqueda, tipo=tipo, equipo_id=equipo_id, usuario_id=usuario_id
    )
    return serialize({"data": documentos, "total": len(documentos)})


@router.get("/{id}")
async def get_by_id(id: str):
    doc = await DocumentoModel.find_by_id(id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    return serialize({"data": doc})


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
        file_path = os.path.join(UPLOADS_DIR, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        final_url = f"/uploads/{file.filename}"

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
        file_path = os.path.join(UPLOADS_DIR, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        data["url"] = f"/uploads/{file.filename}"

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
