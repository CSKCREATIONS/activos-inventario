import uuid
import json
from datetime import date
from config.db import get_pool


def _map_asignacion(row: dict) -> dict:
    if not row:
        return row
    
    # Parsear accesorios_entregados (solo si la columna está presente en el resultado)
    if "accesorios_entregados" in row:
        val = row.get("accesorios_entregados")

        # Solo emitir logs cuando haya datos potencialmente útiles
        if isinstance(val, (bytes, bytearray)):
            try:
                decoded = val.decode("utf-8")
                try:
                    parsed = json.loads(decoded)
                    if isinstance(parsed, list):
                        row["accesorios_entregados"] = parsed
                        print(f"[MAP ASIGNACION] Parseado JSON (bytes) a: {parsed}")
                except Exception:
                    # si no es JSON válido, guardar el string resultante
                    row["accesorios_entregados"] = decoded
                    print(f"[MAP ASIGNACION] Decodificado de bytes a string: {decoded}")
            except Exception:
                # silenciar errores de decodificación en producción
                row["accesorios_entregados"] = []

        elif isinstance(val, str) and val.strip():
            # Intentar parsear JSON si viene como string
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    row["accesorios_entregados"] = parsed
                    print(f"[MAP ASIGNACION] Parseado JSON a: {parsed}")
                else:
                    # si no es lista, guardarlo tal cual
                    row["accesorios_entregados"] = parsed
            except Exception:
                # No es JSON; tratar como texto separado por comas u string simple
                row["accesorios_entregados"] = val

        else:
            # Valor nulo o vacío -> normalizar a lista vacía sin log ruidoso
            row["accesorios_entregados"] = []

        # Imprimir resultado solo si hay contenido útil
        if row.get("accesorios_entregados"):
            print(f"[MAP ASIGNACION] Resultado final: {row.get('accesorios_entregados')}")
    
    # Parsear usuarios_ids (múltiples usuarios)
    usuarios_val = row.get("usuarios_ids")
    if usuarios_val:
        if isinstance(usuarios_val, (bytes, bytearray)):
            try:
                usuarios_val = usuarios_val.decode("utf-8")
            except Exception:
                usuarios_val = None
        if isinstance(usuarios_val, str) and usuarios_val.strip():
            try:
                parsed_usuarios = json.loads(usuarios_val)
                if isinstance(parsed_usuarios, list):
                    row["usuarios_ids"] = parsed_usuarios
            except Exception:
                row["usuarios_ids"] = []
        else:
            row["usuarios_ids"] = []
    else:
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
        
        # Debug logging
        print(f"[ASIGNACION CREATE] Accesorios recibidos: {accesorios}")
        print(f"[ASIGNACION CREATE] Tipo accesorios: {type(accesorios)}")
        print(f"[ASIGNACION CREATE] Accesorios JSON a guardar: {accesorios_json}")
        
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
                        print(f"[ASIGNACION CREATE] [OK] Insertado CON columna accesorios_entregados")
                    except Exception as e:
                        print(f"[ASIGNACION CREATE] [ERROR] Error con columna: {str(e)[:100]}")
                        # Compatibilidad: si la columna aún no existe, insertar sin ella.
                        if "Unknown column" in str(e) and "accesorios_entregados" in str(e):
                            print(f"[ASIGNACION CREATE] Intentando SIN columna (no existe en BD)")
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
                            print(f"[ASIGNACION CREATE] [OK] Insertado SIN columna accesorios_entregados")
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
            "usuarios_ids",
            "estado",
            "acta_pdf",
            "hoja_vida_pdf",
            "fecha_devolucion",
        ]
        fields, values = [], []
        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                if key in ("accesorios_entregados", "usuarios_ids") and isinstance(data[key], list):
                    values.append(json.dumps(data[key], ensure_ascii=False))
                else:
                    values.append(data[key])

        if not fields:
            return await AsignacionModel.find_by_id(id)

        values.append(id)
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                try:
                    await cur.execute(
                        f"UPDATE asignaciones SET {', '.join(fields)} WHERE id = %s", values
                    )
                except Exception as e:
                    err_str = str(e)
                    # Si la columna no existe en la tabla (migración no aplicada), intentar reintentar
                    # excluyendo las columnas opcionales que faltan.
                    if "Unknown column" in err_str:
                        missing_cols = []
                        for col in ("usuarios_ids", "accesorios_entregados"):
                            if col in err_str:
                                missing_cols.append(col)

                        # Si no detectamos columnas específicas, intentar quitar las opcionales presentes en `data`
                        if not missing_cols:
                            missing_cols = [c for c in ("usuarios_ids", "accesorios_entregados") if c in data]

                        # Reconstruir campos/valores sin las columnas faltantes
                        new_fields = []
                        new_values = []
                        for key in allowed:
                            if key in data and key not in missing_cols:
                                new_fields.append(f"{key} = %s")
                                if key in ("accesorios_entregados", "usuarios_ids") and isinstance(data[key], list):
                                    new_values.append(json.dumps(data[key], ensure_ascii=False))
                                else:
                                    new_values.append(data[key])

                        if not new_fields:
                            # Nada que actualizar después de quitar columnas faltantes
                            return await AsignacionModel.find_by_id(id)

                        new_values.append(id)
                        await cur.execute(
                            f"UPDATE asignaciones SET {', '.join(new_fields)} WHERE id = %s",
                            new_values,
                        )
                    else:
                        raise
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
