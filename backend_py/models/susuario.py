import uuid
from datetime import datetime
from config.db import get_pool

async def get_by_username(username: str) -> dict | None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT * FROM usuarios_sistema WHERE username = %s",
                (username,)
            )
            return await cur.fetchone()

async def create_usuario_sistema(data: dict) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """INSERT INTO usuarios_sistema
                   (id, username, password_hash, rol, nombre, email, usuario_id, activo)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    data["id"], data["username"], data["password_hash"],
                    data.get("rol", "gestor"), data.get("nombre"),
                    data.get("email"), data.get("usuario_id"),
                    data.get("activo", 1)
                )
            )

async def count_usuarios_sistema() -> int:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT COUNT(*) as total FROM usuarios_sistema")
            row = await cur.fetchone()
            return row["total"] if row else 0

async def update_ultimo_acceso(user_id: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE usuarios_sistema SET ultimo_acceso = NOW() WHERE id = %s",
                (user_id,)
            )