from fastapi import APIRouter, HTTPException, Query
from models.equipo import EquipoModel
from utils.serializer import serialize

router = APIRouter()


@router.get("")
async def get_all(
    busqueda: str = Query(""),
    estado: str = Query(""),
    criticidad: str = Query(""),
    tipo: str = Query(""),
    es_rentado: str = Query(None),
):
    rentado_flag = None
    if es_rentado is not None:
        rentado_flag = es_rentado.lower() == "true"

    equipos = await EquipoModel.find_all(
        busqueda=busqueda,
        estado=estado,
        criticidad=criticidad,
        tipo=tipo,
        es_rentado=rentado_flag,
    )
    return serialize({"data": equipos, "total": len(equipos)})


@router.get("/{id}/historial")
async def get_historial(id: str):
    equipo = await EquipoModel.find_by_id(id)
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")
    historial = await EquipoModel.get_historial(id)
    responsable = await EquipoModel.get_responsable(id)
    return serialize({"data": {"equipo": equipo, "historial": historial, "responsable": responsable}})


@router.get("/{id}")
async def get_by_id(id: str):
    equipo = await EquipoModel.find_by_id(id)
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")
    return serialize({"data": equipo})


@router.post("", status_code=201)
async def create(body: dict):
    required = ["placa", "tipo_equipo", "criticidad", "confidencialidad"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan campos obligatorios: {', '.join(missing)}.",
        )
    existePlaca = await EquipoModel.find_by_placa(body["placa"])
    if existePlaca:
        raise HTTPException(
            status_code=409, detail=f"Ya existe un equipo con la placa {body['placa']}."
        )
    try:
        nuevo = await EquipoModel.create(body)
        return serialize({"data": nuevo, "message": "Equipo registrado exitosamente."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}")
async def update(id: str, body: dict):
    existe = await EquipoModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")
    if body.get("placa") and body["placa"] != existe["placa"]:
        otro = await EquipoModel.find_by_placa(body["placa"])
        if otro:
            raise HTTPException(
                status_code=409, detail=f"Ya existe un equipo con la placa {body['placa']}."
            )
    try:
        actualizado = await EquipoModel.update(id, body)
        return serialize({"data": actualizado, "message": "Equipo actualizado."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}")
async def remove(id: str):
    existe = await EquipoModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")
    try:
        await EquipoModel.delete(id)
        return {"message": "Equipo eliminado."}
    except Exception as e:
        if "1451" in str(e) or "foreign key" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="No se puede eliminar: el equipo tiene asignaciones o accesorios asociados.",
            )
        raise HTTPException(status_code=500, detail=str(e))
