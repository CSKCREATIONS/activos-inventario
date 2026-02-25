from fastapi import APIRouter, HTTPException, Query
from models.accesorio import AccesorioModel
from utils.serializer import serialize

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
async def create(body: dict):
    if not body.get("nombre"):
        raise HTTPException(status_code=400, detail="El campo nombre es obligatorio.")
    try:
        nuevo = await AccesorioModel.create(body)
        return serialize({"data": nuevo, "message": "Accesorio registrado exitosamente."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}")
async def update(id: str, body: dict):
    existe = await AccesorioModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado.")
    try:
        actualizado = await AccesorioModel.update(id, body)
        return serialize({"data": actualizado, "message": "Accesorio actualizado."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
async def remove(id: str):
    existe = await AccesorioModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado.")
    try:
        await AccesorioModel.delete(id)
        return {"message": "Accesorio eliminado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
