const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AsignacionModel {
  static async findAll({ busqueda = '', estado = '' } = {}) {
    let sql = `
      SELECT a.*,
             u.nombre AS usuario_nombre, u.cargo, u.area,
             e.placa, e.marca, e.modelo, e.tipo_equipo, e.estado AS equipo_estado
      FROM asignaciones a
      JOIN usuarios u ON a.usuario_id = u.id
      JOIN equipos  e ON a.equipo_id  = e.id
      WHERE 1=1
    `;
    const params = [];

    if (busqueda) {
      sql += ' AND (u.nombre LIKE ? OR e.placa LIKE ? OR e.tipo_equipo LIKE ?)';
      const q = `%${busqueda}%`;
      params.push(q, q, q);
    }
    if (estado) {
      sql += ' AND a.estado = ?';
      params.push(estado);
    }

    sql += ' ORDER BY a.fecha_asignacion DESC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT a.*,
              u.nombre AS usuario_nombre, u.cargo, u.area,
              e.placa, e.marca, e.modelo, e.tipo_equipo
       FROM asignaciones a
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN equipos  e ON a.equipo_id  = e.id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async tieneAsignacionActiva(equipo_id) {
    const [rows] = await pool.execute(
      "SELECT id FROM asignaciones WHERE equipo_id = ? AND estado = 'Activa' LIMIT 1",
      [equipo_id]
    );
    return rows.length > 0;
  }

  static async create(data) {
    const id = uuidv4();
    const { usuario_id, equipo_id, fecha_asignacion, observaciones = null, acta_pdf = null, hoja_vida_pdf = null } = data;

    // Validar que el equipo no tenga asignación activa
    const ocupado = await this.tieneAsignacionActiva(equipo_id);
    if (ocupado) throw new Error('El equipo ya tiene una asignación activa.');

    const conn = await require('../config/db').pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO asignaciones (id, usuario_id, equipo_id, fecha_asignacion, estado, observaciones, acta_pdf, hoja_vida_pdf)
         VALUES (?, ?, ?, ?, 'Activa', ?, ?, ?)`,
        [id, usuario_id, equipo_id, fecha_asignacion, observaciones, acta_pdf, hoja_vida_pdf]
      );

      await conn.execute("UPDATE equipos SET estado = 'Asignado' WHERE id = ?", [equipo_id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return this.findById(id);
  }

  static async registrarDevolucion(id) {
    const asignacion = await this.findById(id);
    if (!asignacion) throw new Error('Asignación no encontrada.');
    if (asignacion.estado !== 'Activa') throw new Error('La asignación no está activa.');

    const fecha_devolucion = new Date().toISOString().split('T')[0];
    const conn = await require('../config/db').pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        "UPDATE asignaciones SET estado = 'Devuelta', fecha_devolucion = ? WHERE id = ?",
        [fecha_devolucion, id]
      );
      await conn.execute("UPDATE equipos SET estado = 'Disponible' WHERE id = ?", [asignacion.equipo_id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return this.findById(id);
  }

  static async update(id, data) {
    const allowed = ['observaciones', 'estado', 'acta_pdf', 'hoja_vida_pdf', 'fecha_devolucion'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE asignaciones SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async getEquiposDisponibles() {
    const [rows] = await pool.execute(
      "SELECT * FROM equipos WHERE estado = 'Disponible' ORDER BY placa ASC"
    );
    return rows;
  }
}

module.exports = AsignacionModel;
