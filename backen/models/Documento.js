const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class DocumentoModel {
  static async findAll({ busqueda = '', tipo = '', equipo_id = '', usuario_id = '' } = {}) {
    let sql = `
      SELECT d.*,
             e.placa AS equipo_placa,
             u.nombre AS usuario_nombre
      FROM documentos d
      LEFT JOIN equipos  e ON d.equipo_id  = e.id
      LEFT JOIN usuarios u ON d.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (busqueda) {
      sql += ' AND (d.nombre LIKE ? OR d.tipo LIKE ?)';
      const q = `%${busqueda}%`;
      params.push(q, q);
    }
    if (tipo) { sql += ' AND d.tipo = ?'; params.push(tipo); }
    if (equipo_id) { sql += ' AND d.equipo_id = ?'; params.push(equipo_id); }
    if (usuario_id) { sql += ' AND d.usuario_id = ?'; params.push(usuario_id); }

    sql += ' ORDER BY d.fecha_carga DESC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT d.*, e.placa AS equipo_placa, u.nombre AS usuario_nombre
       FROM documentos d
       LEFT JOIN equipos  e ON d.equipo_id  = e.id
       LEFT JOIN usuarios u ON d.usuario_id = u.id
       WHERE d.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async create(data) {
    const id = uuidv4();
    const fecha_carga = new Date().toISOString().split('T')[0];

    const {
      nombre, tipo, equipo_id = null, asignacion_id = null,
      usuario_id = null, url, version = 1, cargado_por = null
    } = data;

    await pool.execute(
      `INSERT INTO documentos (id, nombre, tipo, equipo_id, asignacion_id, usuario_id, url, version, fecha_carga, cargado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nombre, tipo, equipo_id, asignacion_id, usuario_id, url, version, fecha_carga, cargado_por]
    );
    return this.findById(id);
  }

  static async update(id, data) {
    const allowed = ['nombre', 'tipo', 'equipo_id', 'asignacion_id', 'usuario_id', 'url', 'version', 'cargado_por'];
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
    await pool.execute(`UPDATE documentos SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id) {
    await pool.execute('DELETE FROM documentos WHERE id = ?', [id]);
    return { id };
  }
}

module.exports = DocumentoModel;
