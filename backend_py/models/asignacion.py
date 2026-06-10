import uuid
import json
from datetime import date
from config.db import get_pool
from models.asignacion_usuario import AsignacionUsuarioModel

def _map_asignacion(row: dict) -> dict:
    """Normaliza campos JSON (accesorios_entregados) y agrega usuarios_ids vacío"""
    if not row:
        return row

    # Parsear accesorios_entregados
    if "accesorios_entregados" in row:
        val = row.get("accesorios_entregados")
        if isinstance(val, (bytes, bytearray)):
            try:
                val = val.decode("utf-8")
            except Exception:
                row["accesorios_entregados"] = []
                return row
        if isinstance(val, str) and val.strip():
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    row["accesorios_entregados"] = parsed
                else:
                    row["accesorios_entregados"] = [parsed] if parsed else []
            except Exception:
                row["accesorios_entregados"] = [val] if val.strip() else []
        else:
            row["accesorios_entregados"] = []
    else:
        row["accesorios_entregados"] = []

    # Los usuarios_ids se cargarán aparte; aquí dejamos una lista vacía
    row["usuarios_ids"] = []
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
                result = []
                for row in rows:
                    item = _map_asignacion(row)
                    # Cargar usuarios adicionales desde la tabla puente
                    usuarios = await AsignacionUsuarioModel.get_by_asignacion(item["id"])
                    item["usuarios_ids"] = [u["usuario_id"] for u in usuarios]
                    result.append(item)
                return result

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
                if not row:
                    return None
                item = _map_asignacion(row)
                usuarios = await AsignacionUsuarioModel.get_by_asignacion(item["id"])
                item["usuarios_ids"] = [u["usuario_id"] for u in usuarios]
                return item

    @staticmethod
    async def create(data: dict) -> dict | None:
        equipo_id = data["equipo_id"]
        usuario_id = data["usuario_id"]
        fecha_asignacion = data["fecha_asignacion"]
        observaciones = data.get("observaciones")
        accesorios = data.get("accesorios_entregados")
        accesorios_json = None
        if accesorios is not None:
            if isinstance(accesorios, list):
                accesorios_json = json.dumps(accesorios, ensure_ascii=False)
            else:
                accesorios_json = str(accesorios)

        new_id = str(uuid.uuid4())

        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await conn.begin()
                try:
                    # Bloquear el equipo para lectura/escritura
                    await cur.execute(
                        "SELECT estado FROM equipos WHERE id = %s FOR UPDATE",
                        [equipo_id]
                    )
                    equipo_row = await cur.fetchone()
                    if not equipo_row:
                        raise ValueError("El equipo no existe.")
                    if equipo_row["estado"] != "Disponible":
                        raise ValueError("El equipo no está disponible para asignación.")

                    # Insertar la asignación
                    await cur.execute(
                        """INSERT INTO asignaciones
                        (id, usuario_id, equipo_id, fecha_asignacion, estado, observaciones,
                            accesorios_entregados, acta_pdf, hoja_vida_pdf,
                            firma_responsable, fecha_firma, firmado)
                        VALUES (%s, %s, %s, %s, 'Activa', %s, %s, %s, %s, %s, %s, %s)""",
                        [
                            new_id,
                            usuario_id,
                            equipo_id,
                            fecha_asignacion,
                            observaciones,
                            accesorios_json,
                            data.get("acta_pdf"),
                            data.get("hoja_vida_pdf"),
                            None,   # firma_responsable
                            None,   # fecha_firma
                            0       # firmado
                        ]
                    )

                    # Actualizar estado del equipo
                    await cur.execute(
                        "UPDATE equipos SET estado = 'Asignado' WHERE id = %s",
                        [equipo_id]
                    )
                    await conn.commit()
                except Exception as e:
                    await conn.rollback()
                    raise

        # Insertar usuarios adicionales en tabla puente
        if data.get("usuarios_ids"):
            for uid in data["usuarios_ids"]:
                await AsignacionUsuarioModel.create(new_id, uid, "secundario")
        # Opcional: también podrías insertar al usuario principal como "principal" en la tabla puente
        # await AsignacionUsuarioModel.create(new_id, usuario_id, "principal")

        return await AsignacionModel.find_by_id(new_id)

    @staticmethod
    async def registrar_devolucion(id: str) -> dict | None:
        asignacion = await AsignacionModel.find_by_id(id)
        if not asignacion:
            raise ValueError("Asignación no encontrada.")
        if asignacion["estado"] != "Activa":
            raise ValueError("La asignación no está activa.")

        equipo_id = asignacion["equipo_id"]
        fecha_devolucion = date.today().isoformat()

        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.begin():
                async with conn.cursor() as cur:
                    await cur.execute(
                        "SELECT estado FROM asignaciones WHERE id = %s FOR UPDATE",
                        [id]
                    )
                    row = await cur.fetchone()
                    if not row or row["estado"] != "Activa":
                        raise ValueError("La asignación ya no está activa.")

                    await cur.execute(
                        "UPDATE asignaciones SET estado = 'Devuelta', fecha_devolucion = %s WHERE id = %s",
                        [fecha_devolucion, id]
                    )
                    await cur.execute(
                        "UPDATE equipos SET estado = 'Disponible' WHERE id = %s",
                        [equipo_id]
                    )
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
            "firma_responsable",
            "fecha_firma",
            "firmado",           # ← añadir
        ]
        fields = []
        values = []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                if key in ("accesorios_entregados",) and isinstance(data[key], list):
                    values.append(json.dumps(data[key], ensure_ascii=False))
                else:
                    values.append(data[key])

        if fields:
            values.append(id)
            pool = await get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        f"UPDATE asignaciones SET {', '.join(fields)} WHERE id = %s", values
                    )

        # Actualizar tabla puente si vienen usuarios_ids
        if "usuarios_ids" in data:
            await AsignacionUsuarioModel.delete_by_asignacion(id)
            for uid in data["usuarios_ids"]:
                await AsignacionUsuarioModel.create(id, uid, "secundario")
            # Opcional: también podrías mantener al usuario principal en la tabla puente,
            # pero ten en cuenta que ya existe en el campo usuario_id de la asignación.

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