from fastapi import APIRouter, Depends, HTTPException, Query, Response
from datetime import datetime
import uuid
import os
import csv
from io import StringIO
from config.db import get_pool
from dependencies import get_current_user, require_admin
from utils.audit import log_action
from utils.serializer import serialize
from models.suministro import SuministroModel
from utils.email_service import send_email, render_template

router = APIRouter()

# ──────────────────────────────────────────────────────────────────────────────
# FUNCIONES AUXILIARES
# ──────────────────────────────────────────────────────────────────────────────

async def registrar_movimiento(
    suministro_id: str,
    tipo: str,
    cantidad: int,
    usuario_sistema_id: str,
    motivo: str,
    solicitante_id: str = None,
    area_solicitante: str = None,
    comprobante: str = None,
    observaciones: str = None
) -> dict:
    if cantidad <= 0:
        raise ValueError("La cantidad debe ser positiva")
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Obtener stock actual, cantidad mínima y nombre
            await cur.execute(
                "SELECT cantidad, cantidad_minima, nombre FROM suministros WHERE id = %s",
                (suministro_id,)
            )
            row = await cur.fetchone()
            if not row:
                raise ValueError("Suministro no encontrado")
            stock_actual = row["cantidad"]
            cantidad_minima = row["cantidad_minima"]
            nombre_suministro = row["nombre"]
            
            if tipo == "salida" and stock_actual < cantidad:
                raise ValueError(f"Stock insuficiente. Disponible: {stock_actual}, solicitado: {cantidad}")
            
            nuevo_stock = stock_actual + cantidad if tipo == "entrada" else stock_actual - cantidad
            
            movimiento_id = str(uuid.uuid4())
            await cur.execute(
                """INSERT INTO movimientos_suministros
                   (id, suministro_id, tipo_movimiento, cantidad, usuario_sistema_id,
                    solicitante_id, area_solicitante, motivo, comprobante, observaciones, fecha)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
                (movimiento_id, suministro_id, tipo, cantidad, usuario_sistema_id,
                 solicitante_id, area_solicitante, motivo, comprobante, observaciones)
            )
            
            await cur.execute(
                "UPDATE suministros SET cantidad = %s WHERE id = %s",
                (nuevo_stock, suministro_id)
            )
    
    # ⚠️ ALERTA DE STOCK BAJO (asíncrona, no bloquea)
    if nuevo_stock <= cantidad_minima:
        import asyncio
        html = render_template("stock_bajo", {
            "nombre": nombre_suministro,
            "stock_actual": nuevo_stock,
            "stock_minimo": cantidad_minima
        })
        asyncio.create_task(send_email(
            to=os.getenv("RESEND_ALERT_EMAIL", "admin@localhost"),
            subject=f"⚠️ Stock bajo: {nombre_suministro}",
            html=html
        ))
    
    return {
        "id": movimiento_id,
        "suministro_id": suministro_id,
        "tipo": tipo,
        "cantidad": cantidad,
        "nuevo_stock": nuevo_stock,
        "fecha": datetime.now().isoformat()
    }


async def obtener_movimientos(
    suministro_id: str,
    limit: int = 100,
    offset: int = 0,
    fecha_desde: str = None,
    fecha_hasta: str = None
) -> list:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            sql = """
                SELECT 
                    m.id,
                    m.suministro_id,
                    m.tipo_movimiento,
                    m.cantidad,
                    DATE_FORMAT(m.fecha, '%%Y-%%m-%%dT%%H:%%i:%%s') as fecha,
                    u.username as usuario_nombre,
                    u.nombre as usuario_sistema_nombre,
                    s.nombre as solicitante_nombre,
                    m.area_solicitante,
                    m.motivo,
                    m.comprobante,
                    m.observaciones
                FROM movimientos_suministros m
                LEFT JOIN usuarios_sistema u ON m.usuario_sistema_id = u.id
                LEFT JOIN solicitantes s ON m.solicitante_id = s.id
                WHERE m.suministro_id = %s
            """
            params = [suministro_id]
            if fecha_desde:
                sql += " AND DATE(m.fecha) >= %s"
                params.append(fecha_desde)
            if fecha_hasta:
                sql += " AND DATE(m.fecha) <= %s"
                params.append(fecha_hasta)
            sql += " ORDER BY m.fecha DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            await cur.execute(sql, params)
            rows = await cur.fetchall()
            for row in rows:
                for key, value in row.items():
                    if isinstance(value, datetime):
                        row[key] = value.isoformat()
            return rows


async def obtener_saldo_parcial(suministro_id: str) -> int:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """SELECT SUM(CASE WHEN tipo_movimiento='entrada' THEN cantidad ELSE -cantidad END) as saldo
                   FROM movimientos_suministros
                   WHERE suministro_id = %s""",
                (suministro_id,)
            )
            row = await cur.fetchone()
            return row["saldo"] if row["saldo"] else 0

# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/{suministro_id}/movimientos", status_code=201)
async def crear_movimiento(
    suministro_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    tipo = body.get("tipo")
    cantidad = body.get("cantidad")
    motivo = body.get("motivo")
    solicitante_id = body.get("solicitante_id")
    area = body.get("area")
    comprobante = body.get("comprobante")
    observaciones = body.get("observaciones")

    if tipo not in ("entrada", "salida"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'entrada' o 'salida'")
    if not cantidad or cantidad <= 0:
        raise HTTPException(status_code=400, detail="cantidad debe ser un número positivo")
    if not motivo:
        raise HTTPException(status_code=400, detail="motivo es requerido")

    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="No se pudo identificar el usuario autenticado")

    if solicitante_id == "":
        solicitante_id = None
    if area == "":
        area = None
    if comprobante == "":
        comprobante = None
    if observaciones == "":
        observaciones = None

    try:
        movimiento = await registrar_movimiento(
            suministro_id=suministro_id,
            tipo=tipo,
            cantidad=cantidad,
            usuario_sistema_id=user_id,
            motivo=motivo,
            solicitante_id=solicitante_id,
            area_solicitante=area,
            comprobante=comprobante,
            observaciones=observaciones
        )
        await log_action(
            user_id=user_id,
            accion=f"Registró {tipo} de suministro",
            modulo="Suministros",
            entidad_id=suministro_id,
            detalle=f"Movimiento: {tipo} de {cantidad} unidades, motivo: {motivo}"
        )
        return serialize({"data": movimiento, "message": "Movimiento registrado exitosamente"})
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{suministro_id}/movimientos")
async def listar_movimientos(
    suministro_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    fecha_desde: str = Query(None),
    fecha_hasta: str = Query(None),
    current_user: dict = Depends(get_current_user)
):
    suministro = await SuministroModel.find_by_id(suministro_id)
    if not suministro:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    movimientos = await obtener_movimientos(suministro_id, limit, offset, fecha_desde, fecha_hasta)
    saldo_actual = await obtener_saldo_parcial(suministro_id)
    saldo = saldo_actual
    movimientos_invertidos = list(reversed(movimientos))
    for m in movimientos_invertidos:
        if m["tipo_movimiento"] == "entrada":
            saldo -= m["cantidad"]
        else:
            saldo += m["cantidad"]
        m["saldo_parcial"] = saldo
    for m in movimientos:
        m["saldo_parcial"] = next((x["saldo_parcial"] for x in movimientos_invertidos if x["id"] == m["id"]), 0)
    return serialize({"data": movimientos, "total": len(movimientos)})


@router.get("/{suministro_id}/kardex")
async def obtener_kardex(
    suministro_id: str,
    current_user: dict = Depends(get_current_user)
):
    suministro = await SuministroModel.find_by_id(suministro_id)
    if not suministro:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    movimientos = await obtener_movimientos(suministro_id, limit=10000, offset=0)
    saldo = 0
    for m in movimientos:
        if m["tipo_movimiento"] == "entrada":
            saldo += m["cantidad"]
        else:
            saldo -= m["cantidad"]
        m["saldo_parcial"] = saldo
    return serialize({
        "data": {
            "suministro": suministro,
            "stock_actual": suministro["cantidad"],
            "movimientos": movimientos
        }
    })


@router.put("/movimientos/{movimiento_id}", dependencies=[Depends(require_admin)])
async def editar_movimiento(
    movimiento_id: str,
    body: dict,
    current_admin: dict = Depends(require_admin)
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT * FROM movimientos_suministros WHERE id = %s", (movimiento_id,))
            old = await cur.fetchone()
            if not old:
                raise HTTPException(status_code=404, detail="Movimiento no encontrado")
            nuevo_tipo = body.get("tipo", old["tipo_movimiento"])
            nueva_cantidad = body.get("cantidad", old["cantidad"])
            if nueva_cantidad <= 0:
                raise HTTPException(status_code=400, detail="La cantidad debe ser positiva")
            motivo = body.get("motivo", old["motivo"])
            solicitante_id = body.get("solicitante_id", old["solicitante_id"])
            area = body.get("area_solicitante", old["area_solicitante"])
            comprobante = body.get("comprobante", old["comprobante"])
            observaciones = body.get("observaciones", old["observaciones"])

            old_effect = old["cantidad"] if old["tipo_movimiento"] == "entrada" else -old["cantidad"]
            new_effect = nueva_cantidad if nuevo_tipo == "entrada" else -nueva_cantidad
            delta = new_effect - old_effect

            await cur.execute(
                "UPDATE suministros SET cantidad = cantidad + %s WHERE id = %s",
                (delta, old["suministro_id"])
            )
            await cur.execute(
                """UPDATE movimientos_suministros SET
                    tipo_movimiento=%s, cantidad=%s, motivo=%s, solicitante_id=%s,
                    area_solicitante=%s, comprobante=%s, observaciones=%s
                   WHERE id=%s""",
                (nuevo_tipo, nueva_cantidad, motivo, solicitante_id, area, comprobante, observaciones, movimiento_id)
            )
            await log_action(
                user_id=current_admin["id"],
                accion="Editó movimiento de suministro",
                modulo="Suministros",
                entidad_id=old["suministro_id"],
                detalle=f"Movimiento {movimiento_id}: tipo {old['tipo_movimiento']}->{nuevo_tipo}, cantidad {old['cantidad']}->{nueva_cantidad}"
            )
            return {"message": "Movimiento actualizado"}


@router.delete("/movimientos/{movimiento_id}", dependencies=[Depends(require_admin)])
async def eliminar_movimiento(
    movimiento_id: str,
    current_admin: dict = Depends(require_admin)
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT * FROM movimientos_suministros WHERE id = %s", (movimiento_id,))
            mov = await cur.fetchone()
            if not mov:
                raise HTTPException(status_code=404, detail="Movimiento no encontrado")
            efecto = mov["cantidad"] if mov["tipo_movimiento"] == "entrada" else -mov["cantidad"]
            await cur.execute(
                "UPDATE suministros SET cantidad = cantidad - %s WHERE id = %s",
                (efecto, mov["suministro_id"])
            )
            await cur.execute("DELETE FROM movimientos_suministros WHERE id = %s", (movimiento_id,))
            await log_action(
                user_id=current_admin["id"],
                accion="Eliminó movimiento de suministro",
                modulo="Suministros",
                entidad_id=mov["suministro_id"],
                detalle=f"Movimiento {movimiento_id} eliminado"
            )
            return {"message": "Movimiento eliminado"}


@router.get("/export/csv")
async def exportar_movimientos_csv(
    suministro_id: str = Query(...),
    fecha_desde: str = Query(None),
    fecha_hasta: str = Query(None),
    current_user: dict = Depends(get_current_user)
):
    suministro = await SuministroModel.find_by_id(suministro_id)
    if not suministro:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    movimientos = await obtener_movimientos(suministro_id, limit=10000, offset=0, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
    output = StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Fecha", "Tipo", "Cantidad", "Usuario", "Solicitante/Área", "Motivo", "Comprobante", "Observaciones"])
    for m in movimientos:
        writer.writerow([
            m["fecha"],
            "Entrada" if m["tipo_movimiento"] == "entrada" else "Salida",
            m["cantidad"],
            m["usuario_sistema_nombre"] or "",
            m["solicitante_nombre"] or m["area_solicitante"] or "",
            m["motivo"] or "",
            m["comprobante"] or "",
            m["observaciones"] or ""
        ])
    csv_content = output.getvalue()
    return Response(
        content=csv_content.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=movimientos_{suministro_id}.csv"}
    )