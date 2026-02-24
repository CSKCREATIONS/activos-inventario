/**
 * Formatea una fecha Date o string a YYYY-MM-DD.
 * @param {Date|string} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Convierte un valor a boolean teniendo en cuenta strings '1'/'0'/'true'/'false'.
 * @param {*} value
 * @returns {boolean}
 */
function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  return false;
}

/**
 * Elimina las claves con valor undefined de un objeto.
 * @param {object} obj
 * @returns {object}
 */
function cleanObject(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

module.exports = { formatDate, toBoolean, cleanObject };
