import uuid
from datetime import date
from config.db import get_pool


class SuministroModel:
    @staticmethod
    async def find_all(
        busqueda: str = "",
        tipo: str = "",
        estado: str = "",
        equipo_id: str = "",
    ) -> list[dict]:
        pool = await get_pool()
        sql = """
            SELECT s.*,
                   e.placa AS equipo_placa
            FROM suministros s
            LEFT JOIN equipos e ON s.equipo_id = e.id
            WHERE 1=1
        """
        params = []
        if busqueda:
            sql += " AND (s.nombre LIKE %s OR s.referencia LIKE %s OR s.marca LIKE %s OR s.modelo LIKE %s OR s.proveedor LIKE %s)"
            q = f"%{busqueda}%"
            params.extend([q, q, q, q, q])
        if tipo:
            sql += " AND s.tipo = %s"
            params.append(tipo)
        if estado:
            sql += " AND s.estado = %s"
            params.append(estado)
        if equipo_id:
            sql += " AND s.equipo_id = %s"
            params.append(equipo_id)
        sql += " ORDER BY s.fecha_registro DESC"
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
                    """SELECT s.*, e.placa AS equipo_placa
                       FROM suministros s
                       LEFT JOIN equipos e ON s.equipo_id = e.id
                       WHERE s.id = %s""",
                    [id],
                )
                return await cur.fetchone()

    @staticmethod
    async def create(data: dict) -> dict | None:
        new_id = str(uuid.uuid4())
        fecha_registro = date.today().isoformat()
        pool = await get_pool()
        columns = ["id", "nombre", "tipo", "estado", "cantidad", "cantidad_minima", "fecha_registro"]
        values = [
            new_id,
            data["nombre"],
            data["tipo"],
            data.get("estado", "Disponible"),
            data.get("cantidad", 0),
            data.get("cantidad_minima", 1),
            fecha_registro,
        ]
        optional = ["referencia", "marca", "modelo", "proveedor",
                    "fecha_vencimiento", "costo", "equipo_id", "observaciones"]
        for key in optional:
            if data.get(key) is not None:
                columns.append(key)
                values.append(data[key])

        placeholders = ", ".join(["%s"] * len(values))
        col_str = ", ".join(columns)
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"INSERT INTO suministros ({col_str}) VALUES ({placeholders})", values
                )
        return await SuministroModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = ["nombre", "tipo", "referencia", "marca", "modelo", "proveedor",
                   "cantidad", "cantidad_minima", "estado", "fecha_vencimiento",
                   "costo", "equipo_id", "observaciones"]
        fields, values = [], []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                values.append(data[key])
        if not fields:
            return await SuministroModel.find_by_id(id)
        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"UPDATE suministros SET {', '.join(fields)} WHERE id = %s", values
                )
        return await SuministroModel.find_by_id(id)

    @staticmethod
    async def delete(id: str):
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM suministros WHERE id = %s", [id])
