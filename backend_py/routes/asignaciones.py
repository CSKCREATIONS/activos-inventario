import os
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response

from models.asignacion import AsignacionModel
from models.documento import DocumentoModel
from models.equipo import EquipoModel
from dependencies import get_current_user
from routes.equipos import _generar_y_registrar_hoja_vida, _requiere_hoja_vida
from utils.accesorios import normalizar_accesorios_entregados
from utils.acta_entrega_pdf import generar_acta_entrega_pdf
from utils.files import safe_filename
from utils.serializer import serialize
from utils.audit import log_action
from config.db import get_pool

router = APIRouter()

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
ACCESORIOS_OPCIONES = ["Cargador", "Mouse", "Teclado", "Monitor"]


async def _cambiar_estado_accesorios(accesorios_ids: list[str], nuevo_estado: str):
    if not accesorios_ids:
        return
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            for eq_id in accesorios_ids:
                await cur.execute(
                    "UPDATE equipos SET estado = %s WHERE id = %s",
                    (nuevo_estado, eq_id)
                )


async def _generar_y_registrar_acta(
    asignacion: dict,
    *,
    accesorios_entregados: list[str],
    cargado_por: str,
    regenerar: bool = False,
) -> tuple[bytes, str, str]:
    existing_docs = await DocumentoModel.find_all(tipo="Acta", asignacion_id=asignacion["id"])
    if not regenerar and existing_docs:
        doc = existing_docs[0]
        archivo = await DocumentoModel.get_archivo(doc["id"])
        if archivo and archivo.get("contenido"):
            pdf_bytes = archivo["contenido"]
            filename = safe_filename(archivo.get("filename") or "acta.pdf", default="acta.pdf")
            file_url = doc.get("url") or f"/uploads/{filename}"
            return pdf_bytes, filename, file_url
        if doc.get("url") and doc["url"].startswith("/uploads/"):
            file_path = os.path.join(UPLOADS_DIR, Path(doc["url"]).name)
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    pdf_bytes = f.read()
                filename = Path(file_path).name
                file_url = doc["url"]
                return pdf_bytes, filename, file_url

    pdf_bytes = generar_acta_entrega_pdf(
        dict(asignacion),
        accesorios_opciones=ACCESORIOS_OPCIONES,
        accesorios_entregados=accesorios_entregados,
        entregado_por=cargado_por,
    )

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    placa = asignacion.get("placa") or "equipo"
    filename = safe_filename(
        f"acta_entrega_{placa}_{str(asignacion.get('id') or '')[:8]}.pdf",
        default="acta_entrega.pdf",
    )
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)
    file_url = f"/uploads/{filename}"

    if not existing_docs:
        doc = await DocumentoModel.create({
            "nombre": f"Acta entrega {placa}",
            "tipo": "Acta",
            "equipo_id": asignacion.get("equipo_id"),
            "asignacion_id": asignacion.get("id"),
            "usuario_id": asignacion.get("usuario_id"),
            "url": file_url,
            "fecha_carga": date.today().isoformat(),
            "cargado_por": cargado_por,
            "version": 1,
        })
        if doc:
            await DocumentoModel.upsert_archivo(doc["id"], filename=filename, mime_type="application/pdf", contenido=pdf_bytes)
    else:
        nueva_version = (existing_docs[0].get("version") or 1) + 1
        doc = await DocumentoModel.update(existing_docs[0]["id"], {
            "url": file_url,
            "fecha_carga": date.today().isoformat(),
            "cargado_por": cargado_por,
            "version": nueva_version,
        })
        if doc:
            await DocumentoModel.upsert_archivo(doc["id"], filename=filename, mime_type="application/pdf", contenido=pdf_bytes)

    await AsignacionModel.update(asignacion["id"], {"acta_pdf": file_url})
    return pdf_bytes, filename, file_url


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
async def create(body: dict, current_user: dict = Depends(get_current_user)):
    required = ["usuario_id", "equipo_id", "fecha_asignacion"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan campos obligatorios: {', '.join(missing)}.",
        )

    nueva = None
    try:
        nueva = await AsignacionModel.create(body)

        accesorios_raw = body.get("accesorios_entregados", [])
        accesorios_ids = []
        for acc in accesorios_raw:
            if isinstance(acc, dict) and acc.get("id"):
                accesorios_ids.append(acc["id"])
        if accesorios_ids:
            await _cambiar_estado_accesorios(accesorios_ids, "Asignado")

        cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
        accesorios_textos = normalizar_accesorios_entregados(body.get("accesorios_entregados"))

        acta_error = None
        try:
            await _generar_y_registrar_acta(nueva, accesorios_entregados=accesorios_textos, cargado_por=cargado_por, regenerar=False)
        except Exception as e:
            acta_error = str(e)
            print(f"[ERROR] Falló generación de acta: {acta_error}")

        if body.get("generar_hoja_vida") is True:
            try:
                equipo = await EquipoModel.find_by_id(nueva.get("equipo_id"))
                if equipo and _requiere_hoja_vida(equipo, True):
                    await _generar_y_registrar_hoja_vida(equipo)
            except Exception as e:
                print(f"[ERROR] Falló generación de HV: {e}")

        try:
            hv = await DocumentoModel.find_all(tipo="Hoja de vida", equipo_id=nueva.get("equipo_id"))
            if hv:
                await AsignacionModel.update(nueva["id"], {"hoja_vida_pdf": hv[0].get("url")})
        except Exception as e:
            print(f"[ERROR] Falló enlace HV: {e}")

        nueva = await AsignacionModel.find_by_id(nueva["id"])

        # Auditoría
        user_id = current_user.get("sub") or current_user.get("id")
        await log_action(
            user_id=user_id,
            accion="Creó asignación",
            modulo="Asignaciones",
            entidad_id=nueva["id"],
            detalle=f"Usuario: {body['usuario_id']}, Equipo: {body['equipo_id']}, Accesorios: {len(accesorios_ids)}"
        )

        response_data = {"data": nueva, "message": "Asignación creada exitosamente."}
        if acta_error:
            response_data["warning"] = f"Acta generada con error: {acta_error}"
        return serialize(response_data)

    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}/acta-pdf")
