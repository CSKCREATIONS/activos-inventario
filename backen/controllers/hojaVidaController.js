/**
 * Controller: Generación de Hoja de Vida de Equipos en PDF
 * Ruta: GET /api/equipos/:id/hoja-vida-pdf
 *
 * Genera el PDF, lo guarda en /uploads y registra el documento en la BD.
 */

const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const EquipoModel    = require('../models/Equipo');
const DocumentoModel = require('../models/Documento');
const { generarHojaVidaPDF } = require('../utils/hojaVidaPDF');

const TIPOS_CON_HV = ['Laptop', 'Desktop', 'All-in-one'];

// GET /api/equipos/:id/hoja-vida-pdf
exports.generarHojaVida = async (req, res, next) => {
  try {
    const equipo = await EquipoModel.findById(req.params.id);
    if (!equipo) return res.status(404).json({ message: 'Equipo no encontrado.' });

    // Obtener historial de asignaciones con datos del responsable
    const historial = await EquipoModel.getHistorial(req.params.id);

    // Generar buffer del PDF
    const pdfBuffer = await generarHojaVidaPDF(equipo, historial);

    // Nombre del archivo
    const filename = `hoja_vida_${equipo.placa}.pdf`;
    const uploadsDir = path.join(__dirname, '..', process.env.UPLOADS_DIR || 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `/uploads/${filename}`;

    // Registrar o actualizar documento en BD
    const docsExistentes = await DocumentoModel.findAll({ tipo: 'Hoja de vida', equipo_id: equipo.id });
    if (docsExistentes.length === 0) {
      await DocumentoModel.create({
        nombre:      `Hoja de vida ${equipo.placa}`,
        tipo:        'Hoja de vida',
        equipo_id:   equipo.id,
        url:         fileUrl,
        fecha_carga: new Date().toISOString().split('T')[0],
        cargado_por: 'Sistema',
        version:     1,
      });
    } else {
      // Incrementa versión al re-generar
      await DocumentoModel.update(docsExistentes[0].id, {
        url:        fileUrl,
        fecha_carga: new Date().toISOString().split('T')[0],
        version:    (docsExistentes[0].version ?? 1) + 1,
      });
    }

    // Devolver el PDF como descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
