from fastapi import APIRouter, Depends, HTTPException, Query, Request
from models.suministro import SuministroModel
from utils.serializer import serialize
from dependencies import get_current_user
from utils.audit import log_request

router = APIRouter()

TIPOS_VALIDOS  = {"Toner", "Licencia", "Cable", "Rollo", "Otro"}
ESTADOS_VALIDOS = {"Disponible", "Agotado", "Reservado", "Baja"}

@router.get("/stats")
async def get_stats():
    items = await SuministroModel.find_all()
    stats: dict = {"total": len(items), "por_tipo": {}, "por_estado": {}}
    for item in items:
        t = item.get("tipo", "Otro")
        s = item.get("estado", "Disponible")
        stats["por_tipo"][t] = stats["por_tipo"].get(t, 0) + 1
        stats["por_estado"][s] = stats["por_estado"].get(s, 0) + 1
    return serialize(stats)

@router.get("")
async def get_all(
    busqueda: str = Query(""),
    tipo: str = Query(""),
    estado: str = Query(""),
    equipo_id: str = Query(""),
):
    items = await SuministroModel.find_all(
        busqueda=busqueda, tipo=tipo, estado=estado, equipo_id=equipo_id
    )
    return serialize({"data": items, "total": len(items)})

@router.get("/{id}")
async def get_by_id(id: str):
    item = await SuministroModel.find_by_id(id)
    if not item:
        raise HTTPException(status_code=404, detail="Suministro no encontrado.")
    return serialize({"data": item})

@router.post("", status_code=201)
async def create(
    body: dict,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    required = ["nombre", "tipo"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan campos obligatorios: {', '.join(missing)}.",
        )
    if body["tipo"] not in TIPOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"tipo debe ser uno de: {', '.join(TIPOS_VALIDOS)}.",
        )
    try:
        nuevo = await SuministroModel.create(body)
        
        # Auditoría: obtener user_id correctamente
        user_id = current_user.get("sub") or current_user.get("id")
        await log_request(
            request=request,
            user_id=user_id,
            accion="Creó suministro",
            modulo="Suministros",
            entidad_id=nuevo["id"],
            detalle=f"Nombre: {body['nombre']}, Tipo: {body['tipo']}, Cantidad: {body.get('cantidad', 0)}"
        )
        
        return serialize({"data": nuevo, "message": "Suministro registrado exitosamente."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}")
async def update(
    id: str,
    body: dict,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    existe = await SuministroModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Suministro no encontrado.")
    if "tipo" in body and body["tipo"] not in TIPOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"tipo debe ser uno de: {', '.join(TIPOS_VALIDOS)}.",
        )
    if "estado" in body and body["estado"] not in ESTADOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"estado debe ser uno de: {', '.join(ESTADOS_VALIDOS)}.",
        )
    try:
        actualizado = await SuministroModel.update(id, body)
        
        # Auditoría
        user_id = current_user.get("sub") or current_user.get("id")
        campos_actualizados = list(body.keys())
        await log_request(
            request=request,
            user_id=user_id,
            accion="Actualizó suministro",
            modulo="Suministros",
            entidad_id=id,
            detalle=f"Suministro: {existe.get('nombre')} (ID: {id}), Campos: {campos_actualizados}"
        )
        
        return serialize({"data": actualizado, "message": "Suministro actualizado."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
async def remove(
    id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    existe = await SuministroModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Suministro no encontrado.")
    try:
        await SuministroModel.delete(id)
        
        # Auditoría
        user_id = current_user.get("sub") or current_user.get("id")
        await log_request(
            request=request,
            user_id=user_id,
            accion="Eliminó suministro",
            modulo="Suministros",
            entidad_id=id,
            detalle=f"Suministro: {existe.get('nombre')} (Tipo: {existe.get('tipo')})"
        )
        
        return {"message": "Suministro eliminado."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))