async def get_acta_pdf(
    id: str,
    force: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
    accesorios = normalizar_accesorios_entregados(asignacion.get("accesorios_entregados"))
    try:
        pdf_bytes, filename, _ = await _generar_y_registrar_acta(
            asignacion,
            accesorios_entregados=accesorios,
            cargado_por=cargado_por,
            regenerar=force,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar el acta: {str(e)}")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Acta-Generated": "true" if force else "false",
            "X-Acta-Length": str(len(pdf_bytes)),
        },
    )

    


@router.put("/{id}")
async def update(id: str, body: dict, current_user: dict = Depends(get_current_user)):
    try:
        asignacion = await AsignacionModel.find_by_id(id)
        if not asignacion:
            raise HTTPException(status_code=404, detail="Asignación no encontrada.")

        actualizada = await AsignacionModel.update(id, body)

        user_id = current_user.get("sub") or current_user.get("id")
        await log_action(
            user_id=user_id,
            accion="Actualizó asignación",
            modulo="Asignaciones",
            entidad_id=id,
            detalle=f"Campos: {list(body.keys())}"
        )

        return serialize({"data": actualizada, "message": "Asignación actualizada exitosamente."})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/{id}/firmar")
async def firmar_asignacion(
    id: str,
    body: dict,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    if asignacion["estado"] != "Activa":
        raise HTTPException(status_code=400, detail="Solo se pueden firmar asignaciones activas")

    firma_base64 = body.get("firma")
    if not firma_base64:
        raise HTTPException(status_code=400, detail="Firma requerida")

    # Solo actualiza la base de datos; NO regeneres el acta aquí
    await AsignacionModel.update(id, {
        "firma_responsable": firma_base64,
        "fecha_firma": date.today().isoformat(),
        "firmado": 1
    })

    # Auditoría
    user_id = current_user.get("sub") or current_user.get("id")
    await log_action(
        user_id=user_id,
        accion="Firmó acta",
        modulo="Asignaciones",
        entidad_id=id,
        detalle="Acta firmada por responsable"
    )

    return {"message": "Acta firmada correctamente"}

@router.post("/{id}/devolucion")
async def registrar_devolucion(id: str, current_user: dict = Depends(get_current_user)):
    try:
        asignacion = await AsignacionModel.find_by_id(id)
        if not asignacion:
            raise HTTPException(status_code=404, detail="Asignación no encontrada.")

        accesorios_raw = asignacion.get("accesorios_entregados") or []
        if not isinstance(accesorios_raw, list):
            accesorios_raw = []

        accesorios_ids = []
        for acc in accesorios_raw:
            if isinstance(acc, dict) and acc.get("id"):
                accesorios_ids.append(acc["id"])
        if accesorios_ids:
            await _cambiar_estado_accesorios(accesorios_ids, "Disponible")

        actualizada = await AsignacionModel.registrar_devolucion(id)

        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            await log_action(
                user_id=user_id,
                accion="Registró devolución",
                modulo="Asignaciones",
                entidad_id=id,
                detalle=f"Equipo devuelto, {len(accesorios_ids)} accesorios liberados"
            )

        return serialize({"data": actualizada, "message": "Devolución registrada. Equipo y accesorios marcados como Disponibles."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print("Error inesperado en devolución:")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
