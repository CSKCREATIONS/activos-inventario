import uuid
from datetime import date
from config.db import get_pool


class UsuarioModel:
    @staticmethod
    async def find_all(busqueda: str = "", area: str = "") -> list[dict]:
        pool = await get_pool()
        sql = "SELECT * FROM usuarios WHERE 1=1"
        params = []

        if busqueda:
            sql += " AND (nombre LIKE %s OR correo LIKE %s OR area LIKE %s OR proceso LIKE %s)"
            q = f"%{busqueda}%"
            params.extend([q, q, q, q])
        if area:
            sql += " AND area = %s"
            params.append(area)

        sql += " ORDER BY nombre ASC"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                return await cur.fetchall()

    @staticmethod
    async def find_by_id(id: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM usuarios WHERE id = %s", [id])
                return await cur.fetchone()

    @staticmethod
    async def find_areas() -> list[str]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT DISTINCT area FROM usuarios ORDER BY area ASC")
                rows = await cur.fetchall()
                return [r["area"] for r in rows]

    @staticmethod
    async def create(data: dict) -> dict | None:
        new_id = str(uuid.uuid4())
        fecha_registro = date.today().isoformat()
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO usuarios
                       (id, nombre, cargo, proceso, grupo_asignado, area, correo, ubicacion, activo, fecha_registro)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    [
                        new_id,
                        data["nombre"],
                        data["cargo"],
                        data["proceso"],
                        data["grupo_asignado"],
                        data["area"],
                        data["correo"],
                        data.get("ubicacion"),
                        1 if data.get("activo", True) else 0,
                        fecha_registro,
                    ],
                )
        return await UsuarioModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = ["nombre", "cargo", "proceso", "grupo_asignado", "area", "correo", "ubicacion", "activo"]
        fields, values = [], []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                values.append(1 if (key == "activo" and data[key]) else (0 if key == "activo" else data[key]))

        if not fields:
            return await UsuarioModel.find_by_id(id)

        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"UPDATE usuarios SET {', '.join(fields)} WHERE id = %s", values)
        return await UsuarioModel.find_by_id(id)

    @staticmethod
    async def delete(id: str):
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM usuarios WHERE id = %s", [id])

    @staticmethod
    async def get_perfil(id: str) -> dict:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT a.*, e.placa, e.marca, e.modelo, e.tipo_equipo, e.estado AS equipo_estado
                       FROM asignaciones a
                       JOIN equipos e ON a.equipo_id = e.id
                       WHERE a.usuario_id = %s AND a.estado = 'Activa'""",
                    [id],
                )
                asignaciones_activas = await cur.fetchall()

                await cur.execute(
                    """SELECT a.*, e.placa, e.marca, e.modelo, e.tipo_equipo
                       FROM asignaciones a
                       JOIN equipos e ON a.equipo_id = e.id
                       WHERE a.usuario_id = %s
                       ORDER BY a.fecha_asignacion DESC""",
                    [id],
                )
                historial = await cur.fetchall()

                await cur.execute(
                    "SELECT * FROM documentos WHERE usuario_id = %s ORDER BY fecha_carga DESC", [id]
                )
                documentos = await cur.fetchall()

        return {
            "asignacionesActivas": asignaciones_activas,
            "historial": historial,
            "documentos": documentos,
        }
