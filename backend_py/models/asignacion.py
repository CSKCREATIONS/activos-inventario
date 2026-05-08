import uuid
import json
from datetime import date
from config.db import get_pool


def _map_asignacion(row: dict) -> dict:
    if not row:
        return row
    val = row.get("accesorios_entregados")
    if isinstance(val, (bytes, bytearray)):
        try:
            val = val.decode("utf-8")
        except Exception:
            val = None
    if isinstance(val, str) and val.strip():
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                row["accesorios_entregados"] = parsed
        except Exception:
            # si no es JSON válido, dejar el string tal cual
            pass
    elif val in (None, ""):
        row["accesorios_entregados"] = []
    return row


class AsignacionModel:
    @staticmethod
    async def find_all(busqueda: str = "", estado: str = "") -> list[dict]:
        pool = await get_pool()
        sql = """
            SELECT a.*,
                   u.nombre AS usuario_nombre, u.cargo, u.area,
                     e.placa, e.serial, e.marca, e.modelo, e.tipo_equipo, e.estado AS equipo_estado
            FROM asignaciones a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN equipos  e ON a.equipo_id  = e.id
            WHERE 1=1
        """
        params = []

        if busqueda:
            sql += " AND (u.nombre LIKE %s OR e.placa LIKE %s OR e.tipo_equipo LIKE %s)"
            q = f"%{busqueda}%"
            params.extend([q, q, q])
        if estado:
            sql += " AND a.estado = %s"
            params.append(estado)

        sql += " ORDER BY a.fecha_asignacion DESC"
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                rows = await cur.fetchall()
                return [_map_asignacion(r) for r in rows]

    @staticmethod
    async def find_by_id(id: str) -> dict | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT a.*,
                              u.nombre AS usuario_nombre, u.cargo, u.area,
                              e.placa, e.serial, e.marca, e.modelo, e.tipo_equipo
                       FROM asignaciones a
                       JOIN usuarios u ON a.usuario_id = u.id
                       JOIN equipos  e ON a.equipo_id  = e.id
                       WHERE a.id = %s""",
                    [id],
                )
                row = await cur.fetchone()
                return _map_asignacion(row) if row else None

    @staticmethod
    async def tiene_asignacion_activa(equipo_id: str) -> bool:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id FROM asignaciones WHERE equipo_id = %s AND estado = 'Activa' LIMIT 1",
                    [equipo_id],
                )
                return (await cur.fetchone()) is not None

    @staticmethod
    async def create(data: dict) -> dict | None:
        equipo_id = data["equipo_id"]
        ocupado = await AsignacionModel.tiene_asignacion_activa(equipo_id)
        if ocupado:
            raise ValueError("El equipo ya tiene una asignación activa.")

        new_id = str(uuid.uuid4())
        accesorios = data.get("accesorios_entregados")
        accesorios_json = None
        if accesorios is not None:
            if isinstance(accesorios, list):
                accesorios_json = json.dumps(accesorios, ensure_ascii=False)
            else:
                accesorios_json = str(accesorios)
        pool = await get_pool()
        async with pool.acquire() as conn:
            conn.autocommit = False
            async with conn.cursor() as cur:
                try:
                    try:
                        await cur.execute(
                            """INSERT INTO asignaciones
                               (id, usuario_id, equipo_id, fecha_asignacion, estado, observaciones, accesorios_entregados, acta_pdf, hoja_vida_pdf)
                               VALUES (%s, %s, %s, %s, 'Activa', %s, %s, %s, %s)""",
                            [
                                new_id,
                                data["usuario_id"],
                                equipo_id,
                                data["fecha_asignacion"],
                                data.get("observaciones"),
                                accesorios_json,
                                data.get("acta_pdf"),
                                data.get("hoja_vida_pdf"),
                            ],
                        )
                    except Exception as e:
                        # Compatibilidad: si la columna aún no existe, insertar sin ella.
                        if "Unknown column" in str(e) and "accesorios_entregados" in str(e):
                            await cur.execute(
                                """INSERT INTO asignaciones
                                   (id, usuario_id, equipo_id, fecha_asignacion, estado, observaciones, acta_pdf, hoja_vida_pdf)
                                   VALUES (%s, %s, %s, %s, 'Activa', %s, %s, %s)""",
                                [
                                    new_id,
                                    data["usuario_id"],
                                    equipo_id,
                                    data["fecha_asignacion"],
                                    data.get("observaciones"),
                                    data.get("acta_pdf"),
                                    data.get("hoja_vida_pdf"),
                                ],
                            )
                        else:
                            raise
                    await cur.execute(
                        "UPDATE equipos SET estado = 'Asignado' WHERE id = %s", [equipo_id]
                    )
                    await conn.commit()
                except Exception:
                    await conn.rollback()
                    raise
                finally:
                    conn.autocommit = True
        return await AsignacionModel.find_by_id(new_id)

    @staticmethod
    async def registrar_devolucion(id: str) -> dict | None:
        asignacion = await AsignacionModel.find_by_id(id)
        if not asignacion:
            raise ValueError("Asignación no encontrada.")
        if asignacion["estado"] != "Activa":
            raise ValueError("La asignación no está activa.")

        fecha_devolucion = date.today().isoformat()
        pool = await get_pool()
        async with pool.acquire() as conn:
            conn.autocommit = False
            async with conn.cursor() as cur:
                try:
                    await cur.execute(
                        "UPDATE asignaciones SET estado = 'Devuelta', fecha_devolucion = %s WHERE id = %s",
                        [fecha_devolucion, id],
                    )
                    await cur.execute(
                        "UPDATE equipos SET estado = 'Disponible' WHERE id = %s",
                        [asignacion["equipo_id"]],
                    )
                    await conn.commit()
                except Exception:
                    await conn.rollback()
                    raise
                finally:
                    conn.autocommit = True
        return await AsignacionModel.find_by_id(id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = [
            "observaciones",
            "accesorios_entregados",
            "estado",
            "acta_pdf",
            "hoja_vida_pdf",
            "fecha_devolucion",
        ]
        fields, values = [], []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                if key == "accesorios_entregados" and isinstance(data[key], list):
                    values.append(json.dumps(data[key], ensure_ascii=False))
                else:
                    values.append(data[key])

        if not fields:
            return await AsignacionModel.find_by_id(id)

        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"UPDATE asignaciones SET {', '.join(fields)} WHERE id = %s", values
                )
        return await AsignacionModel.find_by_id(id)

    @staticmethod
    async def get_equipos_disponibles() -> list[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT * FROM equipos WHERE estado = 'Disponible' ORDER BY placa ASC"
                )
                return await cur.fetchall()
