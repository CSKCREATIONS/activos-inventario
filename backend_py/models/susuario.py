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

async def get_all_usuarios_sistema() -> list[dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id, username, rol, nombre, email, activo, ultimo_acceso, created_at FROM usuarios_sistema ORDER BY username")
            return await cur.fetchall()

async def get_usuario_sistema_by_id(user_id: str) -> dict | None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id, username, rol, nombre, email, activo, ultimo_acceso FROM usuarios_sistema WHERE id = %s", (user_id,))
            return await cur.fetchone()

async def update_usuario_sistema(user_id: str, data: dict) -> bool:
    allowed = ["nombre", "email", "rol", "activo"]
    updates = []
    values = []
    for key in allowed:
        if key in data:
            updates.append(f"{key} = %s")
            values.append(data[key])
    if not updates:
        return False
    values.append(user_id)
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(f"UPDATE usuarios_sistema SET {', '.join(updates)} WHERE id = %s", values)
            return True

async def delete_usuario_sistema(user_id: str) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Verificar que no sea el único admin
            await cur.execute("SELECT COUNT(*) as total FROM usuarios_sistema WHERE rol = 'admin' AND activo = 1")
            row = await cur.fetchone()
            total_admins = row["total"] if row else 0
            if total_admins <= 1:
                # Obtener el rol del usuario a eliminar
                await cur.execute("SELECT rol FROM usuarios_sistema WHERE id = %s", (user_id,))
                user = await cur.fetchone()
                if user and user["rol"] == "admin":
                    return False  # No se puede eliminar el último admin
            await cur.execute("DELETE FROM usuarios_sistema WHERE id = %s", (user_id,))
            return True