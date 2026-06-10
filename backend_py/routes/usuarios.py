from fastapi import APIRouter, Depends, HTTPException, Query
from models.usuario import UsuarioModel
from utils.serializer import serialize
from utils.audit import log_action
from dependencies import get_current_user



router = APIRouter()


def _normalizar_correo(correo):
    if correo is None:
        return ""
    correo = str(correo).strip()
    return correo


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
async def create(body: dict, current_user: dict = Depends(get_current_user)):
    required = ["nombre", "area"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan campos obligatorios: {', '.join(missing)}.",
        )
    try:
        body["correo"] = _normalizar_correo(body.get("correo"))
        nuevo = await UsuarioModel.create(body)

        # Obtener ID del usuario autenticado (el token usa "sub")
        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            await log_action(
                user_id=user_id,
                accion="Creó usuario",
                modulo="Usuarios",
                entidad_id=nuevo["id"],
                detalle=f"Nombre: {body['nombre']}, Área: {body['area']}, Correo: {body.get('correo', 'N/A')}"
            )
        else:
            print("Advertencia: no se pudo obtener user_id para auditoría (POST usuario)")

        return serialize({"data": nuevo, "message": "Usuario creado exitosamente."})
    except Exception as e:
        print(f"Error en POST /usuarios: {e}")
        if "Duplicate entry" in str(e) or "1062" in str(e):
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo.")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}")
async def update(id: str, body: dict, current_user: dict = Depends(get_current_user)):
    existe = await UsuarioModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    try:
        if "correo" in body:
            body["correo"] = _normalizar_correo(body.get("correo"))
        actualizado = await UsuarioModel.update(id, body)

        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            await log_action(
                user_id=user_id,
                accion="Actualizó usuario",
                modulo="Usuarios",
                entidad_id=id,
                detalle=f"Campos actualizados: {list(body.keys())}"
            )
        else:
            print("Advertencia: no se pudo obtener user_id para auditoría (PUT usuario)")

        return serialize({"data": actualizado, "message": "Usuario actualizado."})
    except Exception as e:
        print(f"Error en PUT /usuarios/{id}: {e}")
        if "Duplicate entry" in str(e) or "1062" in str(e):
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo.")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
async def remove(id: str, current_user: dict = Depends(get_current_user)):
    existe = await UsuarioModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    try:
        await UsuarioModel.delete(id)

        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            await log_action(
                user_id=user_id,
                accion="Eliminó usuario",
                modulo="Usuarios",
                entidad_id=id,
                detalle=f"Usuario: {existe.get('nombre', 'N/A')} (ID: {id})"
            )
        else:
            print("Advertencia: no se pudo obtener user_id para auditoría (DELETE usuario)")

        return {"message": "Usuario eliminado."}
    except Exception as e:
        print(f"Error en DELETE /usuarios/{id}: {e}")
        if "1451" in str(e) or "foreign key" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="No se puede eliminar: el usuario tiene asignaciones registradas.",
            )
        raise HTTPException(status_code=500, detail=str(e))