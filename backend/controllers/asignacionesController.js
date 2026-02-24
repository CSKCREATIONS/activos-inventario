const AsignacionModel = require('../models/Asignacion');

// GET /api/asignaciones
exports.getAll = async (req, res, next) => {
  try {
    const { busqueda = '', estado = '' } = req.query;
    const asignaciones = await AsignacionModel.findAll({ busqueda, estado });
    const activas = asignaciones.filter((a) => a.estado === 'Activa').length;
    res.json({ data: asignaciones, total: asignaciones.length, activas });
  } catch (err) {
    next(err);
  }
};

// GET /api/asignaciones/equipos-disponibles
exports.getEquiposDisponibles = async (req, res, next) => {
  try {
    const equipos = await AsignacionModel.getEquiposDisponibles();
    res.json({ data: equipos });
  } catch (err) {
    next(err);
  }
};

// GET /api/asignaciones/:id
exports.getById = async (req, res, next) => {
  try {
    const asignacion = await AsignacionModel.findById(req.params.id);
    if (!asignacion) return res.status(404).json({ message: 'Asignación no encontrada.' });
    res.json({ data: asignacion });
  } catch (err) {
    next(err);
  }
};

// POST /api/asignaciones
exports.create = async (req, res, next) => {
  try {
    const { usuario_id, equipo_id, fecha_asignacion } = req.body;
    if (!usuario_id || !equipo_id || !fecha_asignacion) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: usuario_id, equipo_id, fecha_asignacion.' });
    }
    const nueva = await AsignacionModel.create(req.body);
    res.status(201).json({ data: nueva, message: 'Asignación creada exitosamente.' });
  } catch (err) {
    if (err.message.includes('asignación activa')) {
      return res.status(409).json({ message: err.message });
    }
    next(err);
  }
};

// PUT /api/asignaciones/:id
exports.update = async (req, res, next) => {
  try {
    const existe = await AsignacionModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Asignación no encontrada.' });

    const actualizada = await AsignacionModel.update(req.params.id, req.body);
    res.json({ data: actualizada, message: 'Asignación actualizada.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/asignaciones/:id/devolucion
exports.registrarDevolucion = async (req, res, next) => {
  try {
    const actualizada = await AsignacionModel.registrarDevolucion(req.params.id);
    res.json({ data: actualizada, message: 'Devolución registrada. Equipo marcado como Disponible.' });
  } catch (err) {
    if (err.message.includes('no encontrada') || err.message.includes('activa')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};
