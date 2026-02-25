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
