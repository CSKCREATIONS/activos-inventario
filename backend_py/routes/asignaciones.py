import os
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from jose import jwt, JWTError

from dependencies import get_current_user, require_admin

from models.asignacion import AsignacionModel
from models.documento import DocumentoModel
from models.equipo import EquipoModel
from models.usuario import UsuarioModel
from dependencies import get_current_user
from routes.equipos import _generar_y_registrar_hoja_vida, _requiere_hoja_vida
from utils.accesorios import normalizar_accesorios_entregados
from utils.acta_entrega_pdf import generar_acta_entrega_pdf
from utils.files import safe_filename
from utils.serializer import serialize
from utils.audit import log_action
from utils.email_service import send_email, render_template
from config.db import get_pool

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET no configurado")
JWT_ALGORITHM = "HS256"

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
ACCESORIOS_OPCIONES = ["Cargador", "Mouse", "Teclado", "Monitor"]

# ========== HELPER: token para firma ==========
def generar_token_firma(asignacion_id: str, usuario_id: str) -> str:
    payload = {
        "sub": asignacion_id,
        "user_id": usuario_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=48)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ========== HELPER: cambiar estado de equipos (accesorios) ==========
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

# ========== FUNCIÓN PARA ENRIQUECER CON USUARIOS ==========
async def _enriquecer_con_usuarios(asignacion: dict) -> dict:
    from models.usuario import UsuarioModel
    from models.asignacion_usuario import AsignacionUsuarioModel

    usuarios_asignados = []

    # Usuario principal
    principal = await UsuarioModel.find_by_id(asignacion["usuario_id"])
    if principal:
        usuarios_asignados.append({
            "nombre": principal.get("nombre", ""),
            "cargo": principal.get("cargo", "")
        })

    # Usuarios adicionales desde la tabla puente
    adicionales = await AsignacionUsuarioModel.get_by_asignacion(asignacion["id"])
    for a in adicionales:
        user = await UsuarioModel.find_by_id(a["usuario_id"])
        if user:
            usuarios_asignados.append({
                "nombre": user.get("nombre", ""),
                "cargo": user.get("cargo", "")
            })

    asignacion["todos_usuarios_completos"] = usuarios_asignados
    return asignacion

# ========== FUNCIÓN PARA ENRIQUECER CON EQUIPOS ==========
async def _enriquecer_con_equipos(asignacion: dict) -> dict:
    from models.equipo import EquipoModel

    # Equipo principal
    equipo_principal = await EquipoModel.find_by_id(asignacion["equipo_id"])
    if equipo_principal:
        asignacion["placa"] = equipo_principal.get("placa", "")
        asignacion["marca"] = equipo_principal.get("marca", "")
        asignacion["modelo"] = equipo_principal.get("modelo", "")
        asignacion["tipo_equipo"] = equipo_principal.get("tipo_equipo", "")
        asignacion["serial"] = equipo_principal.get("serial", "")

    contadores = defaultdict(int)
    datos_por_tipo = {}

    accesorios = asignacion.get("accesorios_entregados", [])
    for acc in accesorios:
        if not isinstance(acc, dict):
            continue
        equipo_id = acc.get("id")
        if not equipo_id:
            continue
        equipo = await EquipoModel.find_by_id(equipo_id)
        if not equipo:
            continue
        tipo_raw = equipo.get("tipo_equipo", "").lower()
        if "monitor" in tipo_raw:
            tipo = "monitor"
        elif "teclado" in tipo_raw:
            tipo = "teclado"
        elif "mouse" in tipo_raw:
            tipo = "mouse"
        elif "impresora" in tipo_raw:
            tipo = "impresora"
        else:
            continue

        contadores[tipo] += 1
        if tipo not in datos_por_tipo:
            datos_por_tipo[tipo] = {
                "placa": equipo.get("placa", ""),
                "modelo": equipo.get("modelo", ""),
                "marca": equipo.get("marca", "")
            }

    for tipo, cantidad in contadores.items():
        asignacion[f"{tipo}_cantidad"] = str(cantidad)
        if tipo in datos_por_tipo:
            asignacion[f"{tipo}_placa"] = datos_por_tipo[tipo]["placa"]
            asignacion[f"{tipo}_modelo"] = datos_por_tipo[tipo]["modelo"]
            asignacion[f"{tipo}_marca"] = datos_por_tipo[tipo]["marca"]

    return asignacion

