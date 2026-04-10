from fastapi import APIRouter, HTTPException
from models.licencia import LicenciaModel, LicenciaAsignadaModel
from utils.serializer import serialize

router = APIRouter()

ESTADOS_ASIGNACION = {"Activa", "Liberada", "Vencida"}

# ══════════════════════════════════════════════════════════════════════════════
# LICENCIAS (tipos)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("")
async def get_all(busqueda: str = ""):
    items = await LicenciaModel.find_all(busqueda=busqueda)
    return serialize({"data": items, "total": len(items)})


@router.post("", status_code=201)
async def create(body: dict):
    if not body.get("nombre"):
        raise HTTPException(status_code=400, detail="El campo 'nombre' es obligatorio.")
    nuevo = await LicenciaModel.create(body)
    return serialize({"data": nuevo, "message": "Licencia registrada exitosamente."})


@router.put("/{id}")
async def update(id: str, body: dict):
    if not await LicenciaModel.find_by_id(id):
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")
    actualizado = await LicenciaModel.update(id, body)
    return serialize({"data": actualizado, "message": "Licencia actualizada."})


@router.delete("/{id}")
async def delete(id: str):
    if not await LicenciaModel.find_by_id(id):
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")
    await LicenciaModel.delete(id)
    return {"message": "Licencia eliminada."}


# ══════════════════════════════════════════════════════════════════════════════
# ASIGNACIONES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{licencia_id}/asignaciones")
async def get_asignaciones(licencia_id: str):
    if not await LicenciaModel.find_by_id(licencia_id):
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")
    items = await LicenciaAsignadaModel.find_by_licencia(licencia_id)
    return serialize({"data": items, "total": len(items)})


@router.post("/{licencia_id}/asignaciones", status_code=201)
async def crear_asignacion(licencia_id: str, body: dict):
    licencia = await LicenciaModel.find_by_id(licencia_id)
    if not licencia:
        raise HTTPException(status_code=404, detail="Licencia no encontrada.")
    # Verificar que aún hay stock disponible
    if int(licencia.get("cantidad_disponible") or 0) <= 0:
        raise HTTPException(status_code=409, detail="No hay licencias disponibles para asignar.")
    body["licencia_id"] = licencia_id
    nueva = await LicenciaAsignadaModel.create(body)
    return serialize({"data": nueva, "message": "Licencia asignada exitosamente."})


@router.put("/asignaciones/{id}")
async def actualizar_asignacion(id: str, body: dict):
    if not await LicenciaAsignadaModel.find_by_id(id):
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    if "estado" in body and body["estado"] not in ESTADOS_ASIGNACION:
        raise HTTPException(status_code=400, detail=f"estado debe ser: {', '.join(ESTADOS_ASIGNACION)}.")
    actualizado = await LicenciaAsignadaModel.update(id, body)
    return serialize({"data": actualizado, "message": "Asignación actualizada."})


@router.post("/asignaciones/{id}/liberar")
async def liberar_asignacion(id: str):
    if not await LicenciaAsignadaModel.find_by_id(id):
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    actualizado = await LicenciaAsignadaModel.liberar(id)
    return serialize({"data": actualizado, "message": "Licencia liberada."})


@router.delete("/asignaciones/{id}")
async def eliminar_asignacion(id: str):
    if not await LicenciaAsignadaModel.find_by_id(id):
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    await LicenciaAsignadaModel.delete(id)
    return {"message": "Asignación eliminada."}
