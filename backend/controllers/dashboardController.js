const { pool } = require('../config/db');

// GET /api/dashboard
exports.getStats = async (req, res, next) => {
  try {
    const [[equipoStats]] = await pool.execute(`
      SELECT
        COUNT(*)                                              AS total_equipos,
        SUM(estado = 'Asignado')                             AS equipos_asignados,
        SUM(estado = 'Disponible')                           AS equipos_disponibles,
        SUM(criticidad IN ('Alta','Crítica'))                AS equipos_criticos,
        SUM(es_rentado = 1)                                  AS equipos_rentados
      FROM equipos
    `);

    // Equipos sin acta (asignaciones activas sin acta_pdf)
    const [[sinActa]] = await pool.execute(`
      SELECT COUNT(*) AS total
      FROM asignaciones
      WHERE estado = 'Activa' AND (acta_pdf IS NULL OR acta_pdf = '')
    `);

    // Equipos sin hoja de vida (asignaciones activas sin hoja_vida_pdf)
    const [[sinHV]] = await pool.execute(`
      SELECT COUNT(*) AS total
      FROM asignaciones
      WHERE estado = 'Activa' AND (hoja_vida_pdf IS NULL OR hoja_vida_pdf = '')
    `);

    // Distribución por tipo de equipo
    const [porTipo] = await pool.execute(`
      SELECT tipo_equipo, COUNT(*) AS cantidad
      FROM equipos
      GROUP BY tipo_equipo
      ORDER BY cantidad DESC
    `);

    // Distribución por estado
    const [porEstado] = await pool.execute(`
      SELECT estado, COUNT(*) AS cantidad
      FROM equipos
      GROUP BY estado
    `);

    // Distribución por área (usuarios con equipos activos)
    const [porArea] = await pool.execute(`
      SELECT u.area, COUNT(a.id) AS cantidad
      FROM asignaciones a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.estado = 'Activa'
      GROUP BY u.area
      ORDER BY cantidad DESC
    `);

    const stats = {
      total_equipos:        Number(equipoStats.total_equipos)     || 0,
      equipos_asignados:    Number(equipoStats.equipos_asignados) || 0,
      equipos_disponibles:  Number(equipoStats.equipos_disponibles) || 0,
      equipos_criticos:     Number(equipoStats.equipos_criticos)  || 0,
      equipos_sin_acta:     Number(sinActa.total)                 || 0,
      equipos_sin_hoja_vida:Number(sinHV.total)                   || 0,
      equipos_rentados:     Number(equipoStats.equipos_rentados)  || 0,
    };

    res.json({ data: { stats, porTipo, porEstado, porArea } });
  } catch (err) {
    next(err);
  }
};
