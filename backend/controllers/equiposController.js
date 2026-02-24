const EquipoModel = require('../models/Equipo');

// GET /api/equipos
exports.getAll = async (req, res, next) => {
  try {
    const { busqueda = '', estado = '', criticidad = '', tipo = '', es_rentado } = req.query;
    const rentadoFlag = es_rentado === undefined ? null : es_rentado === 'true';
    const equipos = await EquipoModel.findAll({ busqueda, estado, criticidad, tipo, es_rentado: rentadoFlag });
    res.json({ data: equipos, total: equipos.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/equipos/:id
exports.getById = async (req, res, next) => {
  try {
    const equipo = await EquipoModel.findById(req.params.id);
    if (!equipo) return res.status(404).json({ message: 'Equipo no encontrado.' });
    res.json({ data: equipo });
  } catch (err) {
    next(err);
  }
};

// GET /api/equipos/:id/historial
exports.getHistorial = async (req, res, next) => {
  try {
    const equipo = await EquipoModel.findById(req.params.id);
    if (!equipo) return res.status(404).json({ message: 'Equipo no encontrado.' });

    const historial = await EquipoModel.getHistorial(req.params.id);
    const responsable = await EquipoModel.getResponsable(req.params.id);
    res.json({ data: { equipo, historial, responsable } });
  } catch (err) {
    next(err);
  }
};

// POST /api/equipos
exports.create = async (req, res, next) => {
  try {
    const { placa, tipo_equipo, criticidad, confidencialidad } = req.body;
    if (!placa || !tipo_equipo || !criticidad || !confidencialidad) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: placa, tipo_equipo, criticidad, confidencialidad.' });
    }

    // Verificar placa duplicada
    const existePlaca = await EquipoModel.findByPlaca(placa);
    if (existePlaca) return res.status(409).json({ message: `Ya existe un equipo con la placa ${placa}.` });

    const nuevo = await EquipoModel.create(req.body);
    res.status(201).json({ data: nuevo, message: 'Equipo registrado exitosamente.' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/equipos/:id
exports.update = async (req, res, next) => {
  try {
    const existe = await EquipoModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Equipo no encontrado.' });

    // Verificar placa duplicada si se cambia
    if (req.body.placa && req.body.placa !== existe.placa) {
      const otroConPlaca = await EquipoModel.findByPlaca(req.body.placa);
      if (otroConPlaca) return res.status(409).json({ message: `Ya existe un equipo con la placa ${req.body.placa}.` });
    }

    const actualizado = await EquipoModel.update(req.params.id, req.body);
    res.json({ data: actualizado, message: 'Equipo actualizado.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/equipos/:id
exports.remove = async (req, res, next) => {
  try {
    const existe = await EquipoModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Equipo no encontrado.' });

    await EquipoModel.delete(req.params.id);
    res.json({ message: 'Equipo eliminado.' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'No se puede eliminar: el equipo tiene asignaciones o accesorios asociados.' });
    }
    next(err);
  }
};
