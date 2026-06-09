import uuid
from fastapi import Request
from config.db import get_pool

async def log_action(
    user_id: str,
    accion: str,
    modulo: str,
    entidad_id: str = None,
    detalle: str = None,
    ip: str = None
):
    """Registra una acción en la tabla audit_log."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """INSERT INTO audit_log
                   (id, usuario_sistema_id, accion, modulo, entidad_id, detalle, ip)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (str(uuid.uuid4()), user_id, accion, modulo, entidad_id, detalle, ip)
            )

async def log_request(request: Request, user_id: str, accion: str, modulo: str, entidad_id: str = None, detalle: str = None):
    """Versión que extrae automáticamente la IP del request."""
    client_ip = request.client.host if request.client else None
    await log_action(user_id, accion, modulo, entidad_id, detalle, client_ip)