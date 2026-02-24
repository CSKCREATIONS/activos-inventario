const AccesorioModel = require('../models/Accesorio');

// GET /api/accesorios
exports.getAll = async (req, res, next) => {
  try {
    const { busqueda = '', estado = '' } = req.query;
    const accesorios = await AccesorioModel.findAll({ busqueda, estado });
    res.json({ data: accesorios, total: accesorios.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/accesorios/:id
exports.getById = async (req, res, next) => {
  try {
    const accesorio = await AccesorioModel.findById(req.params.id);
    if (!accesorio) return res.status(404).json({ message: 'Accesorio no encontrado.' });
    res.json({ data: accesorio });
  } catch (err) {
    next(err);
  }
};

// POST /api/accesorios
exports.create = async (req, res, next) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El campo nombre es obligatorio.' });

    const nuevo = await AccesorioModel.create(req.body);
    res.status(201).json({ data: nuevo, message: 'Accesorio registrado exitosamente.' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/accesorios/:id
exports.update = async (req, res, next) => {
  try {
    const existe = await AccesorioModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Accesorio no encontrado.' });

    const actualizado = await AccesorioModel.update(req.params.id, req.body);
    res.json({ data: actualizado, message: 'Accesorio actualizado.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/accesorios/:id
exports.remove = async (req, res, next) => {
  try {
    const existe = await AccesorioModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Accesorio no encontrado.' });

    await AccesorioModel.delete(req.params.id);
    res.json({ message: 'Accesorio eliminado.' });
  } catch (err) {
    next(err);
  }
};
