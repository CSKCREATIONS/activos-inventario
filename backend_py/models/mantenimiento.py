import uuid
from datetime import date
from config.db import get_pool

async def registrar_mantenimiento(equipo_id: str, datos: dict) -> dict:
    nuevo_id = str(uuid.uuid4())
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """INSERT INTO mantenimientos
                   (id, equipo_id, fecha, tipo, descripcion, realizado_por, costo, proximo_mantenimiento)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    nuevo_id, equipo_id,
                    datos["fecha"], datos["tipo"], datos.get("descripcion"),
                    datos.get("realizado_por"), datos.get("costo"), datos.get("proximo_mantenimiento")
                )
            )
            # Actualizar el campo ultimo_mantenimiento en equipos
            await cur.execute(
                "UPDATE equipos SET ultimo_mantenimiento = %s WHERE id = %s",
                (datos["fecha"], equipo_id)
            )
    return {
        "id": nuevo_id,
        "equipo_id": equipo_id,
        **datos
    }

async def listar_mantenimientos_por_equipo(equipo_id: str) -> list:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """SELECT * FROM mantenimientos
                   WHERE equipo_id = %s
                   ORDER BY fecha DESC""",
                (equipo_id,)
            )
            return await cur.fetchall()