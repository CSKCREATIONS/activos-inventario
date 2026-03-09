require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const { testConnection } = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');

// ─── Rutas ────────────────────────────────────────────────
const usuariosRouter      = require('./routes/usuarios');
const equiposRouter       = require('./routes/equipos');
const asignacionesRouter  = require('./routes/asignaciones');
const accesoriosRouter    = require('./routes/accesorios');
const documentosRouter    = require('./routes/documentos');
const dashboardRouter     = require('./routes/dashboard');
const usuariosSistemaRouter = require('./routes/Susuario');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middlewares globales ─────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos subidos estáticamente
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOADS_DIR || 'uploads')));

// ─── Rutas API ────────────────────────────────────────────
app.use('/api/usuarios',     usuariosRouter);
app.use('/api/equipos',      equiposRouter);
app.use('/api/asignaciones', asignacionesRouter);
app.use('/api/accesorios',   accesoriosRouter);
app.use('/api/documentos',   documentosRouter);
app.use('/api/dashboard',    dashboardRouter);
app.use('/api/Susuarios', usuariosSistemaRouter);
// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});

// Error handler global
app.use(errorHandler);

// ─── Iniciar servidor ─────────────────────────────────────
async function main() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}/api`);
  });
}

main();
