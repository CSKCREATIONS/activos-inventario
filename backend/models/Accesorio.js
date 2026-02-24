const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AccesorioModel {
  static async findAll({ busqueda = '', estado = '' } = {}) {
    let sql = `
      SELECT ac.*, e.placa AS equipo_placa, e.marca AS equipo_marca, e.modelo AS equipo_modelo
      FROM accesorios ac
      LEFT JOIN equipos e ON ac.equipo_principal_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (busqueda) {
      sql += ' AND (ac.nombre LIKE ? OR ac.placa LIKE ? OR ac.serial LIKE ?)';
      const q = `%${busqueda}%`;
      params.push(q, q, q);
    }
    if (estado) {
      sql += ' AND ac.estado = ?';
      params.push(estado);
    }

    sql += ' ORDER BY ac.nombre ASC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ac.*, e.placa AS equipo_placa, e.marca AS equipo_marca, e.modelo AS equipo_modelo
       FROM accesorios ac
       LEFT JOIN equipos e ON ac.equipo_principal_id = e.id
       WHERE ac.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async create(data) {
    const id = uuidv4();
    const fecha_registro = new Date().toISOString().split('T')[0];

    const {
      nombre, placa = null, serial = null, equipo_principal_id = null,
      cantidad = 1, estado = 'Disponible', observaciones = null
    } = data;

    await pool.execute(
      `INSERT INTO accesorios (id, nombre, placa, serial, equipo_principal_id, cantidad, estado, observaciones, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nombre, placa, serial, equipo_principal_id, cantidad, estado, observaciones, fecha_registro]
    );
    return this.findById(id);
  }

  static async update(id, data) {
    const allowed = ['nombre', 'placa', 'serial', 'equipo_principal_id', 'cantidad', 'estado', 'observaciones'];
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
    await pool.execute(`UPDATE accesorios SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id) {
    await pool.execute('DELETE FROM accesorios WHERE id = ?', [id]);
    return { id };
  }
}

module.exports = AccesorioModel;
