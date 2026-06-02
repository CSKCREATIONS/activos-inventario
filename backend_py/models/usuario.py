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
                try:
                    await cur.execute(
                        """INSERT INTO usuarios
                           (id, nombre, cargo, proceso, grupo_asignado, area, correo, ubicacion, sede, activo, fecha_registro)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        [
                            new_id,
                            data.get("nombre"),
                            data.get("cargo"),
                            data.get("proceso"),
                            data.get("grupo_asignado"),
                            data.get("area"),
                            data.get("correo"),
                            data.get("ubicacion"),
                            data.get("sede"),
                            1 if data.get("activo", True) else 0,
                            fecha_registro,
                        ],
                    )
                except Exception as e:
                    # Compatibilidad: si la columna 'sede' no existe, insertar sin ella
                    if "Unknown column" in str(e) and "sede" in str(e):
                        await cur.execute(
                            """INSERT INTO usuarios
                               (id, nombre, cargo, proceso, grupo_asignado, area, correo, ubicacion, activo, fecha_registro)
                               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                            [
                                new_id,
                                data.get("nombre"),
                                data.get("cargo"),
                                data.get("proceso"),
                                data.get("grupo_asignado"),
                                data.get("area"),
                                data.get("correo"),
                                data.get("ubicacion"),
                                1 if data.get("activo", True) else 0,
                                fecha_registro,
                            ],
                        )
                    else:
                        raise
        return await UsuarioModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = ["nombre", "cargo", "proceso", "grupo_asignado", "area", "correo", "ubicacion", "sede", "activo"]
        fields, values = [], []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                if key == "activo":
                    values.append(1 if data[key] else 0)
                else:
                    values.append(data[key])

        if not fields:
            return await UsuarioModel.find_by_id(id)

        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                try:
                    await cur.execute(f"UPDATE usuarios SET {', '.join(fields)} WHERE id = %s", values)
                except Exception as e:
                    err_str = str(e)
                    if "Unknown column" in err_str:
                        # Si la columna sede falta, reintentar sin ella
                        missing_cols = []
                        if "sede" in err_str:
                            missing_cols.append("sede")

                        if not missing_cols:
                            missing_cols = [c for c in ("sede",) if c in data]

                        new_fields = []
                        new_values = []
                        for key in allowed:
                            if key in data and key not in missing_cols:
                                new_fields.append(f"{key} = %s")
                                if key == "activo":
                                    new_values.append(1 if data[key] else 0)
                                else:
                                    new_values.append(data[key])

                        if not new_fields:
                            return await UsuarioModel.find_by_id(id)

                        new_values.append(id)
                        await cur.execute(f"UPDATE usuarios SET {', '.join(new_fields)} WHERE id = %s", new_values)
                    else:
                        raise
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
