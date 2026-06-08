import os
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from models.asignacion import AsignacionModel
from models.documento import DocumentoModel
from models.equipo import EquipoModel
from dependencies import get_current_user   # ✅ Correcto (ya existe en dependencies.py)from routes.equipos import _generar_y_registrar_hoja_vida, _requiere_hoja_vida
from utils.accesorios import normalizar_accesorios_entregados
from utils.acta_entrega_pdf import generar_acta_entrega_pdf
from utils.files import safe_filename
from utils.serializer import serialize

from config.db import get_pool


router = APIRouter()

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
ACCESORIOS_OPCIONES = ["Cargador", "Mouse", "Teclado", "Monitor"]


# ─── Helper: cambiar estado de equipos adicionales (accesorios) ─────────────
async def _cambiar_estado_accesorios(accesorios_ids: list[str], nuevo_estado: str):
    """Cambia el estado de una lista de equipos (accesorios) al valor dado."""
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
    """
    Genera o recupera el Acta de Entrega en PDF.
    Si regenerar es False y ya existe un acta en la BD, devuelve la existente.
    Si regenerar es True, fuerza la regeneración y actualiza versión.
    """
    # Verificar si ya existe un acta asociada
    existing_docs = await DocumentoModel.find_all(tipo="Acta", asignacion_id=asignacion["id"])
    if not regenerar and existing_docs:
        # Usar el primer documento existente
        doc = existing_docs[0]
        # Recuperar el contenido desde el BLOB o desde disco
        archivo = await DocumentoModel.get_archivo(doc["id"])
        if archivo and archivo.get("contenido"):
            pdf_bytes = archivo["contenido"]
            filename = safe_filename(archivo.get("filename") or "acta.pdf", default="acta.pdf")
            file_url = doc.get("url") or f"/uploads/{filename}"
            return pdf_bytes, filename, file_url
        # Fallback: si no hay BLOB, intentar desde disco
        if doc.get("url") and doc["url"].startswith("/uploads/"):
            file_path = os.path.join(UPLOADS_DIR, Path(doc["url"]).name)
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    pdf_bytes = f.read()
                filename = Path(file_path).name
                file_url = doc["url"]
                return pdf_bytes, filename, file_url

    # Si llegamos aquí, hay que regenerar el PDF
    # AHORA (siempre genera con datos)
    pdf_bytes = generar_acta_entrega_pdf(
    dict(asignacion),
    accesorios_opciones=ACCESORIOS_OPCIONES,
    accesorios_entregados=accesorios_entregados,
    entregado_por=cargado_por,
)

    # Guardar en disco
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

    # Registrar o actualizar documento
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
        # Actualizar versión solo si regeneramos
        nueva_version = (existing_docs[0].get("version") or 1) + 1
        doc = await DocumentoModel.update(existing_docs[0]["id"], {
            "url": file_url,
            "fecha_carga": date.today().isoformat(),
            "cargado_por": cargado_por,
            "version": nueva_version,
        })
        if doc:
            await DocumentoModel.upsert_archivo(doc["id"], filename=filename, mime_type="application/pdf", contenido=pdf_bytes)

    # Actualizar URL en asignaciones
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
        # Crear asignación (ya maneja transacción y bloqueo)
        nueva = await AsignacionModel.create(body)

        # Obtener IDs de los accesorios adicionales (equipos) para cambiar su estado
        accesorios_raw = body.get("accesorios_entregados", [])
        accesorios_ids = []
        for acc in accesorios_raw:
            if isinstance(acc, dict) and acc.get("id"):
                accesorios_ids.append(acc["id"])
            elif isinstance(acc, str):
                # Si es solo texto, no podemos cambiar estado; se ignora
                pass
        if accesorios_ids:
            await _cambiar_estado_accesorios(accesorios_ids, "Asignado")

        cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
        accesorios_textos = normalizar_accesorios_entregados(body.get("accesorios_entregados"))

        # Generar acta (si falla, se registra pero no se detiene la creación)
        acta_error = None
        try:
            await _generar_y_registrar_acta(nueva, accesorios_entregados=accesorios_textos, cargado_por=cargado_por, regenerar=False)
        except Exception as e:
            acta_error = str(e)
            # Registrar en log (aquí solo print, idealmente logging)
            print(f"[ERROR] Falló generación de acta para asignación {nueva['id']}: {acta_error}")

        # Generar hoja de vida si solicitado
        if body.get("generar_hoja_vida") is True:
            try:
                equipo = await EquipoModel.find_by_id(nueva.get("equipo_id"))
                if equipo and _requiere_hoja_vida(equipo, True):
                    await _generar_y_registrar_hoja_vida(equipo)
            except Exception as e:
                print(f"[ERROR] Falló generación de hoja de vida para equipo {nueva.get('equipo_id')}: {e}")

        # Enlazar hoja de vida existente si la hay
        try:
            hv = await DocumentoModel.find_all(tipo="Hoja de vida", equipo_id=nueva.get("equipo_id"))
            if hv:
                await AsignacionModel.update(nueva["id"], {"hoja_vida_pdf": hv[0].get("url")})
        except Exception as e:
            print(f"[ERROR] Falló enlace de hoja de vida: {e}")

        # Releer asignación actualizada
        nueva = await AsignacionModel.find_by_id(nueva["id"])

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
    """Devuelve el Acta de Entrega en PDF. Si force=false, devuelve la existente; si force=true, regenera."""
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


@router.post("/{id}/devolucion")
async def registrar_devolucion(id: str):
    try:
        # Primero obtener la asignación para saber qué accesorios tiene
        asignacion = await AsignacionModel.find_by_id(id)
        if not asignacion:
            raise HTTPException(status_code=404, detail="Asignación no encontrada.")

        # Extraer IDs de accesorios asignados (que son equipos cuyo estado cambiamos antes)
        accesorios_ids = []
        accesorios_raw = asignacion.get("accesorios_entregados", [])
        for acc in accesorios_raw:
            if isinstance(acc, dict) and acc.get("id"):
                accesorios_ids.append(acc["id"])
        if accesorios_ids:
            await _cambiar_estado_accesorios(accesorios_ids, "Disponible")

        # Registrar devolución (actualiza estado de asignación y equipo principal)
        actualizada = await AsignacionModel.registrar_devolucion(id)

        return serialize({"data": actualizada, "message": "Devolución registrada. Equipo y accesorios marcados como Disponibles."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}")
async def update(id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Actualiza una asignación existente (usuarios_ids, accesorios, observaciones, etc.)"""
    try:
        asignacion = await AsignacionModel.find_by_id(id)
        if not asignacion:
            raise HTTPException(status_code=404, detail="Asignación no encontrada.")

        # Actualizar en BD (sin regenerar acta automáticamente)
        actualizada = await AsignacionModel.update(id, body)
        return serialize({"data": actualizada, "message": "Asignación actualizada exitosamente."})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))