from datetime import date
from fastapi import APIRouter, HTTPException
from config.db import get_pool
from utils.serializer import serialize

router = APIRouter()


def _add_months(d: date, months: int) -> date:
    """Suma N meses a una fecha sin dependencias externas."""
    month = d.month - 1 + months
    year  = d.year + month // 12
    month = month % 12 + 1
    import calendar
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


@router.get("/mantenimientos-pendientes")
async def get_mantenimientos_pendientes():
    """
    Devuelve equipos activos cuyo último mantenimiento está vencido (más de 6 meses)
    o que nunca tuvieron mantenimiento pero fueron registrados hace más de 6 meses.
    """
    pool = await get_pool()
    try:
        limite = _add_months(date.today(), -6).isoformat()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("""
                    SELECT
                        e.id, e.placa, e.marca, e.modelo, e.tipo_equipo,
                        e.estado, e.ultimo_mantenimiento, e.fecha_registro,
                        u.nombre  AS usuario_nombre,
                        u.area    AS area,
                        u.cargo   AS cargo
                    FROM equipos e
                    LEFT JOIN asignaciones a
                        ON a.equipo_id = e.id AND a.estado = 'Activa'
                    LEFT JOIN usuarios u ON u.id = a.usuario_id
                    WHERE e.estado != 'Baja'
                      AND (
                          (e.ultimo_mantenimiento IS NOT NULL AND e.ultimo_mantenimiento <= %s)
                          OR
                          (e.ultimo_mantenimiento IS NULL AND e.fecha_registro <= %s)
                      )
                    ORDER BY
                        CASE WHEN e.ultimo_mantenimiento IS NULL THEN 0 ELSE 1 END,
                        e.ultimo_mantenimiento ASC
                """, [limite, limite])
                rows = await cur.fetchall()

        total = len(rows)
        sin_registro = sum(1 for r in rows if not r.get("ultimo_mantenimiento"))
        vencidos     = total - sin_registro

        equipos_out = []
        for r in rows:
            ult = r.get("ultimo_mantenimiento")
            if not ult:
                dias_vencido = None
                urgencia = "sin_registro"
            else:
                fecha_ult = ult if isinstance(ult, date) else date.fromisoformat(str(ult)[:10])
                proximo   = _add_months(fecha_ult, 6)
                dias_vencido = (date.today() - proximo).days
                urgencia = "vencido"
            equipos_out.append({
                **{k: (v.isoformat() if isinstance(v, date) else v) for k, v in r.items()},
                "dias_vencido": dias_vencido,
                "urgencia":     urgencia,
            })

        return serialize({
            "data": {
                "total":        total,
                "sin_registro": sin_registro,
                "vencidos":     vencidos,
                "equipos":      equipos_out,
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
