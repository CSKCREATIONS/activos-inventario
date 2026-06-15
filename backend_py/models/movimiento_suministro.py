import uuid
from datetime import datetime
from config.db import get_pool

async def registrar_movimiento(
    suministro_id: str,
    tipo: str,
    cantidad: int,
    usuario_sistema_id: str,
    motivo: str,
    usuario_solicitante_id: str = None,
    area_solicitante: str = None,
    comprobante: str = None,
    observaciones: str = None
) -> dict:
    if cantidad <= 0:
        raise ValueError("La cantidad debe ser positiva")
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Verificar stock
            await cur.execute("SELECT cantidad FROM suministros WHERE id = %s", (suministro_id,))
            row = await cur.fetchone()
            if not row:
                raise ValueError("Suministro no encontrado")
            stock_actual = row["cantidad"]
            
            if tipo == "salida" and stock_actual < cantidad:
                raise ValueError(f"Stock insuficiente. Disponible: {stock_actual}, solicitado: {cantidad}")
            
            nuevo_stock = stock_actual + cantidad if tipo == "entrada" else stock_actual - cantidad
            
            movimiento_id = str(uuid.uuid4())
            await cur.execute(
                """INSERT INTO movimientos_suministros
                   (id, suministro_id, tipo_movimiento, cantidad, usuario_sistema_id,
                    usuario_solicitante_id, area_solicitante, motivo, comprobante, observaciones)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (movimiento_id, suministro_id, tipo, cantidad, usuario_sistema_id,
                 usuario_solicitante_id, area_solicitante, motivo, comprobante, observaciones)
            )
            
            await cur.execute(
                "UPDATE suministros SET cantidad = %s WHERE id = %s",
                (nuevo_stock, suministro_id)
            )
    
    return {
        "id": movimiento_id,
        "suministro_id": suministro_id,
        "tipo": tipo,
        "cantidad": cantidad,
        "nuevo_stock": nuevo_stock,
        "fecha": datetime.now().isoformat()
    }

async def obtener_movimientos(suministro_id: str, limit: int = 100, offset: int = 0) -> list:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """SELECT m.*, u.username as usuario_nombre, u.nombre as usuario_sistema_nombre,
                          sol.nombre as solicitante_nombre
                   FROM movimientos_suministros m
                   LEFT JOIN usuarios_sistema u ON m.usuario_sistema_id = u.id
                   LEFT JOIN usuarios sol ON m.usuario_solicitante_id = sol.id
                   WHERE m.suministro_id = %s
                   ORDER BY m.fecha DESC
                   LIMIT %s OFFSET %s""",
                (suministro_id, limit, offset)
            )
            return await cur.fetchall()