from config.db import get_pool

async def get_all_solicitantes(activo: bool = True) -> list[dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, nombre, tipo FROM solicitantes WHERE activo = %s ORDER BY nombre",
                (activo,)
            )
            return await cur.fetchall()