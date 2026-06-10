import uuid
from datetime import date
from config.db import get_pool

class AsignacionUsuarioModel:
    @staticmethod
    async def create(asignacion_id: str, usuario_id: str, rol: str = "secundario") -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO asignacion_usuarios 
                       (id, asignacion_id, usuario_id, rol_en_asignacion, fecha_registro)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (str(uuid.uuid4()), asignacion_id, usuario_id, rol, date.today().isoformat())
                )

    @staticmethod
    async def get_by_asignacion(asignacion_id: str) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT usuario_id, rol_en_asignacion 
                       FROM asignacion_usuarios 
                       WHERE asignacion_id = %s
                       ORDER BY rol_en_asignacion = 'principal' DESC""",
                    (asignacion_id,)
                )
                return await cur.fetchall()

    @staticmethod
    async def delete_by_asignacion(asignacion_id: str) -> None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM asignacion_usuarios WHERE asignacion_id = %s", (asignacion_id,))