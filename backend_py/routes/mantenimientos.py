from fastapi import APIRouter, Depends, HTTPException
from models.mantenimiento import registrar_mantenimiento, listar_mantenimientos_por_equipo
from models.equipo import EquipoModel
from dependencies import get_current_user
from utils.audit import log_action
from utils.serializer import serialize

router = APIRouter()

@router.post("/equipos/{equipo_id}/mantenimientos", status_code=201)
async def agregar_mantenimiento(
    equipo_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    equipo = await EquipoModel.find_by_id(equipo_id)
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    if "fecha" not in body or "tipo" not in body:
        raise HTTPException(status_code=400, detail="fecha y tipo son requeridos")
    
    nuevo = await registrar_mantenimiento(equipo_id, body)
    
    # Auditoría
    user_id = current_user.get("sub") or current_user.get("id")
    await log_action(
        user_id=user_id,
        accion="Registró mantenimiento",
        modulo="Activos",
        entidad_id=equipo_id,
        detalle=f"Tipo: {body['tipo']}, Fecha: {body['fecha']}"
    )
    
    return serialize({"data": nuevo, "message": "Mantenimiento registrado"})

@router.get("/equipos/{equipo_id}/mantenimientos")
async def obtener_mantenimientos(
    equipo_id: str,
    current_user: dict = Depends(get_current_user)
):
    equipo = await EquipoModel.find_by_id(equipo_id)
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    items = await listar_mantenimientos_por_equipo(equipo_id)
    return serialize({"data": items})