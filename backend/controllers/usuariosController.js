const UsuarioModel = require('../models/Usuario');

// GET /api/usuarios
exports.getAll = async (req, res, next) => {
  try {
    const { busqueda = '', area = '' } = req.query;
    const usuarios = await UsuarioModel.findAll({ busqueda, area });
    res.json({ data: usuarios, total: usuarios.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/usuarios/areas
exports.getAreas = async (req, res, next) => {
  try {
    const areas = await UsuarioModel.findAreas();
    res.json({ data: areas });
  } catch (err) {
    next(err);
  }
};

// GET /api/usuarios/:id
exports.getById = async (req, res, next) => {
  try {
    const usuario = await UsuarioModel.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json({ data: usuario });
  } catch (err) {
    next(err);
  }
};

// GET /api/usuarios/:id/perfil
exports.getPerfil = async (req, res, next) => {
  try {
    const usuario = await UsuarioModel.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });

    const perfil = await UsuarioModel.getPerfil(req.params.id);
    res.json({ data: { usuario, ...perfil } });
  } catch (err) {
    next(err);
  }
};

// POST /api/usuarios
exports.create = async (req, res, next) => {
  try {
    const { nombre, cargo, proceso, grupo_asignado, area, correo } = req.body;
    if (!nombre || !cargo || !proceso || !grupo_asignado || !area || !correo) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, cargo, proceso, grupo_asignado, area, correo.' });
    }
    const nuevo = await UsuarioModel.create(req.body);
    res.status(201).json({ data: nuevo, message: 'Usuario creado exitosamente.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un usuario con ese correo.' });
    }
    next(err);
  }
};

// PUT /api/usuarios/:id
exports.update = async (req, res, next) => {
  try {
    const existe = await UsuarioModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Usuario no encontrado.' });

    const actualizado = await UsuarioModel.update(req.params.id, req.body);
    res.json({ data: actualizado, message: 'Usuario actualizado.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un usuario con ese correo.' });
    }
    next(err);
  }
};

// DELETE /api/usuarios/:id
exports.remove = async (req, res, next) => {
  try {
    const existe = await UsuarioModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Usuario no encontrado.' });

    await UsuarioModel.delete(req.params.id);
    res.json({ message: 'Usuario eliminado.' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'No se puede eliminar: el usuario tiene asignaciones registradas.' });
    }
    next(err);
  }
};
