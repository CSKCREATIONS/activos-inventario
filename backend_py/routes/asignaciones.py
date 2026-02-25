from fastapi import APIRouter, HTTPException, Query
from models.asignacion import AsignacionModel
from utils.serializer import serialize

router = APIRouter()


@router.get("")
async def get_all(busqueda: str = Query(""), estado: str = Query("")):
    asignaciones = await AsignacionModel.find_all(busqueda=busqueda, estado=estado)
    activas = sum(1 for a in asignaciones if a["estado"] == "Activa")
    return serialize({"data": asignaciones, "total": len(asignaciones), "activas": activas})


@router.get("/equipos-disponibles")
async def get_equipos_disponibles():
    equipos = await AsignacionModel.get_equipos_disponibles()
    return serialize({"data": equipos})


@router.get("/{id}")
async def get_by_id(id: str):
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    return serialize({"data": asignacion})


@router.post("", status_code=201)
async def create(body: dict):
    required = ["usuario_id", "equipo_id", "fecha_asignacion"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan campos obligatorios: {', '.join(missing)}.",
        )
    try:
        nueva = await AsignacionModel.create(body)
        return serialize({"data": nueva, "message": "Asignación creada exitosamente."})
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}")
async def update(id: str, body: dict):
    existe = await AsignacionModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    try:
        actualizada = await AsignacionModel.update(id, body)
        return serialize({"data": actualizada, "message": "Asignación actualizada."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/devolucion")
async def registrar_devolucion(id: str):
    try:
        actualizada = await AsignacionModel.registrar_devolucion(id)
        return serialize({"data": actualizada, "message": "Devolución registrada. Equipo marcado como Disponible."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
