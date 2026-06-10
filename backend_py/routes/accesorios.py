from fastapi import APIRouter, Depends, HTTPException, Query
from models.accesorio import AccesorioModel
from utils.serializer import serialize
from utils.audit import log_action
from dependencies import get_current_user

router = APIRouter()


@router.get("")
async def get_all(busqueda: str = Query(""), estado: str = Query("")):
    accesorios = await AccesorioModel.find_all(busqueda=busqueda, estado=estado)
    return serialize({"data": accesorios, "total": len(accesorios)})


@router.get("/{id}")
async def get_by_id(id: str):
    accesorio = await AccesorioModel.find_by_id(id)
    if not accesorio:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado.")
    return serialize({"data": accesorio})


@router.post("", status_code=201)
async def create(body: dict, current_user: dict = Depends(get_current_user)):
    if not body.get("nombre"):
        raise HTTPException(status_code=400, detail="El campo nombre es obligatorio.")
    try:
        nuevo = await AccesorioModel.create(body)

        user_id = current_user.get("sub") or current_user.get("id")
        await log_action(
            user_id=user_id,
            accion="Creó accesorio",
            modulo="Accesorios",
            entidad_id=nuevo["id"],
            detalle=f"Nombre: {body['nombre']}, Placa: {body.get('placa', 'N/A')}"
        )
        return serialize({"data": nuevo, "message": "Accesorio registrado exitosamente."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}")
async def update(id: str, body: dict, current_user: dict = Depends(get_current_user)):
    existe = await AccesorioModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado.")
    try:
        actualizado = await AccesorioModel.update(id, body)

        user_id = current_user.get("sub") or current_user.get("id")
        await log_action(
            user_id=user_id,
            accion="Actualizó accesorio",
            modulo="Accesorios",
            entidad_id=id,
            detalle=f"Campos: {list(body.keys())}"
        )
        return serialize({"data": actualizado, "message": "Accesorio actualizado."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
async def remove(id: str, current_user: dict = Depends(get_current_user)):
    existe = await AccesorioModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado.")
    try:
        await AccesorioModel.delete(id)

        user_id = current_user.get("sub") or current_user.get("id")
        await log_action(
            user_id=user_id,
            accion="Eliminó accesorio",
            modulo="Accesorios",
            entidad_id=id,
            detalle=f"Nombre: {existe.get('nombre', 'N/A')}, Placa: {existe.get('placa', 'N/A')}"
        )
        return {"message": "Accesorio eliminado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))