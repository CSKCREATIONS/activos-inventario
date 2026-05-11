import os
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from models.asignacion import AsignacionModel
from models.documento import DocumentoModel
from routes.auth import get_current_user
from utils.acta_entrega_pdf import generar_acta_entrega_pdf
from utils.files import safe_filename
from utils.serializer import serialize

router = APIRouter()

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
ACCESORIOS_OPCIONES = ["Cargador", "Mouse", "Teclado", "Monitor"]


def _normalize_accesorios(val) -> list[str]:
    if not val:
        return []
    if isinstance(val, list):
        return [str(x).strip() for x in val if str(x).strip()]
    # fallback simple
    s = str(val).strip()
    if not s:
        return []
    return [p.strip() for p in s.split(",") if p.strip()]


async def _generar_y_registrar_acta(
    asignacion: dict,
    *,
    accesorios_entregados: list[str],
    cargado_por: str,
    rellenar: bool = True,
) -> tuple[bytes, str, str]:
    # Si no queremos rellenar la plantilla, devolvemos los bytes crudos de la plantilla (si existe)
    tpl_paths = [
        Path('Doc') / 'Julian Castro Sena Acta.pdf',
    ]
    pdf_bytes = None
    if not rellenar:
        for p in tpl_paths:
            if p.exists():
                pdf_bytes = p.read_bytes()
                break
    if pdf_bytes is None:
        pdf_bytes = generar_acta_entrega_pdf(
            dict(asignacion),
            accesorios_opciones=ACCESORIOS_OPCIONES,
            accesorios_entregados=accesorios_entregados,
            entregado_por=cargado_por,
        )

    # Guardar en disco (fallback)
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

    # Registrar/actualizar en documentos
    existing = await DocumentoModel.find_all(tipo="Acta", asignacion_id=asignacion["id"])
    if not existing:
        doc = await DocumentoModel.create({
            "nombre":      f"Acta entrega {placa}",
            "tipo":        "Acta",
            "equipo_id":   asignacion.get("equipo_id"),
            "asignacion_id": asignacion.get("id"),
            "usuario_id":  asignacion.get("usuario_id"),
            "url":         file_url,
            "fecha_carga": date.today().isoformat(),
            "cargado_por": cargado_por,
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
            "cargado_por": cargado_por,
            "version":    (existing[0].get("version") or 1) + 1,
        })
        if doc:
            await DocumentoModel.upsert_archivo(
                doc["id"],
                filename=filename,
                mime_type="application/pdf",
                contenido=pdf_bytes,
            )

    # Persistir URL en asignaciones (si aplica)
    try:
        await AsignacionModel.update(asignacion["id"], {"acta_pdf": file_url})
    except Exception:
        pass

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
    try:
        nueva = await AsignacionModel.create(body)

        cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
        accesorios = _normalize_accesorios(body.get("accesorios_entregados"))

        # Intentar generar acta automáticamente (guardar plantilla rellenada con datos)
        try:
            await _generar_y_registrar_acta(nueva, accesorios_entregados=accesorios, cargado_por=cargado_por, rellenar=True)
        except Exception:
            pass

        # Intentar enlazar Hoja de Vida (si existe) en la asignación
        try:
            hv = await DocumentoModel.find_all(tipo="Hoja de vida", equipo_id=nueva.get("equipo_id"))
            if hv:
                await AsignacionModel.update(nueva["id"], {"hoja_vida_pdf": hv[0].get("url")})
        except Exception:
            pass

        # Releer para devolver con URLs actualizadas
        nueva = await AsignacionModel.find_by_id(nueva["id"])
        return serialize({"data": nueva, "message": "Asignación creada exitosamente."})
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}/acta-pdf")
async def get_acta_pdf(id: str, force: bool = Query(False), current_user: dict = Depends(get_current_user)):
    """Genera (o regenera) el Acta de Entrega en PDF, la almacena y la devuelve como descarga."""
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")

    cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
    accesorios = _normalize_accesorios(asignacion.get("accesorios_entregados"))
    # Si ya existe un acta guardada para esta asignación y no pedimos regeneración, servir ese archivo
    acta_url = asignacion.get('acta_pdf')
    if not force and acta_url and acta_url.startswith('/uploads/'):
        filename = acta_url.split('/uploads/')[-1]
        filepath = os.path.join(UPLOADS_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                pdf_bytes = f.read()
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "X-Acta-From-Cache": "true",
                    "X-Acta-Length": str(len(pdf_bytes)),
                },
            )

    pdf_bytes, filename, _url = await _generar_y_registrar_acta(
        asignacion,
        accesorios_entregados=accesorios,
        cargado_por=cargado_por,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Acta-Generated": "true",
            "X-Acta-Length": str(len(pdf_bytes)),
        },
    )


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
