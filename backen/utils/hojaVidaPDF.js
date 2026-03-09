/**
 * Generador de "Hoja de Vida de Equipos" en PDF usando pdfkit
 * Formato: F-TC-002 | Versión 5
 */

const PDFDocument = require('pdfkit');

// ─── Colores ─────────────────────────────────────────────────────────────────
const COLOR_HEADER_BG  = '#1E3A5F'; // azul oscuro cabecera
const COLOR_SEC_BG     = '#D9E1F2'; // azul claro sección
const COLOR_ROW_ALT    = '#F2F6FC'; // fila alterna
const COLOR_BORDER     = '#8EA9C1';
const COLOR_WHITE      = '#FFFFFF';
const COLOR_BLACK      = '#000000';
const COLOR_LABEL_BG   = '#BDD7EE'; // azul medio etiquetas

// ─── Utilidades ──────────────────────────────────────────────────────────────
/**
 * Dibuja un recuadro con fondo optativo, sin desbordamiento.
 */
function rect(doc, x, y, w, h, { fill = null, stroke = true } = {}) {
  if (fill) { doc.save().rect(x, y, w, h).fill(fill).restore(); }
  if (stroke) { doc.save().rect(x, y, w, h).stroke(COLOR_BORDER).restore(); }
}

/**
 * Texto centrado en una celda (x, y, w, h).
 */
function cellText(doc, text, x, y, w, h, {
  fontSize = 7, bold = false, color = COLOR_BLACK, align = 'center'
} = {}) {
  doc.save()
    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(fontSize)
    .fillColor(color)
    .text(String(text ?? ''), x + 2, y + (h / 2) - (fontSize / 2), {
      width: w - 4, align, lineBreak: false, ellipsis: true,
    })
    .restore();
}

/**
 * Cabecera de sección (fondo COLOR_SEC_BG, texto negrita).
 */
function sectionHeader(doc, title, x, y, w, h = 14) {
  rect(doc, x, y, w, h, { fill: COLOR_SEC_BG });
  cellText(doc, title, x, y, w, h, { bold: true, fontSize: 8 });
  return y + h;
}

/**
 * Fila de datos clave/valor con etiqueta en color.
 */
function dataRow(doc, label, value, x, y, labelW, totalW, h = 14, altRow = false) {
  if (altRow) rect(doc, x, y, totalW, h, { fill: COLOR_ROW_ALT, stroke: false });
  rect(doc, x, y, labelW, h, { fill: COLOR_LABEL_BG });
  rect(doc, x, y, totalW, h);
  cellText(doc, label, x, y, labelW, h, { bold: true, fontSize: 7 });
  cellText(doc, value, x + labelW, y, totalW - labelW, h, { align: 'left' });
  return y + h;
}

// ─── Función principal ────────────────────────────────────────────────────────
/**
 * @param {object} equipo   Datos del equipo
 * @param {Array}  historial Historial de asignaciones [{usuario_nombre, cargo, ubicacion?, fecha_asignacion}]
 * @returns {Buffer}         Buffer del PDF generado
 */
