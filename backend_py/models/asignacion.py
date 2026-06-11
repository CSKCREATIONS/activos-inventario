import uuid
import json
from datetime import date
from typing import Optional, List, Dict, Any

from config.db import get_pool
from models.asignacion_usuario import AsignacionUsuarioModel


def _parse_accesorios_entregados(row: dict) -> list:
    """Convierte el campo accesorios_entregados (JSON string) a lista de Python."""
    val = row.get("accesorios_entregados")
    if val is None:
        return []
    if isinstance(val, (bytes, bytearray)):
        try:
            val = val.decode("utf-8")
        except Exception:
            return []
    if isinstance(val, str):
        if not val.strip():
            return []
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return parsed
            return [parsed] if parsed else []
        except json.JSONDecodeError:
            return [val]
    if isinstance(val, list):
        return val
    return []


def _map_asignacion(row: dict) -> dict:
    """Normaliza campos JSON y agrega campo usuarios_ids (vacío inicialmente)."""
    if not row:
        return row
    row["accesorios_entregados"] = _parse_accesorios_entregados(row)
    row["usuarios_ids"] = []   # se llenará después
    return row


class AsignacionModel:
    @staticmethod
    async def find_all(busqueda: str = "", estado: str = "") -> List[dict]:
        pool = await get_pool()
        sql = """
            SELECT a.*,
                u.nombre AS usuario_nombre, u.cargo, u.area,
                e.placa, e.serial, e.marca, e.modelo, e.tipo_equipo, e.estado AS equipo_estado
            FROM asignaciones a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN equipos  e ON a.equipo_id = e.id
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
                if not rows:
                    return []
                ids = [row["id"] for row in rows]
                usuarios_por_asignacion = await AsignacionUsuarioModel.get_by_asignaciones(ids)  # ← dict
                result = []
                for row in rows:
                    item = _map_asignacion(row)
                    item["usuarios_ids"] = usuarios_por_asignacion.get(item["id"], [])
                    result.append(item)
                return result
        sql = """
            SELECT a.*,
                   u.nombre AS usuario_nombre, u.cargo, u.area,
                   e.placa, e.serial, e.marca, e.modelo, e.tipo_equipo, e.estado AS equipo_estado
            FROM asignaciones a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN equipos  e ON a.equipo_id = e.id
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
                if not rows:
                    return []
                ids = [row["id"] for row in rows]
                # Cargar todos los usuarios adicionales de una sola vez
                usuarios_dict = await AsignacionUsuarioModel.get_by_asignaciones([item["id"]])
                result = []
                for row in rows:
                    item = _map_asignacion(row)
                    item["usuarios_ids"] = [u["usuario_id"] for u in usuarios_dict.get(item["id"], [])]
                    result.append(item)
                return result

    @staticmethod
    async def find_by_id(id: str) -> Optional[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT a.*,
                              u.nombre AS usuario_nombre, u.cargo, u.area,
                              e.placa, e.serial, e.marca, e.modelo, e.tipo_equipo
                       FROM asignaciones a
                       JOIN usuarios u ON a.usuario_id = u.id
                       JOIN equipos  e ON a.equipo_id = e.id
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
    async def update(id: str, data: dict) -> Optional[dict]:
        # Campos permitidos para actualización directa
        allowed = {
            "observaciones", "accesorios_entregados", "estado", "acta_pdf",
            "hoja_vida_pdf", "fecha_devolucion", "firma_responsable", "fecha_firma", "firmado", "sede",  

        }
        updates = []
        values = []
        for key, value in data.items():
            if key in allowed:
                updates.append(f"{key} = %s")
                if key == "accesorios_entregados" and isinstance(value, list):
                    values.append(json.dumps(value, ensure_ascii=False))
                else:
                    values.append(value)

        if updates:
            values.append(id)
            pool = await get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        f"UPDATE asignaciones SET {', '.join(updates)} WHERE id = %s",
                        values
                    )

        # Manejar usuarios adicionales (tabla puente)
        if "usuarios_ids" in data:
            await AsignacionUsuarioModel.delete_by_asignacion(id)
            for uid in data["usuarios_ids"]:
                await AsignacionUsuarioModel.create(id, uid, "secundario")

        return await AsignacionModel.find_by_id(id)

    @staticmethod
    async def get_equipos_disponibles() -> List[dict]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT * FROM equipos WHERE estado = 'Disponible' ORDER BY placa ASC"
                )
                return await cur.fetchall()
            

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
            await conn.begin()
            try:
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
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise
        return await AsignacionModel.find_by_id(id)
    


    @staticmethod
    async def create(data: dict) -> dict | None:
        equipo_id = data["equipo_id"]
        usuario_id = data["usuario_id"]
        fecha_asignacion = data["fecha_asignacion"]
        observaciones = data.get("observaciones")
        accesorios_json = None
        if accesorios := data.get("accesorios_entregados"):
            accesorios_json = json.dumps(accesorios, ensure_ascii=False) if isinstance(accesorios, list) else str(accesorios)

        new_id = str(uuid.uuid4())

        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.begin()   # ← Aquí, no async with
            try:
                async with conn.cursor() as cur:
                    # Bloquear equipo
                    await cur.execute("SELECT estado FROM equipos WHERE id = %s FOR UPDATE", [equipo_id])
                    equipo_row = await cur.fetchone()
                    if not equipo_row:
                        raise ValueError("El equipo no existe.")
                    if equipo_row["estado"] != "Disponible":
                        raise ValueError("El equipo no está disponible para asignación.")

                    # Insertar asignación
                    await cur.execute(
                        """INSERT INTO asignaciones
                        (id, usuario_id, equipo_id, fecha_asignacion, estado, observaciones,
                            accesorios_entregados, acta_pdf, hoja_vida_pdf,
                            firma_responsable, fecha_firma, firmado, sede)
                        VALUES (%s, %s, %s, %s, 'Activa', %s, %s, %s, %s, %s, %s, %s)""",
                        [
                            new_id, usuario_id, equipo_id, fecha_asignacion,
                            observaciones, accesorios_json,
                            data.get("acta_pdf"), data.get("hoja_vida_pdf"),
                            None, None, 0
                        ]
                    )
                    # Cambiar estado del equipo
                    await cur.execute("UPDATE equipos SET estado = 'Asignado' WHERE id = %s", [equipo_id])
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise

        # Insertar usuarios adicionales (tabla puente)
        if usuarios_adicionales := data.get("usuarios_ids"):
            for uid in usuarios_adicionales:
                await AsignacionUsuarioModel.create(new_id, uid, "secundario")

        return await AsignacionModel.find_by_id(new_id)