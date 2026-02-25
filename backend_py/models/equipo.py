import uuid
from datetime import date
from config.db import get_pool


def _map_equipo(row: dict) -> dict:
    if row:
        row["es_rentado"] = bool(row.get("es_rentado"))
    return row


class EquipoModel:
    @staticmethod
    async def find_all(
        busqueda: str = "",
        estado: str = "",
        criticidad: str = "",
        tipo: str = "",
        es_rentado=None,
    ) -> list[dict]:
        pool = await get_pool()
        sql = "SELECT * FROM equipos WHERE 1=1"
        params = []

        if busqueda:
            sql += " AND (placa LIKE %s OR marca LIKE %s OR modelo LIKE %s OR serial LIKE %s)"
            q = f"%{busqueda}%"
            params.extend([q, q, q, q])
        if estado:
            sql += " AND estado = %s"
            params.append(estado)
        if criticidad:
            sql += " AND criticidad = %s"
            params.append(criticidad)
        if tipo:
            sql += " AND tipo_equipo = %s"
            params.append(tipo)
        if es_rentado is not None:
            sql += " AND es_rentado = %s"
            params.append(1 if es_rentado else 0)

        sql += " ORDER BY fecha_registro DESC"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                rows = await cur.fetchall()
                return [_map_equipo(r) for r in rows]

    @staticmethod
    async def find_by_id(id: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM equipos WHERE id = %s", [id])
                row = await cur.fetchone()
                return _map_equipo(row) if row else None

    @staticmethod
    async def find_by_placa(placa: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM equipos WHERE placa = %s", [placa])
                row = await cur.fetchone()
                return _map_equipo(row) if row else None

    @staticmethod
    async def create(data: dict) -> dict | None:
        new_id = str(uuid.uuid4())
        fecha_registro = date.today().isoformat()

        # Campos fijos obligatorios
        columns = ["id", "placa", "tipo_equipo", "criticidad", "confidencialidad",
                   "estado", "fecha_registro"]
        values = [
            new_id,
            data["placa"],
            data["tipo_equipo"],
            data["criticidad"],
            data["confidencialidad"],
            data.get("estado", "Disponible"),
            fecha_registro,
        ]

        # Campos opcionales: sólo se incluyen si vienen en data y no son None
        optional = [
            "serial", "marca", "modelo", "sistema_operativo", "version_so",
            "ram", "disco", "tecnologia", "fecha_compra", "proveedor",
            "costo", "observaciones",
        ]
        for key in optional:
            if data.get(key) is not None:
                columns.append(key)
                values.append(data[key])

        # es_rentado siempre incluido
        columns.append("es_rentado")
        values.append(1 if data.get("es_rentado") else 0)

        placeholders = ", ".join(["%s"] * len(values))
        col_str = ", ".join(columns)

        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"INSERT INTO equipos ({col_str}) VALUES ({placeholders})", values
                )
        return await EquipoModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = [
            "placa", "serial", "tipo_equipo", "marca", "modelo", "sistema_operativo",
            "version_so", "ram", "disco", "tecnologia", "criticidad", "confidencialidad",
            "estado", "fecha_compra", "proveedor", "costo", "es_rentado", "observaciones",
        ]
        fields, values = [], []
        for key in allowed:
            if key in data:
                val = 1 if (key == "es_rentado" and data[key]) else (0 if key == "es_rentado" else data[key])
                fields.append(f"{key} = %s")
                values.append(val)

        if not fields:
            return await EquipoModel.find_by_id(id)

        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"UPDATE equipos SET {', '.join(fields)} WHERE id = %s", values)
        return await EquipoModel.find_by_id(id)

    @staticmethod
    async def delete(id: str):
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM equipos WHERE id = %s", [id])

    @staticmethod
    async def get_historial(equipo_id: str) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT a.*, u.nombre AS usuario_nombre, u.cargo, u.area
                       FROM asignaciones a
                       JOIN usuarios u ON a.usuario_id = u.id
                       WHERE a.equipo_id = %s
                       ORDER BY a.fecha_asignacion DESC""",
                    [equipo_id],
                )
                return await cur.fetchall()

    @staticmethod
    async def get_responsable(equipo_id: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT u.*, a.id AS asignacion_id, a.fecha_asignacion
                       FROM asignaciones a
                       JOIN usuarios u ON a.usuario_id = u.id
                       WHERE a.equipo_id = %s AND a.estado = 'Activa'
                       LIMIT 1""",
                    [equipo_id],
                )
                return await cur.fetchone()
