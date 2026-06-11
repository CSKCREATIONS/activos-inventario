import uuid
from datetime import date

import aiomysql

from config.db import get_pool


class DocumentoModel:
    _archivos_table_ready: bool = False

    @staticmethod
    async def _ensure_archivos_table():
        """Crea la tabla de blobs si no existe (idempotente)."""
        if DocumentoModel._archivos_table_ready:
            return
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """CREATE TABLE IF NOT EXISTS documentos_archivos (
                        documento_id VARCHAR(36)  NOT NULL PRIMARY KEY,
                        filename     VARCHAR(255) NOT NULL,
                        mime_type    VARCHAR(100) NOT NULL,
                        contenido    LONGBLOB     NOT NULL,
                        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                        updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        CONSTRAINT fk_doc_archivo_documento
                            FOREIGN KEY (documento_id) REFERENCES documentos(id)
                            ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"""
                )
        DocumentoModel._archivos_table_ready = True

    @staticmethod
    async def upsert_archivo(documento_id: str, *, filename: str, mime_type: str, contenido: bytes) -> None:
        """Guarda/actualiza el archivo binario asociado a un documento."""
        await DocumentoModel._ensure_archivos_table()
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                # REPLACE: elimina e inserta, sirve como upsert simple.
                await cur.execute(
                    """REPLACE INTO documentos_archivos (documento_id, filename, mime_type, contenido)
                       VALUES (%s, %s, %s, %s)""",
                    [documento_id, filename, mime_type, contenido],
                )

    @staticmethod
    async def get_archivo(documento_id: str) -> dict | None:
        """Obtiene el archivo binario de un documento (si existe)."""
        await DocumentoModel._ensure_archivos_table()
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    """SELECT filename, mime_type, contenido
                       FROM documentos_archivos
                       WHERE documento_id = %s
                       LIMIT 1""",
                    [documento_id],
                )
                row = await cur.fetchone()
                if not row:
                    return None
                contenido = row.get("contenido")
                if isinstance(contenido, memoryview):
                    contenido = contenido.tobytes()
                elif isinstance(contenido, bytearray):
                    contenido = bytes(contenido)
                return {
                    "filename": row.get("filename") or "documento",
                    "mime_type": row.get("mime_type") or "application/octet-stream",
                    "contenido": contenido or b"",
                }

    @staticmethod
    async def find_all(
        busqueda: str = "",
        tipo: str = "",
        equipo_id: str = "",
        asignacion_id: str = "",
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
        if asignacion_id:
            sql += " AND d.asignacion_id = %s"
            params.append(asignacion_id)
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
                # En create
                await cur.execute(
                    """INSERT INTO documentos
                    (id, nombre, tipo, equipo_id, asignacion_id, usuario_id, area, url, version, fecha_carga, cargado_por, sede)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    [
                        new_id,
                        data["nombre"],
                        data["tipo"],
                        data.get("equipo_id"),
                        data.get("asignacion_id"),
                        data.get("usuario_id"),
                        data.get("area"),          # ← nuevo
                        data["url"],
                        data.get("version", 1),
                        fecha_carga,
                        data.get("cargado_por"),
                        data.get("sede"),
                    ]
                )
        return await DocumentoModel.find_by_id(new_id)

    @staticmethod
    async def update(id: str, data: dict) -> dict | None:
        allowed = [
            "nombre",
            "tipo",
            "equipo_id",
            "asignacion_id",
            "usuario_id",
            "url",
            "version",
            "fecha_carga",
            "cargado_por",
            "sede",

        ]
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
