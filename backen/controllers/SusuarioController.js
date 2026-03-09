// ...existing code...
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { createUsuarioSistema } = require('../models/Susuario');

async function crear(req, res, next) {
  try {
    const { username, password, rol = 'gestor', nombre = null, email = null, usuario_id = null } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'username y password son requeridos' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    await createUsuarioSistema({ id, username, password_hash: hash, rol, nombre, email, usuario_id });

    return res.status(201).json({ id, username, rol, nombre, email });
  } catch (err) {
    next(err);
  }
}

module.exports = { crear };
// ...existing code...