import uuid
from datetime import date
from config.db import get_pool


class LicenciaModel:
    @staticmethod
    async def find_all(busqueda: str = "") -> list[dict]:
        pool = await get_pool()
        sql = """
            SELECT
                l.*,
                COUNT(la.id)                                      AS cantidad_asignada,
                l.cantidad_total - COUNT(la.id)                   AS cantidad_disponible
            FROM licencias l
            LEFT JOIN licencias_asignadas la
                ON la.licencia_id = l.id AND la.estado = 'Activa'
            WHERE 1=1
        """
        params = []
        if busqueda:
            sql += " AND (l.nombre LIKE %s OR l.marca LIKE %s OR l.modelo LIKE %s)"
            q = f"%{busqueda}%"
            params.extend([q, q, q])
        sql += " GROUP BY l.id ORDER BY l.nombre ASC"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                rows = await cur.fetchall()
                return [_add_estado(r) for r in rows]

    @staticmethod
    async def find_by_id(id: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT
                        l.*,
                        COUNT(la.id)                               AS cantidad_asignada,
                        l.cantidad_total - COUNT(la.id)            AS cantidad_disponible
                    FROM licencias l
                    LEFT JOIN licencias_asignadas la
                        ON la.licencia_id = l.id AND la.estado = 'Activa'
                    WHERE l.id = %s
                    GROUP BY l.id
                    """,
                    [id],
                )
                row = await cur.fetchone()
                return _add_estado(row) if row else None

    @staticmethod
    async def create(data: dict) -> dict | None:
        new_id = str(uuid.uuid4())
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO licencias
                       (id, nombre, marca, modelo, cantidad_total, cantidad_minima,
                        observaciones, fecha_registro)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    [
                        new_id,
                        data["nombre"],
                        data.get("marca"),
                        data.get("modelo"),
                        data.get("cantidad_total", 1),
                        data.get("cantidad_minima", 1),
                        data.get("observaciones"),
                        date.today().isoformat(),
                    ],
                )
        return await LicenciaModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = ["nombre", "marca", "modelo", "cantidad_total", "cantidad_minima", "observaciones"]
        fields, values = [], []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                values.append(data[key])
        if not fields:
            return await LicenciaModel.find_by_id(id)
        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"UPDATE licencias SET {', '.join(fields)} WHERE id = %s", values
                )
        return await LicenciaModel.find_by_id(id)

    @staticmethod
    async def delete(id: str):
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM licencias WHERE id = %s", [id])


# ── Asignaciones ──────────────────────────────────────────────────────────────

class LicenciaAsignadaModel:
    @staticmethod
    async def find_by_licencia(licencia_id: str) -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT la.*, e.placa AS equipo_placa, e.nombre_equipo AS equipo_nombre
                    FROM licencias_asignadas la
                    LEFT JOIN equipos e ON la.equipo_id = e.id
                    WHERE la.licencia_id = %s
                    ORDER BY la.fecha_asignacion DESC
                    """,
                    [licencia_id],
                )
                return await cur.fetchall()

    @staticmethod
    async def find_by_id(id: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT la.*, e.placa AS equipo_placa
                       FROM licencias_asignadas la
                       LEFT JOIN equipos e ON la.equipo_id = e.id
                       WHERE la.id = %s""",
                    [id],
                )
                return await cur.fetchone()

    @staticmethod
    async def create(data: dict) -> dict | None:
        new_id = str(uuid.uuid4())
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO licencias_asignadas
                       (id, licencia_id, serial, equipo_id, usuario, estado,
                        fecha_asignacion, fecha_vencimiento, observaciones)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    [
                        new_id,
                        data["licencia_id"],
                        data.get("serial"),
                        data.get("equipo_id") or None,
                        data.get("usuario"),
                        data.get("estado", "Activa"),
                        data.get("fecha_asignacion", date.today().isoformat()),
                        data.get("fecha_vencimiento"),
                        data.get("observaciones"),
                    ],
                )
        return await LicenciaAsignadaModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = ["serial", "equipo_id", "usuario", "estado",
                   "fecha_asignacion", "fecha_vencimiento", "observaciones"]
        fields, values = [], []
        for key in allowed:
            if key in data:
                val = data[key] or None if key == "equipo_id" else data[key]
                fields.append(f"{key} = %s")
                values.append(val)
        if not fields:
            return await LicenciaAsignadaModel.find_by_id(id)
        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"UPDATE licencias_asignadas SET {', '.join(fields)} WHERE id = %s", values
                )
        return await LicenciaAsignadaModel.find_by_id(id)

    @staticmethod
    async def liberar(id: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE licencias_asignadas SET estado = 'Liberada' WHERE id = %s", [id]
                )
        return await LicenciaAsignadaModel.find_by_id(id)

    @staticmethod
    async def delete(id: str):
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM licencias_asignadas WHERE id = %s", [id])


# ── Helper ────────────────────────────────────────────────────────────────────

def _add_estado(row: dict) -> dict:
    """Calcula el estado en base a disponibles vs mínimo."""
    disponible = int(row.get("cantidad_disponible") or 0)
    minimo     = int(row.get("cantidad_minima") or 1)
    if disponible <= 0:
        row["estado"] = "Sin stock"
    elif disponible <= minimo:
        row["estado"] = "Stock bajo"
    else:
        row["estado"] = "Disponible"
    return row
