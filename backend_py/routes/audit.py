from fastapi import APIRouter, Depends, HTTPException, Query
from dependencies import require_admin
from config.db import get_pool

router = APIRouter()

@router.get("/logs", dependencies=[Depends(require_admin)])
async def get_logs(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    modulo: str = Query(None),
    usuario_id: str = Query(None),
    accion: str = Query(None),
    current_admin: dict = Depends(require_admin)
):
    pool = await get_pool()
    sql = """
        SELECT a.*, u.username, u.nombre as usuario_nombre
        FROM audit_log a
        LEFT JOIN usuarios_sistema u ON a.usuario_sistema_id = u.id
        WHERE 1=1
    """
    params = []
    if modulo:
        sql += " AND a.modulo = %s"
        params.append(modulo)
    if usuario_id:
        sql += " AND a.usuario_sistema_id = %s"
        params.append(usuario_id)
    if accion:
        sql += " AND a.accion LIKE %s"
        params.append(f"%{accion}%")
    sql += " ORDER BY a.fecha DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            rows = await cur.fetchall()
            return {"data": rows, "total": len(rows), "limit": limit, "offset": offset}