# ========== GENERAR / REGISTRAR ACTA ==========
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

    asignacion_enriquecida = await _enriquecer_con_usuarios(asignacion)
    asignacion_enriquecida = await _enriquecer_con_equipos(asignacion_enriquecida)

    pdf_bytes = generar_acta_entrega_pdf(
        asignacion_enriquecida,
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

# ================== ENDPOINTS ==================

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
    required = ["equipo_id", "fecha_asignacion"]
    tipo_destino = body.get("tipo_destino", "usuario")
    if tipo_destino not in ("usuario", "cliente", "proyecto"):
        raise HTTPException(status_code=400, detail="tipo_destino inválido. Debe ser 'usuario', 'cliente' o 'proyecto'.")

    if tipo_destino == "usuario" and not body.get("usuario_id"):
        raise HTTPException(status_code=400, detail="Para usuario se requiere usuario_id")
    if tipo_destino == "cliente" and not body.get("cliente_nombre"):
        raise HTTPException(status_code=400, detail="Para cliente se requiere cliente_nombre")
    if tipo_destino == "proyecto" and not body.get("proyecto_nombre"):
        raise HTTPException(status_code=400, detail="Para proyecto se requiere proyecto_nombre")

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

        # ========== ENVÍO DE CORREO PARA FIRMAR ACTA (si es a usuario) ==========
        if tipo_destino == "usuario":
            usuario = await UsuarioModel.find_by_id(nueva["usuario_id"])
            if usuario and usuario.get("correo"):
                equipo_placa = nueva.get("placa") or "equipo"
                token = generar_token_firma(nueva["id"], nueva["usuario_id"])
                url_firma = f"http://localhost:5173/firmar/{token}"
                html = render_template("firma_acta", {
                    "nombre_usuario": usuario["nombre"],
                    "equipo_placa": equipo_placa,
                    "url_firma": url_firma
                })
                await send_email(
                    to=usuario["correo"],
                    subject=f"Firma de acta - Equipo {equipo_placa}",
                    html=html
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

# ========== NUEVO ENDPOINT PARA FIRMAR CON TOKEN JWT ==========
@router.post("/firmar-con-token")
async def firmar_con_token(body: dict):
    token = body.get("token")
    firma_base64 = body.get("firma")
    if not token or not firma_base64:
        raise HTTPException(400, detail="Token y firma son requeridos")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        asignacion_id = payload.get("sub")
        usuario_id = payload.get("user_id")
    except JWTError:
        raise HTTPException(400, detail="Token inválido o expirado")

    if not asignacion_id or not usuario_id:
        raise HTTPException(400, detail="Token malformado")

    asignacion = await AsignacionModel.find_by_id(asignacion_id)
    if not asignacion:
        raise HTTPException(404, detail="Asignación no encontrada")

    # Opcional: verificar que el usuario coincida
    if asignacion["usuario_id"] != usuario_id:
        raise HTTPException(400, detail="Usuario no autorizado para firmar")

    # Obtener firmas existentes
    firmas = asignacion.get("firmas") or []
    if isinstance(firmas, str):
        firmas = json.loads(firmas)

    # Evitar firmas duplicadas del mismo usuario
    if any(f.get("user_id") == usuario_id for f in firmas):
        raise HTTPException(400, detail="Este usuario ya ha firmado")

    nueva_firma = {
        "user_id": usuario_id,
        "signature": firma_base64,
        "fecha": datetime.now().isoformat()
    }
    firmas.append(nueva_firma)
    await AsignacionModel.update(id, {
        "firmas": json.dumps(firmas)
    })

    # Volver a consultar la asignación
    asignacion_actualizada = await AsignacionModel.find_by_id(id)

    print("FIRMAS RECARGADAS:")
    print(asignacion_actualizada.get("firmas"))

    # Regenerar usando los datos actualizados
    cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"

    accesorios_textos = normalizar_accesorios_entregados(
        asignacion_actualizada.get("accesorios_entregados")
    )

    await _generar_y_registrar_acta(
        asignacion_actualizada,
        accesorios_entregados=accesorios_textos,
        cargado_por=cargado_por,
        regenerar=True
    )

@router.put("/{id}")
async def update(id: str, body: dict, current_user: dict = Depends(get_current_user)):
    try:
        asignacion = await AsignacionModel.find_by_id(id)
        if not asignacion:
            raise HTTPException(status_code=404, detail="Asignación no encontrada.")

        body["firmas"] = None
        body["firmado"] = 0
        actualizada = await AsignacionModel.update(id, body)

        cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
        accesorios = normalizar_accesorios_entregados(actualizada.get("accesorios_entregados"))
        await _generar_y_registrar_acta(
            actualizada,
            accesorios_entregados=accesorios,
            cargado_por=cargado_por,
            regenerar=True
        )

        actualizada = await AsignacionModel.find_by_id(id)
        user_id = current_user.get("sub") or current_user.get("id")
        await log_action(
            user_id=user_id,
            accion="Actualizó asignación",
            modulo="Asignaciones",
            entidad_id=id,
            detalle=f"Campos: {list(body.keys())}"
        )
        return serialize({"data": actualizada, "message": "Asignación actualizada y acta regenerada."})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/devolucion")
async def registrar_devolucion(
    id: str,
    current_user: dict = Depends(get_current_user),
    body: dict = None
):
    try:
        asignacion = await AsignacionModel.find_by_id(id)
        if not asignacion:
            raise HTTPException(status_code=404, detail="Asignación no encontrada.")
        if asignacion["estado"] != "Activa":
            raise HTTPException(status_code=400, detail="La asignación no está activa.")

        equipos_a_devolver = body.get("equipos_ids") if body else None

        if not equipos_a_devolver:
            actualizada = await AsignacionModel.registrar_devolucion(id)
            if not actualizada:
                raise HTTPException(status_code=404, detail="Asignación no encontrada después de la devolución.")
            user_id = current_user.get("sub") or current_user.get("id")
            if user_id:
                await log_action(
                    user_id=user_id,
                    accion="Devolución completa",
                    modulo="Asignaciones",
                    entidad_id=id,
                    detalle="Devolución total de la asignación"
                )
            return serialize({"data": actualizada, "message": "Devolución completa registrada."})

        equipo_principal_id = asignacion["equipo_id"]
        devolver_principal = equipo_principal_id in equipos_a_devolver
        devolver_accesorios_ids = [eid for eid in equipos_a_devolver if eid != equipo_principal_id]
        accesorios_actuales = asignacion.get("accesorios_entregados") or []

        await _cambiar_estado_accesorios(equipos_a_devolver, "Disponible")
        nuevos_accesorios = [acc for acc in accesorios_actuales if acc.get("id") not in devolver_accesorios_ids]

        update_data = {
            "accesorios_entregados": nuevos_accesorios,
            "firmas": None,
            "firmado": 0
        }
        if devolver_principal:
            update_data["equipo_id"] = None

        await AsignacionModel.update(id, update_data)
        actualizada = await AsignacionModel.find_by_id(id)
        if not actualizada:
            raise HTTPException(status_code=404, detail="Asignación no encontrada después de actualizar.")

        cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
        accesorios_textos = normalizar_accesorios_entregados(actualizada.get("accesorios_entregados"))
        await _generar_y_registrar_acta(
            actualizada,
            accesorios_entregados=accesorios_textos,
            cargado_por=cargado_por,
            regenerar=True
        )
        actualizada = await AsignacionModel.find_by_id(id)

        user_id = current_user.get("sub") or current_user.get("id")
        if user_id:
            await log_action(
                user_id=user_id,
                accion="Devolución selectiva",
                modulo="Asignaciones",
                entidad_id=id,
                detalle=f"Equipos devueltos: {', '.join(equipos_a_devolver)}"
            )
        return serialize({"data": actualizada, "message": "Devolución selectiva registrada. Las firmas han sido reiniciadas y el acta regenerada."})
    except Exception as e:
        print("Error inesperado en devolución:")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/agregar-accesorio")
async def agregar_accesorio(
    id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(404, "Asignación no encontrada")
    if asignacion["estado"] != "Activa":
        raise HTTPException(400, "La asignación no está activa")

    equipo_id = body.get("equipo_id")
    if not equipo_id:
        raise HTTPException(400, "equipo_id requerido")

    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT estado, placa, modelo, marca FROM equipos WHERE id = %s", (equipo_id,))
            equipo = await cur.fetchone()
            if not equipo:
                raise HTTPException(404, "Equipo no encontrado")
            if equipo["estado"] != "Disponible":
                raise HTTPException(400, "El equipo no está disponible")

    accesorios = asignacion.get("accesorios_entregados") or []
    nuevo_accesorio = {
        "id": equipo_id,
        "nombre": equipo["placa"],
        "placa": equipo["placa"],
        "modelo": equipo.get("modelo", ""),
        "marca": equipo.get("marca", ""),
        "tipo_equipo": None
    }
    accesorios.append(nuevo_accesorio)

    await AsignacionModel.update(id, {
        "accesorios_entregados": accesorios,
        "firmas": None,
        "firmado": 0
    })

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("UPDATE equipos SET estado = 'Asignado' WHERE id = %s", (equipo_id,))

    asignacion_actualizada = await AsignacionModel.find_by_id(id)
    cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
    accesorios_textos = normalizar_accesorios_entregados(asignacion_actualizada.get("accesorios_entregados"))
    await _generar_y_registrar_acta(
        asignacion_actualizada,
        accesorios_entregados=accesorios_textos,
        cargado_por=cargado_por,
        regenerar=True
    )

    return {"message": "Accesorio agregado correctamente. Las firmas han sido reiniciadas y el acta regenerada.", "data": asignacion_actualizada}
@router.post("/{id}/firmar")
async def firmar_asignacion(
    id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    from models.usuario import UsuarioModel
    import json
    from datetime import datetime

    usuario_id = body.get("usuario_id")
    firma_base64 = body.get("firma")

    if not usuario_id or not firma_base64:
        raise HTTPException(400, detail="usuario_id y firma son requeridos")

    print(f"[FIRMAR] Asignación ID: {id}")
    print(f"[FIRMAR] Usuario ID: {usuario_id}")

    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(404, detail="Asignación no encontrada")

    # Verificar que el usuario está asignado
    if asignacion["usuario_id"] != usuario_id and usuario_id not in (asignacion.get("usuarios_ids") or []):
        raise HTTPException(400, detail="Usuario no asignado a este equipo")

    # Obtener nombre del usuario (¡definir aquí la variable!)
    usuario = await UsuarioModel.find_by_id(usuario_id)
    nombre_usuario = usuario["nombre"] if usuario else "Usuario"
    
    print(f"[FIRMAR] Nombre usuario: {nombre_usuario}")

    # Guardar firma
    firmas = asignacion.get("firmas") or []
    if isinstance(firmas, str):
        firmas = json.loads(firmas)
    
    # Evitar duplicados
    if any(f.get("user_id") == usuario_id for f in firmas):
        raise HTTPException(400, detail="Este usuario ya ha firmado")
    
    nueva_firma = {
        "user_id": usuario_id,
        "nombre": nombre_usuario,
        "signature": firma_base64,
        "fecha": datetime.now().isoformat()
    }
    firmas.append(nueva_firma)
    
    await AsignacionModel.update(id, {"firmas": json.dumps(firmas)})
    
    print(f"[FIRMAR] Firmas totales después: {len(firmas)}")

    # Regenerar acta para que incluya la firma
    try:
        from utils.accesorios import normalizar_accesorios_entregados
        cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
        accesorios_textos = normalizar_accesorios_entregados(asignacion.get("accesorios_entregados"))
        await _generar_y_registrar_acta(
            asignacion,
            accesorios_entregados=accesorios_textos,
            cargado_por=cargado_por,
            regenerar=True
        )
    except Exception as e:
        print(f"Error regenerando acta: {e}")

    return {"message": "Firma registrada correctamente"}

@router.get("/{id}/token-firma")
async def obtener_token_firma(
    id: str,
    current_user: dict = Depends(require_admin)
):
    """Devuelve el token JWT para firmar (solo admin, útil para pruebas)"""
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(404, "Asignación no encontrada")
    token = generar_token_firma(asignacion["id"], asignacion["usuario_id"])
    return {"token": token}

@router.post("/{id}/reenviar-firma")
async def reenviar_firma(
    id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Reenvía el correo de firma a los usuarios responsables de la asignación.
    """
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(404, "Asignación no encontrada")
    if asignacion["estado"] != "Activa":
        raise HTTPException(400, "La asignación no está activa")

    from models.usuario import UsuarioModel

    # Obtener usuarios (principal + adicionales)
    usuario_principal = await UsuarioModel.find_by_id(asignacion["usuario_id"])
    if not usuario_principal or not usuario_principal.get("correo"):
        raise HTTPException(400, "El usuario principal no tiene correo")

    # Lista de destinatarios (evitar duplicados)
    destinatarios = [{"id": usuario_principal["id"], "nombre": usuario_principal["nombre"], "correo": usuario_principal["correo"]}]
    if asignacion.get("usuarios_ids"):
        for uid in asignacion["usuarios_ids"]:
            u = await UsuarioModel.find_by_id(uid)
            if u and u.get("correo") and not any(d["id"] == uid for d in destinatarios):
                destinatarios.append({"id": u["id"], "nombre": u["nombre"], "correo": u["correo"]})

    # Generar token y enviar correo a cada uno
    equipo_placa = asignacion.get("placa") or "equipo"
    for dest in destinatarios:
        token = generar_token_firma(asignacion["id"], dest["id"])
        url_firma = f"http://localhost:5173/firmar/{token}"
        html = render_template("firma_acta", {
            "nombre_usuario": dest["nombre"],
            "equipo_placa": equipo_placa,
            "url_firma": url_firma
        })
        await send_email(
            to=dest["correo"],
            subject=f"Firma de acta - Equipo {equipo_placa}",
            html=html
        )

    return {"message": f"Correo reenviado a {len(destinatarios)} usuario(s)"}


@router.post("/{id}/firmar-simple")
async def firmar_asignacion_simple(
    id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    from models.usuario import UsuarioModel
    import json
    from datetime import datetime
    
    usuario_id = body.get("usuario_id")
    firma_base64 = body.get("firma")
    
    print(f"[FIRMAR] Asignación ID: {id}")
    print(f"[FIRMAR] Usuario ID: {usuario_id}")
    print(f"[FIRMAR] Firma recibida (primeros 100 chars): {firma_base64[:100] if firma_base64 else 'None'}")
    
    # Validaciones
    if not usuario_id:
        raise HTTPException(400, detail="usuario_id es requerido")
    if not firma_base64:
        raise HTTPException(400, detail="firma es requerida")
    
    # Buscar asignación
    asignacion = await AsignacionModel.find_by_id(id)
    if not asignacion:
        raise HTTPException(404, detail="Asignación no encontrada")
    
    # Buscar usuario
    usuario = await UsuarioModel.find_by_id(usuario_id)
    if not usuario:
        raise HTTPException(404, detail="Usuario no encontrado")
    
    nombre_usuario = usuario.get("nombre", "Usuario")
    
    # Crear objeto de firma
    nueva_firma = {
        "user_id": usuario_id,
        "nombre": nombre_usuario,
        "signature": firma_base64,
        "fecha": datetime.now().isoformat()
    }
    
    # Obtener firmas existentes
    firmas_existentes = asignacion.get("firmas")
    firmas = []
    if firmas_existentes:
        try:
            if isinstance(firmas_existentes, str):
                firmas = json.loads(firmas_existentes)
            elif isinstance(firmas_existentes, bytes):
                firmas = json.loads(firmas_existentes.decode('utf-8'))
            else:
                firmas = firmas_existentes
        except Exception as e:
            print(f"[FIRMAR] Error parseando firmas existentes: {e}")
            firmas = []
    
    # Verificar si ya firmó
    for f in firmas:
        if f.get("user_id") == usuario_id:
            raise HTTPException(400, detail="Este usuario ya ha firmado")
    
    # Agregar firma
    firmas.append(nueva_firma)
    
    # Guardar como string JSON
    firmas_json = json.dumps(firmas, ensure_ascii=False)
    print(f"[FIRMAR] Guardando JSON: {firmas_json[:200]}")
    
    # Actualizar asignación
    await AsignacionModel.update(id, {"firmas": firmas_json})
    
    # Verificar que se guardó
    asignacion_verificar = await AsignacionModel.find_by_id(id)
    print(f"[FIRMAR] Verificación - Firmas guardadas: {asignacion_verificar.get('firmas')}")
    
    # ========== REGENERAR EL ACTA CON LA NUEVA FIRMA ==========
    try:
        from utils.accesorios import normalizar_accesorios_entregados
        from routes.asignaciones import _generar_y_registrar_acta
        
        # Obtener la asignación actualizada (ya tiene la firma)
        asignacion_actualizada = await AsignacionModel.find_by_id(id)
        
        cargado_por = current_user.get("nombre") or current_user.get("username") or "Sistema"
        accesorios_textos = normalizar_accesorios_entregados(asignacion_actualizada.get("accesorios_entregados"))
        
        await _generar_y_registrar_acta(
            asignacion_actualizada,
            accesorios_entregados=accesorios_textos,
            cargado_por=cargado_por,
            regenerar=True
        )
        print("[FIRMAR] Acta regenerada con la firma incluida")
    except Exception as e:
        print(f"[FIRMAR] Error regenerando acta: {e}")
        # No lanzamos excepción para que la firma quede guardada aunque falle la regeneración
    
    return {
        "message": "Firma registrada correctamente",
        "firmante": nombre_usuario,
        "total_firmas": len(firmas)
    }