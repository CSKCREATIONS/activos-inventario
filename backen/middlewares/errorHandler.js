// Middleware global de manejo de errores
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  console.error('[ERROR]', err.message);

  // Errores de MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Registro duplicado.', detail: err.message });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Referencia inválida: el registro relacionado no existe.' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ message: 'No se puede eliminar: existen registros relacionados.' });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Error interno del servidor.',
  });
};
