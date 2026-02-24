const DocumentoModel = require('../models/Documento');
const path = require('path');
const fs = require('fs');

// GET /api/documentos
exports.getAll = async (req, res, next) => {
  try {
    const { busqueda = '', tipo = '', equipo_id = '', usuario_id = '' } = req.query;
    const documentos = await DocumentoModel.findAll({ busqueda, tipo, equipo_id, usuario_id });
    res.json({ data: documentos, total: documentos.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/documentos/:id
exports.getById = async (req, res, next) => {
  try {
    const doc = await DocumentoModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento no encontrado.' });
    res.json({ data: doc });
  } catch (err) {
    next(err);
  }
};

// POST /api/documentos  (con o sin archivo adjunto via multer)
exports.create = async (req, res, next) => {
  try {
    const { nombre, tipo } = req.body;
    if (!nombre || !tipo) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, tipo.' });
    }

    // Si viene archivo subido por multer, usar su ruta
    let url = req.body.url || null;
    if (req.file) {
      url = `/uploads/${req.file.filename}`;
    }
    if (!url) return res.status(400).json({ message: 'Se requiere una URL o un archivo adjunto.' });

    const nuevo = await DocumentoModel.create({ ...req.body, url });
    res.status(201).json({ data: nuevo, message: 'Documento registrado exitosamente.' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/documentos/:id
exports.update = async (req, res, next) => {
  try {
    const existe = await DocumentoModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Documento no encontrado.' });

    let data = { ...req.body };
    if (req.file) data.url = `/uploads/${req.file.filename}`;

    const actualizado = await DocumentoModel.update(req.params.id, data);
    res.json({ data: actualizado, message: 'Documento actualizado.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/documentos/:id
exports.remove = async (req, res, next) => {
  try {
    const existe = await DocumentoModel.findById(req.params.id);
    if (!existe) return res.status(404).json({ message: 'Documento no encontrado.' });

    await DocumentoModel.delete(req.params.id);
    res.json({ message: 'Documento eliminado.' });
  } catch (err) {
    next(err);
  }
};
