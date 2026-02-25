import uuid
from datetime import date
from config.db import get_pool


class DocumentoModel:
    @staticmethod
    async def find_all(
        busqueda: str = "",
        tipo: str = "",
        equipo_id: str = "",
        usuario_id: str = "",
    ) -> list[dict]:
        pool = await get_pool()
        sql = """
            SELECT d.*,
                   e.placa AS equipo_placa,
                   u.nombre AS usuario_nombre
            FROM documentos d
            LEFT JOIN equipos  e ON d.equipo_id  = e.id
            LEFT JOIN usuarios u ON d.usuario_id = u.id
            WHERE 1=1
        """
        params = []

        if busqueda:
            sql += " AND (d.nombre LIKE %s OR d.tipo LIKE %s)"
            q = f"%{busqueda}%"
            params.extend([q, q])
        if tipo:
            sql += " AND d.tipo = %s"
            params.append(tipo)
        if equipo_id:
            sql += " AND d.equipo_id = %s"
            params.append(equipo_id)
        if usuario_id:
            sql += " AND d.usuario_id = %s"
            params.append(usuario_id)

        sql += " ORDER BY d.fecha_carga DESC"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                return await cur.fetchall()

    @staticmethod
    async def find_by_id(id: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT d.*, e.placa AS equipo_placa, u.nombre AS usuario_nombre
                       FROM documentos d
                       LEFT JOIN equipos  e ON d.equipo_id  = e.id
                       LEFT JOIN usuarios u ON d.usuario_id = u.id
                       WHERE d.id = %s""",
                    [id],
                )
                return await cur.fetchone()

    @staticmethod
    async def create(data: dict) -> dict | None:
        new_id = str(uuid.uuid4())
        fecha_carga = date.today().isoformat()
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO documentos
                       (id, nombre, tipo, equipo_id, asignacion_id, usuario_id, url, version, fecha_carga, cargado_por)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    [
                        new_id,
                        data["nombre"],
                        data["tipo"],
                        data.get("equipo_id"),
                        data.get("asignacion_id"),
                        data.get("usuario_id"),
                        data["url"],
                        data.get("version", 1),
                        fecha_carga,
                        data.get("cargado_por"),
                    ],
                )
        return await DocumentoModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = ["nombre", "tipo", "equipo_id", "asignacion_id", "usuario_id", "url", "version", "cargado_por"]
        fields, values = [], []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                values.append(data[key])

        if not fields:
            return await DocumentoModel.find_by_id(id)

        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"UPDATE documentos SET {', '.join(fields)} WHERE id = %s", values
                )
        return await DocumentoModel.find_by_id(id)

    @staticmethod
    async def delete(id: str):
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM documentos WHERE id = %s", [id])
