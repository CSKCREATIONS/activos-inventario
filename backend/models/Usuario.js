const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class UsuarioModel {
  static async findAll({ busqueda = '', area = '' } = {}) {
    let sql = 'SELECT * FROM usuarios WHERE 1=1';
    const params = [];

    if (busqueda) {
      sql += ' AND (nombre LIKE ? OR correo LIKE ? OR area LIKE ? OR proceso LIKE ?)';
      const q = `%${busqueda}%`;
      params.push(q, q, q, q);
    }
    if (area) {
      sql += ' AND area = ?';
      params.push(area);
    }

    sql += ' ORDER BY nombre ASC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async findAreas() {
    const [rows] = await pool.execute('SELECT DISTINCT area FROM usuarios ORDER BY area ASC');
    return rows.map((r) => r.area);
  }

  static async create(data) {
    const id = uuidv4();
    const fecha_registro = new Date().toISOString().split('T')[0];
    const { nombre, cargo, proceso, grupo_asignado, area, correo, ubicacion = null, activo = true } = data;

    await pool.execute(
      `INSERT INTO usuarios (id, nombre, cargo, proceso, grupo_asignado, area, correo, ubicacion, activo, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nombre, cargo, proceso, grupo_asignado, area, correo, ubicacion, activo ? 1 : 0, fecha_registro]
    );
    return this.findById(id);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    const allowed = ['nombre', 'cargo', 'proceso', 'grupo_asignado', 'area', 'correo', 'ubicacion', 'activo'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'activo' ? (data[key] ? 1 : 0) : data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id) {
    await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    return { id };
  }

  // Perfil completo: equipos activos + historial + documentos
  static async getPerfil(id) {
    const [asignacionesActivas] = await pool.execute(
      `SELECT a.*, e.placa, e.marca, e.modelo, e.tipo_equipo, e.estado AS equipo_estado
       FROM asignaciones a
       JOIN equipos e ON a.equipo_id = e.id
       WHERE a.usuario_id = ? AND a.estado = 'Activa'`,
      [id]
    );

    const [historial] = await pool.execute(
      `SELECT a.*, e.placa, e.marca, e.modelo, e.tipo_equipo
       FROM asignaciones a
       JOIN equipos e ON a.equipo_id = e.id
       WHERE a.usuario_id = ?
       ORDER BY a.fecha_asignacion DESC`,
      [id]
    );

    const [documentos] = await pool.execute(
      'SELECT * FROM documentos WHERE usuario_id = ? ORDER BY fecha_carga DESC',
      [id]
    );

    return { asignacionesActivas, historial, documentos };
  }
}

module.exports = UsuarioModel;
