import uuid
from datetime import date
from config.db import get_pool


class AccesorioModel:
    @staticmethod
    async def find_all(busqueda: str = "", estado: str = "") -> list[dict]:
        pool = await get_pool()
        sql = """
            SELECT ac.*, e.placa AS equipo_placa, e.marca AS equipo_marca, e.modelo AS equipo_modelo
            FROM accesorios ac
            LEFT JOIN equipos e ON ac.equipo_principal_id = e.id
            WHERE 1=1
        """
        params = []

        if busqueda:
            sql += " AND (ac.nombre LIKE %s OR ac.placa LIKE %s OR ac.serial LIKE %s)"
            q = f"%{busqueda}%"
            params.extend([q, q, q])
        if estado:
            sql += " AND ac.estado = %s"
            params.append(estado)

        sql += " ORDER BY ac.nombre ASC"
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
                    """SELECT ac.*, e.placa AS equipo_placa, e.marca AS equipo_marca, e.modelo AS equipo_modelo
                       FROM accesorios ac
                       LEFT JOIN equipos e ON ac.equipo_principal_id = e.id
                       WHERE ac.id = %s""",
                    [id],
                )
                return await cur.fetchone()

    @staticmethod
    async def create(data: dict) -> dict | None:
        new_id = str(uuid.uuid4())
        fecha_registro = date.today().isoformat()
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO accesorios
                       (id, nombre, placa, serial, equipo_principal_id, cantidad, estado, observaciones, fecha_registro)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    [
                        new_id,
                        data["nombre"],
                        data.get("placa"),
                        data.get("serial"),
                        data.get("equipo_principal_id"),
                        data.get("cantidad", 1),
                        data.get("estado", "Disponible"),
                        data.get("observaciones"),
                        fecha_registro,
                    ],
                )
        return await AccesorioModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = ["nombre", "placa", "serial", "equipo_principal_id", "cantidad", "estado", "observaciones"]
        fields, values = [], []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                values.append(data[key])

        if not fields:
            return await AccesorioModel.find_by_id(id)

        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"UPDATE accesorios SET {', '.join(fields)} WHERE id = %s", values
                )
        return await AccesorioModel.find_by_id(id)

    @staticmethod
    async def delete(id: str):
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM accesorios WHERE id = %s", [id])
