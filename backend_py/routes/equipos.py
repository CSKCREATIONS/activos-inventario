import os
from datetime import date

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from models.equipo import EquipoModel
from models.documento import DocumentoModel
from utils.serializer import serialize
from utils.hoja_vida_pdf import generar_hoja_vida_pdf
from utils.files import safe_filename

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
            "nombre":      f"Hoja de vida {equipo['placa']}",
            "tipo":        "Hoja de vida",
            "equipo_id":   equipo["id"],
            "url":         file_url,
            "fecha_carga": date.today().isoformat(),
            "cargado_por": "Sistema",
            "version":     1,
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
            "url":        file_url,
            "fecha_carga": date.today().isoformat(),
            "version":    (existing[0].get("version") or 1) + 1,
        })
        if doc:
            await DocumentoModel.upsert_archivo(
                doc["id"],
                filename=filename,
                mime_type="application/pdf",
                contenido=pdf_bytes,
            )
    return pdf_bytes, filename


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


@router.get("/{id}/hoja-vida-pdf")
async def get_hoja_vida_pdf(id: str):
    """Genera (o regenera) la Hoja de Vida en PDF, la almacena en uploads y la devuelve como descarga."""
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
async def create(body: dict):
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
            return serialize({"data": nuevo, "message": "Equipo rentado actualizado exitosamente."})

        nuevo = await EquipoModel.create(body)

        # Auto-generar Hoja de Vida si es Laptop/Desktop/All-in-one.
        if nuevo and _requiere_hoja_vida(nuevo, generar_hoja_vida):
            try:
                await _generar_y_registrar_hoja_vida(nuevo)
            except Exception:
                pass  # No bloquear la creación si falla el PDF

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
        generar_hoja_vida = body.get("generar_hoja_vida")
        actualizado = await EquipoModel.update(id, body)
        if actualizado and generar_hoja_vida is True and _requiere_hoja_vida(actualizado, generar_hoja_vida):
            try:
                await _generar_y_registrar_hoja_vida(actualizado)
            except Exception:
                pass
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
