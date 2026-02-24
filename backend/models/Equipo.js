const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class EquipoModel {
  static async findAll({ busqueda = '', estado = '', criticidad = '', tipo = '', es_rentado = null } = {}) {
    let sql = 'SELECT * FROM equipos WHERE 1=1';
    const params = [];

    if (busqueda) {
      sql += ' AND (placa LIKE ? OR marca LIKE ? OR modelo LIKE ? OR serial LIKE ?)';
      const q = `%${busqueda}%`;
      params.push(q, q, q, q);
    }
    if (estado) { sql += ' AND estado = ?'; params.push(estado); }
    if (criticidad) { sql += ' AND criticidad = ?'; params.push(criticidad); }
    if (tipo) { sql += ' AND tipo_equipo = ?'; params.push(tipo); }
    if (es_rentado !== null) { sql += ' AND es_rentado = ?'; params.push(es_rentado ? 1 : 0); }

    sql += ' ORDER BY fecha_registro DESC';
    const [rows] = await pool.execute(sql, params);
    return rows.map(mapEquipo);
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM equipos WHERE id = ?', [id]);
    return rows[0] ? mapEquipo(rows[0]) : null;
  }

  static async findByPlaca(placa) {
    const [rows] = await pool.execute('SELECT * FROM equipos WHERE placa = ?', [placa]);
    return rows[0] ? mapEquipo(rows[0]) : null;
  }

  static async create(data) {
    const id = uuidv4();
    const fecha_registro = new Date().toISOString().split('T')[0];

    const {
      placa, serial = null, tipo_equipo, marca = null, modelo = null,
      sistema_operativo = null, version_so = null, ram = null, disco = null,
      tecnologia = null, criticidad, confidencialidad, estado = 'Disponible',
      fecha_compra = null, proveedor = null, costo = null, es_rentado = false,
      observaciones = null
    } = data;

    await pool.execute(
      `INSERT INTO equipos
        (id, placa, serial, tipo_equipo, marca, modelo, sistema_operativo, version_so,
         ram, disco, tecnologia, criticidad, confidencialidad, estado, fecha_registro,
         fecha_compra, proveedor, costo, es_rentado, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, placa, serial, tipo_equipo, marca, modelo, sistema_operativo, version_so,
       ram, disco, tecnologia, criticidad, confidencialidad, estado, fecha_registro,
       fecha_compra, proveedor, costo, es_rentado ? 1 : 0, observaciones]
    );
    return this.findById(id);
  }

  static async update(id, data) {
    const allowed = [
      'placa','serial','tipo_equipo','marca','modelo','sistema_operativo','version_so',
      'ram','disco','tecnologia','criticidad','confidencialidad','estado',
      'fecha_compra','proveedor','costo','es_rentado','observaciones'
    ];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'es_rentado' ? (data[key] ? 1 : 0) : data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE equipos SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id) {
    await pool.execute('DELETE FROM equipos WHERE id = ?', [id]);
    return { id };
  }

  // Historial de asignaciones del equipo
  static async getHistorial(equipoId) {
    const [rows] = await pool.execute(
      `SELECT a.*, u.nombre AS usuario_nombre, u.cargo, u.area
       FROM asignaciones a
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.equipo_id = ?
       ORDER BY a.fecha_asignacion DESC`,
      [equipoId]
    );
    return rows;
  }

  // Responsable actual (asignación activa)
  static async getResponsable(equipoId) {
    const [rows] = await pool.execute(
      `SELECT u.*, a.id AS asignacion_id, a.fecha_asignacion
       FROM asignaciones a
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.equipo_id = ? AND a.estado = 'Activa'
       LIMIT 1`,
      [equipoId]
    );
    return rows[0] || null;
  }
}

// Convierte tinyint a boolean para es_rentado
function mapEquipo(row) {
  return { ...row, es_rentado: !!row.es_rentado };
}

module.exports = EquipoModel;
