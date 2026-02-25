from fastapi import APIRouter, HTTPException
from config.db import get_pool
from utils.serializer import serialize

router = APIRouter()


@router.get("")
async def get_stats():
    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("""
                    SELECT
                        COUNT(*)                                            AS total_equipos,
                        SUM(estado = 'Asignado')                           AS equipos_asignados,
                        SUM(estado = 'Disponible')                         AS equipos_disponibles,
                        SUM(criticidad IN ('Alta','Crítica'))               AS equipos_criticos,
                        SUM(es_rentado = 1)                                AS equipos_rentados
                    FROM equipos
                """)
                equipo_stats = await cur.fetchone()

                await cur.execute("""
                    SELECT COUNT(*) AS total
                    FROM asignaciones
                    WHERE estado = 'Activa' AND (acta_pdf IS NULL OR acta_pdf = '')
                """)
                sin_acta = await cur.fetchone()

                await cur.execute("""
                    SELECT COUNT(*) AS total
                    FROM asignaciones
                    WHERE estado = 'Activa' AND (hoja_vida_pdf IS NULL OR hoja_vida_pdf = '')
                """)
                sin_hv = await cur.fetchone()

                await cur.execute("""
                    SELECT tipo_equipo, COUNT(*) AS cantidad
                    FROM equipos
                    GROUP BY tipo_equipo
                    ORDER BY cantidad DESC
                """)
                por_tipo = await cur.fetchall()

                await cur.execute("""
                    SELECT estado, COUNT(*) AS cantidad
                    FROM equipos
                    GROUP BY estado
                """)
                por_estado = await cur.fetchall()

                await cur.execute("""
                    SELECT u.area, COUNT(a.id) AS cantidad
                    FROM asignaciones a
                    JOIN usuarios u ON a.usuario_id = u.id
                    WHERE a.estado = 'Activa'
                    GROUP BY u.area
                    ORDER BY cantidad DESC
                """)
                por_area = await cur.fetchall()

        stats = {
            "total_equipos":         int(equipo_stats["total_equipos"] or 0),
            "equipos_asignados":     int(equipo_stats["equipos_asignados"] or 0),
            "equipos_disponibles":   int(equipo_stats["equipos_disponibles"] or 0),
            "equipos_criticos":      int(equipo_stats["equipos_criticos"] or 0),
            "equipos_sin_acta":      int(sin_acta["total"] or 0),
            "equipos_sin_hoja_vida": int(sin_hv["total"] or 0),
            "equipos_rentados":      int(equipo_stats["equipos_rentados"] or 0),
        }

        return serialize({"data": {"stats": stats, "porTipo": por_tipo, "porEstado": por_estado, "porArea": por_area}})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
