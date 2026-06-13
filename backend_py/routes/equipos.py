import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from models.equipo import EquipoModel
from models.documento import DocumentoModel
from utils.serializer import serialize
from utils.hoja_vida_pdf import generar_hoja_vida_pdf
from utils.files import safe_filename
from utils.audit import log_action
from dependencies import get_current_user

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
TIPOS_CON_HV = {"Laptop", "Desktop", "All-in-one"}

router = APIRouter()

def _requiere_hoja_vida(equipo: dict, generar_hoja_vida: bool | None) -> bool:
    return bool(
        equipo
        and equipo.get("tipo_equipo") in TIPOS_CON_HV
        and generar_hoja_vida is not False
    )

async def _generar_y_registrar_hoja_vida(equipo: dict) -> tuple[bytes, str]:
    historial = await EquipoModel.get_historial(equipo["id"])
    pdf_bytes = generar_hoja_vida_pdf(dict(equipo), list(historial))

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    filename = safe_filename(f"hoja_vida_{equipo['placa']}.pdf", default="hoja_vida.pdf")
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    file_url = f"/uploads/{filename}"
    existing = await DocumentoModel.find_all(tipo="Hoja de vida", equipo_id=equipo["id"])
    if not existing:
        doc = await DocumentoModel.create({
            "nombre": f"Hoja de vida {equipo['placa']}",
            "tipo": "Hoja de vida",
            "equipo_id": equipo["id"],
            "url": file_url,
            "fecha_carga": date.today().isoformat(),
            "cargado_por": "Sistema",
            "version": 1,
        })
        if doc:
            await DocumentoModel.upsert_archivo(
                doc["id"],
                filename=filename,
                mime_type="application/pdf",
                contenido=pdf_bytes,
            )
    else:
        doc = await DocumentoModel.update(existing[0]["id"], {
            "url": file_url,
            "fecha_carga": date.today().isoformat(),
            "version": (existing[0].get("version") or 1) + 1,
        })
        if doc:
            await DocumentoModel.upsert_archivo(
                doc["id"],
                filename=filename,
                mime_type="application/pdf",
                contenido=pdf_bytes,
            )
    return pdf_bytes, filename

# ==================== ENDPOINTS ====================

@router.get("")
async def get_all(
    busqueda: str = Query(""),
    estado: str = Query(""),
    criticidad: str = Query(""),
    tipo: str = Query(""),
    es_rentado: str = Query(None),
    sede: str = Query(""),   
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
        sede=sede,
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

@router.get("/{id}/hoja-vida-pdf")
async def get_hoja_vida_pdf(id: str):
    equipo = await EquipoModel.find_by_id(id)
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")
    pdf_bytes, filename = await _generar_y_registrar_hoja_vida(equipo)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/{id}")
async def get_by_id(id: str):
    equipo = await EquipoModel.find_by_id(id)
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")
    return serialize({"data": equipo})

@router.post("", status_code=201)
async def create(body: dict, current_user: dict = Depends(get_current_user)):
    required = ["placa", "tipo_equipo", "criticidad", "confidencialidad"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan campos obligatorios: {', '.join(missing)}.",
        )
    try:
        generar_hoja_vida = body.get("generar_hoja_vida")
        existe_placa = await EquipoModel.find_by_placa(body["placa"])

        if existe_placa:
            if not body.get("es_rentado"):
                raise HTTPException(
                    status_code=409, detail=f"Ya existe un equipo con la placa {body['placa']}."
                )
            nuevo = await EquipoModel.update(existe_placa["id"], body)
            if nuevo and _requiere_hoja_vida(nuevo, generar_hoja_vida):
                try:
                    await _generar_y_registrar_hoja_vida(nuevo)
                except Exception:
                    pass
            # Auditoría
            user_id = current_user.get("sub") or current_user.get("id")
            if user_id:
                await log_action(
                    user_id=user_id,
                    accion="Actualizó equipo rentado",
                    modulo="Activos",
                    entidad_id=nuevo["id"],
                    detalle=f"Placa: {body['placa']}, Tipo: {body['tipo_equipo']}"
                )
            return serialize({"data": nuevo, "message": "Equipo rentado actualizado exitosamente."})

        nuevo = await EquipoModel.create(body)

        if nuevo and _requiere_hoja_vida(nuevo, generar_hoja_vida):
            try:
                await _generar_y_registrar_hoja_vida(nuevo)
            except Exception:
                pass

        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            await log_action(
                user_id=user_id,
                accion="Creó equipo",
                modulo="Activos",
                entidad_id=nuevo["id"],
                detalle=f"Placa: {body['placa']}, Tipo: {body['tipo_equipo']}"
            )
        return serialize({"data": nuevo, "message": "Equipo registrado exitosamente."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}")
async def update(id: str, body: dict, current_user: dict = Depends(get_current_user)):
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
        generar_hoja_vida = body.get("generar_hoja_vida")
        actualizado = await EquipoModel.update(id, body)
        if actualizado and generar_hoja_vida is True and _requiere_hoja_vida(actualizado, generar_hoja_vida):
            try:
                await _generar_y_registrar_hoja_vida(actualizado)
            except Exception:
                pass

        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            await log_action(
                user_id=user_id,
                accion="Actualizó equipo",
                modulo="Activos",
                entidad_id=id,
                detalle=f"Placa: {body.get('placa', existe['placa'])}, Campos: {list(body.keys())}"
            )
        return serialize({"data": actualizado, "message": "Equipo actualizado."})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
async def remove(id: str, current_user: dict = Depends(get_current_user)):
    existe = await EquipoModel.find_by_id(id)
    if not existe:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")
    try:
        await EquipoModel.delete(id)
        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            await log_action(
                user_id=user_id,
                accion="Eliminó equipo",
                modulo="Activos",
                entidad_id=id,
                detalle=f"Placa: {existe.get('placa', 'N/A')}, Tipo: {existe.get('tipo_equipo', 'N/A')}"
            )
        return {"message": "Equipo eliminado."}
    except Exception as e:
        if "1451" in str(e) or "foreign key" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="No se puede eliminar: el equipo tiene asignaciones o accesorios asociados.",
            )
        raise HTTPException(status_code=500, detail=str(e))