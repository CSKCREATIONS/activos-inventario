import aiomysql
from config.db import get_pool


async def create_usuario_sistema(data: dict):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """CREATE TABLE IF NOT EXISTS usuarios_sistema (
                    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
                    username     VARCHAR(100) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    rol          ENUM('admin','gestor') NOT NULL DEFAULT 'gestor',
                    nombre       VARCHAR(150),
                    email        VARCHAR(150),
                    usuario_id   VARCHAR(36),
                    activo       TINYINT(1) NOT NULL DEFAULT 1,
                    ultimo_acceso TIMESTAMP NULL,
                    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"""
            )
            await cur.execute(
                """INSERT INTO usuarios_sistema (id, username, password_hash, rol, nombre, email, usuario_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                [
                    data["id"],
                    data["username"],
                    data["password_hash"],
                    data.get("rol", "gestor"),
                    data.get("nombre"),
                    data.get("email"),
                    data.get("usuario_id"),
                ],
            )


async def get_by_username(username: str) -> dict | None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                """SELECT id, username, password_hash, rol, nombre, email, activo
                   FROM usuarios_sistema
                   WHERE username = %s
                   LIMIT 1""",
                [username],
            )
            row = await cur.fetchone()
            if row is None:
                return None
            # Asegura que los campos de texto sean str, no bytes
            return {
                k: (v.decode("utf-8") if isinstance(v, (bytes, bytearray)) else v)
                for k, v in row.items()
            }


async def update_ultimo_acceso(user_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE usuarios_sistema SET ultimo_acceso = NOW() WHERE id = %s",
                [user_id],
            )


async def count_usuarios_sistema() -> int:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT COUNT(*) FROM usuarios_sistema")
            row = await cur.fetchone()
            return row[0] if row else 0