function generarHojaVidaPDF(equipo, historial = []) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
      compress: true,
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW = doc.page.width - 72; // ancho útil
    const X  = 36;                  // margen izquierdo
    let   Y  = 36;                  // posición vertical actual

    // ── 1. CABECERA ──────────────────────────────────────────────────────────
    const logoW   = 80;
    const metaW   = 130;
    const titleW  = PW - logoW - metaW;

    // Logo (recuadro vacío si no hay logo)
    rect(doc, X, Y, logoW, 50, { fill: COLOR_WHITE });
    doc.save()
      .font('Helvetica-Bold').fontSize(7).fillColor(COLOR_HEADER_BG)
      .text('EMPRESA', X + 2, Y + 18, { width: logoW - 4, align: 'center' })
      .restore();

    // Título central
    rect(doc, X + logoW, Y, titleW, 50, { fill: COLOR_HEADER_BG });
    doc.save()
      .font('Helvetica-Bold').fontSize(13).fillColor(COLOR_WHITE)
      .text('HOJA DE VIDA DE EQUIPOS', X + logoW + 2, Y + 18,
        { width: titleW - 4, align: 'center' })
      .restore();

    // Meta (Código/Fecha/Versión)
    const metaX = X + logoW + titleW;
    const rowH  = 50 / 3;
    const labels = [
      ['Código', 'F-TC-002'],
      ['Fecha',  formatDate(new Date())],
      ['Versión', '5'],
    ];
    labels.forEach(([k, v], i) => {
      rect(doc, metaX, Y + i * rowH, metaW, rowH, { fill: i % 2 === 0 ? COLOR_LABEL_BG : COLOR_WHITE });
      cellText(doc, `${k}:  ${v}`, metaX, Y + i * rowH, metaW, rowH, { fontSize: 7 });
    });

    Y += 50;

    // ── PLACA / FECHA ─────────────────────────────────────────────────────────
    const halfW = PW / 2;
    Y = dataRow(doc, 'PLACA', equipo.placa ?? '', X, Y, 50, halfW, 18);
    // Fecha al lado
    Y -= 18;
    dataRow(doc, 'Fecha', formatDate(equipo.fecha_registro), X + halfW, Y, 50, halfW, 18);
    Y += 18;

    // ── 1. DATOS DEL EQUIPO ───────────────────────────────────────────────────
    Y = sectionHeader(doc, '1. DATOS DEL EQUIPO', X, Y, PW);

    // Fila Marca + Tipo checkboxes
    const checkboxTypes = [
      { label: 'PORTÁTIL', match: ['Laptop'] },
      { label: 'TORRE',    match: ['Desktop'] },
      { label: 'OTROS',    match: [] },
      { label: 'ONLYONE',  match: ['All-in-one', 'Otro'] },
      { label: 'MONITOR',  match: ['Monitor'] },
    ];

    const marcaW = 160;
    rect(doc, X, Y, marcaW, 16, { fill: COLOR_LABEL_BG });
    cellText(doc, 'Marca', X, Y, 50, 16, { bold: true });
    rect(doc, X, Y, PW, 16);
    cellText(doc, equipo.marca ?? '', X + 50, Y, marcaW - 50, 16, { align: 'left' });

    // Tipo label
    const tipoLabelW = 30;
    const tipoX = X + marcaW;
    rect(doc, tipoX, Y, tipoLabelW, 16, { fill: COLOR_LABEL_BG });
    cellText(doc, 'Tipo:', tipoX, Y, tipoLabelW, 16, { bold: true });

    // Checkboxes
    const cbW = (PW - marcaW - tipoLabelW) / checkboxTypes.length;
    checkboxTypes.forEach((cb, i) => {
      const cx = tipoX + tipoLabelW + i * cbW;
      rect(doc, cx, Y, cbW, 16);
      const checked = cb.match.includes(equipo.tipo_equipo);
      // Checkbox box
      const bx = cx + 4; const by = Y + 4;
      doc.save().rect(bx, by, 8, 8).stroke(COLOR_BORDER).restore();
      if (checked) {
        doc.save().font('Helvetica-Bold').fontSize(9).fillColor('#1E3A5F')
          .text('✓', bx, by - 1, { width: 8, align: 'center' }).restore();
      }
      cellText(doc, cb.label, cx + 14, Y, cbW - 16, 16, { fontSize: 6, align: 'left' });
    });
    Y += 16;

    // ── 2. CONFIGURACION DE HARDWARE ─────────────────────────────────────────
    Y = sectionHeader(doc, '2. CONFIGURACIÓN DE HARDWARE', X, Y, PW);

    const hw = [
      ['Procesador',    equipo.procesador      ?? ''],
      ['Memoria RAM',   equipo.ram             ?? ''],
      ['SSD',           equipo.disco?.includes('SSD') || equipo.tecnologia?.includes('SSD') ? equipo.disco : ''],
      ['HDD',           equipo.disco?.includes('HDD') || (!equipo.disco?.includes('SSD')) ? equipo.disco : ''],
    ];
    const hwR = [
      ['Marca Monitor', equipo.marca_monitor   ?? 'N.A'],
      ['Placa Monitor', equipo.placa_monitor   ?? 'N.A'],
      ['Nombre Equipo', equipo.nombre_equipo   ?? ''],
      ['',              ''],
    ];
    const hwLabelW = 80;
    const colW     = PW / 2;
    hw.forEach((row, i) => {
      const alt = i % 2 === 1;
      if (alt) rect(doc, X, Y, PW, 14, { fill: COLOR_ROW_ALT, stroke: false });
      rect(doc, X, Y, colW, 14, { fill: COLOR_LABEL_BG });
      rect(doc, X, Y, PW, 14);
      cellText(doc, row[0], X, Y, hwLabelW, 14, { bold: true, fontSize: 7 });
      cellText(doc, row[1], X + hwLabelW, Y, colW - hwLabelW, 14, { align: 'left' });
      // Derecha
      if (hwR[i]) {
        rect(doc, X + colW, Y, colW, 14, { fill: COLOR_LABEL_BG, stroke: false });
        rect(doc, X + colW, Y, colW, 14);
        cellText(doc, hwR[i][0], X + colW, Y, hwLabelW, 14, { bold: true });
        cellText(doc, hwR[i][1], X + colW + hwLabelW, Y, colW - hwLabelW, 14, { align: 'left' });
      }
      Y += 14;
    });

    // ── 3. SISTEMA OPERATIVO ──────────────────────────────────────────────────
    Y = sectionHeader(doc, '3. SISTEMA OPERATIVO INSTALADO', X, Y, PW);

    // Cabecera tabla
    const soDescW = PW * 0.55;
    const soLicW  = PW - soDescW;
    rect(doc, X, Y, soDescW, 14, { fill: COLOR_LABEL_BG });
    rect(doc, X + soDescW, Y, soLicW, 14, { fill: COLOR_LABEL_BG });
    cellText(doc, 'Descripción', X, Y, soDescW, 14, { bold: true });
    cellText(doc, 'Licenciamiento', X + soDescW, Y, soLicW, 14, { bold: true });
    Y += 14;

    const soRows = [
      [equipo.sistema_operativo ? `${equipo.sistema_operativo} ${equipo.version_so ?? ''}`.trim() : '',
       equipo.licenciamiento_so ?? ''],
      ['OFFICE HOGAR Y EMPRESAS 2016', equipo.licenciamiento_office ?? ''],
    ];
    soRows.forEach((row, i) => {
      if (i % 2 === 1) rect(doc, X, Y, PW, 14, { fill: COLOR_ROW_ALT, stroke: false });
      rect(doc, X, Y, PW, 14);
      cellText(doc, row[0], X + 2, Y, soDescW - 2, 14, { align: 'left' });
      cellText(doc, row[1], X + soDescW + 2, Y, soLicW - 2, 14, { align: 'left' });
      Y += 14;
    });

    // ── 4. ASIGNACION Y REASIGNACION ─────────────────────────────────────────
    Y = sectionHeader(doc, '4. ASIGNACION Y REASIGNACION', X, Y, PW);

    const aW = [PW * 0.3, PW * 0.28, PW * 0.22, PW * 0.2];
    const aHeaders = ['Usuario Responsable', 'Cargo', 'Ubicacion equipo', 'Fecha'];
    // Cabecera tabla asignaciones
    let cx2 = X;
    aHeaders.forEach((h, i) => {
      rect(doc, cx2, Y, aW[i], 14, { fill: COLOR_LABEL_BG });
      cellText(doc, h, cx2, Y, aW[i], 14, { bold: true, fontSize: 7 });
      cx2 += aW[i];
    });
    Y += 14;

    const asigRows = historial.length > 0 ? historial.slice(0, 5) : [{}];
    asigRows.forEach((row, i) => {
      if (i % 2 === 1) rect(doc, X, Y, PW, 14, { fill: COLOR_ROW_ALT, stroke: false });
      rect(doc, X, Y, PW, 14);
      cx2 = X;
      const vals = [
        row.usuario_nombre ?? '',
        row.cargo          ?? '',
        row.ubicacion      ?? row.area ?? '',
        row.fecha_asignacion ? formatDate(row.fecha_asignacion) : '',
      ];
      vals.forEach((v, j) => {
        cellText(doc, v, cx2 + 2, Y, aW[j] - 2, 14, { align: 'left', fontSize: 7 });
        cx2 += aW[j];
      });
      Y += 14;
    });
    // Filas vacías para completar
    const totalAsigRows = 6;
    for (let i = asigRows.length; i < totalAsigRows; i++) {
      if (i % 2 === 1) rect(doc, X, Y, PW, 14, { fill: COLOR_ROW_ALT, stroke: false });
      rect(doc, X, Y, PW, 14);
      Y += 14;
    }

    // ── 5. MANTENIMIENTOS ────────────────────────────────────────────────────
    Y = sectionHeader(doc, '5. MANTENIMIENTOS', X, Y, PW);

    // Cabecera
    const mW = [PW * 0.25, PW * 0.25, PW * 0.5];
    const mHeaders = ['Fecha realización', 'Realizado por', 'Tipo'];
    cx2 = X;
    mHeaders.forEach((h, i) => {
      rect(doc, cx2, Y, mW[i], 14, { fill: COLOR_LABEL_BG });
      cellText(doc, h, cx2, Y, mW[i], 14, { bold: true, fontSize: 7 });
      cx2 += mW[i];
    });
    Y += 14;

    // Tipo sub-cabecera (Mantenimiento → PREVENTIVO / CORRECTIVO)
    const tipoSubX = X + mW[0] + mW[1];
    const halfMW   = mW[2] / 2;
    rect(doc, tipoSubX,          Y - 14, halfMW, 14, { fill: COLOR_LABEL_BG });
    rect(doc, tipoSubX + halfMW, Y - 14, halfMW, 14, { fill: COLOR_LABEL_BG });
    cellText(doc, 'PREVENTIVO',  tipoSubX,          Y - 14, halfMW, 14, { bold: true, fontSize: 7 });
    cellText(doc, 'CORRECTIVO',  tipoSubX + halfMW, Y - 14, halfMW, 14, { bold: true, fontSize: 7 });

    for (let i = 0; i < 5; i++) {
      if (i % 2 === 1) rect(doc, X, Y, PW, 14, { fill: COLOR_ROW_ALT, stroke: false });
      rect(doc, X, Y, PW, 14);
      Y += 14;
    }

    // ── Pie de página ─────────────────────────────────────────────────────────
    doc.save()
      .font('Helvetica').fontSize(6).fillColor('#888888')
      .text(
        `Documento generado automáticamente el ${formatDate(new Date())} — Sistema de Inventario`,
        X, Y + 6, { width: PW, align: 'center' }
      )
      .restore();

    doc.end();
  });
}

// Formatea fecha "YYYY-MM-DD" o Date → "DD/MM/YYYY"
function formatDate(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')) : d;
  if (isNaN(date)) return String(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

module.exports = { generarHojaVidaPDF };
