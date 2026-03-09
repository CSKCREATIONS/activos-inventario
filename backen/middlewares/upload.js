const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

require('dotenv').config();

const uploadsDir = path.join(__dirname, '..', process.env.UPLOADS_DIR || 'uploads');

// Crear directorio uploads si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${ext}. Permitidos: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  },
});

// Multer v2: renombrar archivo tras guardarlo para preservar extensión
const originalSingle = upload.single.bind(upload);
upload.single = (field) => async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      originalSingle(field)(req, res, (err) => (err ? reject(err) : resolve()));
    });
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const newPath = `${req.file.path}${ext}`;
      fs.renameSync(req.file.path, newPath);
      req.file.path     = newPath;
      req.file.filename = path.basename(newPath);
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = upload;
