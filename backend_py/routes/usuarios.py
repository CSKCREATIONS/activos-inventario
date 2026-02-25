from fastapi import APIRouter, HTTPException, Query
from models.usuario import UsuarioModel
from utils.serializer import serialize

router = APIRouter()


@router.get("")
async def get_all(busqueda: str = Query(""), area: str = Query("")):
    usuarios = await UsuarioModel.find_all(busqueda=busqueda, area=area)
    return serialize({"data": usuarios, "total": len(usuarios)})


@router.get("/areas")
async def get_areas():
    areas = await UsuarioModel.find_areas()
    return {"data": areas}


@router.get("/{id}")
async def get_by_id(id: str):
    usuario = await UsuarioModel.find_by_id(id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return serialize({"data": usuario})


@router.get("/{id}/perfil")
async def get_perfil(id: str):
    usuario = await UsuarioModel.find_by_id(id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    perfil = await UsuarioModel.get_perfil(id)
    return serialize({"data": {**usuario, **perfil}})


@router.post("", status_code=201)
async def create(body: dict):
    required = ["nombre", "cargo", "proceso", "grupo_asignado", "area", "correo"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan campos obligatorios: {', '.join(missing)}.",
        )
    try:
        nuevo = await UsuarioModel.create(body)
        return serialize({"data": nuevo, "message": "Usuario creado exitosamente."})
    except Exception as e:
        if "Duplicate entry" in str(e) or "1062" in str(e):
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo.")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}")
async def update(id: str, body: dict):
    existe = await UsuarioModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    try:
        actualizado = await UsuarioModel.update(id, body)
        return serialize({"data": actualizado, "message": "Usuario actualizado."})
    except Exception as e:
        if "Duplicate entry" in str(e) or "1062" in str(e):
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo.")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
async def remove(id: str):
    existe = await UsuarioModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    try:
        await UsuarioModel.delete(id)
        return {"message": "Usuario eliminado."}
    except Exception as e:
        if "1451" in str(e) or "foreign key" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="No se puede eliminar: el usuario tiene asignaciones registradas.",
            )
        raise HTTPException(status_code=500, detail=str(e))
