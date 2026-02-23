// ============================================================================
// VIEW: Página de Administración del sistema ITAM
// ----------------------------------------------------------------------------
// Esta página contiene 4 secciones (tabs):
//   1. General      → Configuración del sistema (nombre, empresa, seguridad, backups)
//   2. Usuarios     → CRUD de cuentas de acceso al sistema (no son los usuarios de inventario)
//   3. Roles        → Visualización de permisos por rol (Administrador, Supervisor, Técnico, Solo lectura)
//   4. Log          → Registro de auditoría (quién hizo qué y cuándo)
//
// PATRÓN MVC: Este archivo es solo la VISTA.
//   - No tiene lógica de negocio real (sería un controller separado en producción).
//   - Los datos son locales (useState) porque aún no hay backend conectado.
//   - Para conectar con un backend: reemplazar los useState por llamadas a una API
//     en un archivo src/controllers/useAdminController.ts
// ============================================================================

import { useState, type ReactElement } from 'react';
// ── Íconos de lucide-react ────────────────────────────────────────────────────
// Settings      → tab General, ícono de accesorios en tabla de permisos
// Users         → tab Usuarios, estadística rápida
// ShieldCheck   → tab Roles, estadística rápida
// ClipboardList → tab Log, buscador del log
// Plus          → botón "Nuevo usuario"
// Pencil        → botón editar fila de usuario
// Trash2        → botón eliminar fila de usuario
// CheckCircle   → estado activo, permiso concedido, config guardada
// XCircle       → estado inactivo, permiso denegado
// Save          → botón "Guardar cambios" en tab General
// Globe         → título de la card "Información del sistema"
// Database      → estadística backup, título card "Copias de seguridad"
// Lock          → título card "Seguridad y sesión"
// Eye / EyeOff  → toggle mostrar/ocultar contraseña en modal de usuario
// Download      → botón descargar backup / exportar log
// Upload        → botón restaurar backup
// RefreshCw     → botón hacer backup ahora, ícono Asignaciones en permisos
// AlertTriangle → alerta en modal eliminar, advertencia en log, nota de permisos
// Info          → ícono tipo "info" en el log
// Monitor       → ícono Activos en tabla de permisos, estadística versión
// FileText      → ícono Documentos en tabla de permisos
// BarChart2     → ícono Reportes en tabla de permisos
// UserCog       → decoración en la card de detalle de rol
import {
  Settings, Users, ShieldCheck, ClipboardList,
  Plus, Pencil, Trash2, CheckCircle, XCircle,
  Save, Globe, Database, Lock, Eye, EyeOff,
  Download, Upload, RefreshCw, AlertTriangle, Info,
  Monitor, FileText, BarChart2, UserCog,
} from 'lucide-react';

// ── Componentes UI reutilizables del proyecto ─────────────────────────────────
// Todos viven en src/views/components/ui/index.tsx
// Card       → caja blanca con borde y sombra
// Button     → botón con variantes: primary, secondary, danger, ghost, outline
// Modal      → ventana emergente con overlay oscuro
// Field      → input con label y mensaje de error
// Badge      → etiqueta de color (ej: rol, módulo)
// Table/Th/Td → tabla estilizada con clases Tailwind predefinidas
// EmptyState → mensaje y ícono cuando no hay resultados
import { Card, Button, Modal, Field, Badge, Table, Th, Td, EmptyState } from '../../components/ui/index';

// clsx: combina clases CSS condicionalmente
// Ejemplo: clsx('clase-base', condicion && 'clase-extra')
import clsx from 'clsx';

// ============================================================================
// TIPOS LOCALES
// Estas interfaces describen la forma de los datos de esta página.
// Si conectas un backend, estos tipos deben coincidir con los que devuelve la API.
// ============================================================================

// Roles disponibles en el sistema — solo estos 4 valores son válidos
// Para agregar un nuevo rol: agregar aquí y actualizar ROLES_DEF y ROL_BADGE más abajo
type Rol = 'Administrador' | 'Supervisor' | 'Técnico' | 'Solo lectura';

// Cuenta de acceso al sistema (distinto a Usuario de inventario en src/models/types)
// Estos son los operadores que pueden iniciar sesión en la aplicación
interface SistemaUsuario {
  id: string;            // identificador único (string para compatibilidad con APIs REST)
  nombre: string;        // nombre completo del operador
  correo: string;        // correo que usa para iniciar sesión
  rol: Rol;              // determina qué puede ver y hacer en el sistema
  activo: boolean;       // si es false, el usuario no puede iniciar sesión
  ultimo_acceso: string; // timestamp del último login (solo informativo)
}

// Permisos de un módulo para un rol específico.
// Hay una entrada de PermisoModulo por cada módulo del sistema.
// Para agregar un nuevo tipo de permiso: añadir la propiedad aquí y actualizar
// la tabla en el JSX (cabeceras) y los valores en ROLES_DEF.
interface PermisoModulo {
  modulo: string;    // nombre del módulo (Activos, Usuarios, etc.)
  ver: boolean;      // puede ver la lista/contenido del módulo
  crear: boolean;    // puede crear nuevos registros
  editar: boolean;   // puede modificar registros existentes
  eliminar: boolean; // puede borrar registros
  exportar: boolean; // puede descargar CSVs o reportes
}

// Definición completa de un rol: nombre, descripción y todos sus permisos.
// Para agregar un nuevo rol: añadir un objeto aquí, el valor en type Rol y en ROL_BADGE.
interface RolDefinicion {
  rol: Rol;                  // nombre del rol (coincide con el type Rol)
  descripcion: string;       // texto explicativo visible en la UI
  color: string;             // color del badge (red, orange, blue, slate)
  permisos: PermisoModulo[]; // un ítem por cada módulo del sistema
}

// Una entrada del registro de auditoría.
// En producción esto vendría de una tabla "audit_log" en la base de datos.
// Para agregar campos extra al log: agregar la propiedad aquí y en LOG_ENTRIES.
interface LogEntry {
  id: string;      // identificador único de la entrada
  fecha: string;   // formato: 'YYYY-MM-DD HH:mm'
  usuario: string; // nombre del usuario que realizó la acción
  accion: string;  // descripción corta de la acción (ej: 'Creó equipo')
  modulo: string;  // módulo donde ocurrió (Activos, Sistema, Documentos…)
  detalle: string; // detalle adicional (ej: placa del equipo, IP de acceso)
  tipo: 'info' | 'warning' | 'error' | 'success'; // determina el color de la fila
}

// ── Mock Data ────────────────────────────────────────────────────────────────// ⚠️ En producción: reemplazar con llamadas a la API en el controller.
// Lista inicial de usuarios del sistema.
// Para agregar/quitar usuarios de prueba: editar este arreglo.
const SISTEMA_USUARIOS_INIT: SistemaUsuario[] = [
  { id: '1', nombre: 'Carlos Ramírez', correo: 'admin@empresa.com',       rol: 'Administrador', activo: true,  ultimo_acceso: '2026-02-23 09:14' },
  { id: '2', nombre: 'Laura Gómez',    correo: 'supervisor@empresa.com',  rol: 'Supervisor',    activo: true,  ultimo_acceso: '2026-02-22 15:30' },
  { id: '3', nombre: 'Pedro Torres',   correo: 'tecnico1@empresa.com',    rol: 'Técnico',       activo: true,  ultimo_acceso: '2026-02-21 11:05' },
  { id: '4', nombre: 'Ana Ruiz',       correo: 'tecnico2@empresa.com',    rol: 'Técnico',       activo: false, ultimo_acceso: '2026-01-15 08:22' },
  { id: '5', nombre: 'Juan Méndez',    correo: 'lectura@empresa.com',     rol: 'Solo lectura',  activo: true,  ultimo_acceso: '2026-02-20 16:48' },
];

// Módulos del sistema — deben coincidir con las rutas en src/routes/index.tsx.
// Si agregas un módulo nuevo al sistema, agregálo también aquí para que aparezca
// en la tabla de permisos de la tab Roles.
const MODULOS = ['Activos', 'Usuarios', 'Asignaciones', 'Accesorios', 'Documentos', 'Reportes'];

// Definición de los 4 roles con sus permisos por módulo.
// Para cambiar permisos de un rol: editar los valores true/false.
// Para agregar un rol nuevo: agregar un objeto aquí, actualizar type Rol y ROL_BADGE.
const ROLES_DEF: RolDefinicion[] = [
  {
    // Administrador: acceso total — todos los permisos en todos los módulos
    rol: 'Administrador', color: 'red',
    descripcion: 'Acceso total al sistema. Puede gestionar usuarios, roles y configuración.',
    permisos: MODULOS.map((m) => ({ modulo: m, ver: true, crear: true, editar: true, eliminar: true, exportar: true })),
  },
  {
    rol: 'Supervisor', color: 'orange',
    descripcion: 'Puede ver y editar todo, pero no eliminar ni gestionar cuentas de sistema.',
    permisos: MODULOS.map((m) => ({ modulo: m, ver: true, crear: true, editar: true, eliminar: false, exportar: true })),
  },
  {
    // Técnico: acceso operativo limitado — solo módulos de trabajo diario
    rol: 'Técnico', color: 'blue',
    descripcion: 'Gestiona activos y asignaciones. No puede eliminar ni exportar.',
    permisos: MODULOS.map((m) => ({
      modulo: m,
      ver: true, // puede ver todos los módulos
      // solo puede crear en módulos operativos (no en Usuarios ni Reportes)
      crear: ['Activos', 'Asignaciones', 'Accesorios', 'Documentos'].includes(m),
      // solo puede editar activos, asignaciones y accesorios
      editar: ['Activos', 'Asignaciones', 'Accesorios'].includes(m),
      eliminar: false, // nunca puede eliminar
      exportar: false, // nunca puede exportar
    })),
  },
  {
    // Solo lectura: puede ver todo, sin modificar nada
    rol: 'Solo lectura', color: 'slate',
    descripcion: 'Solo puede visualizar información. Sin permisos de escritura.',
    permisos: MODULOS.map((m) => ({ modulo: m, ver: true, crear: false, editar: false, eliminar: false, exportar: false })),
  },
];

// Registros de auditoría de demostración.
// En producción estos vendrían de un endpoint como GET /api/audit-log.
// Para agregar más eventos de prueba: añadir objetos a este arreglo.
const LOG_ENTRIES: LogEntry[] = [
  { id: '1',  fecha: '2026-02-23 09:14', usuario: 'Carlos Ramírez', accion: 'Inicio de sesión',          modulo: 'Sistema',     detalle: 'Acceso desde 192.168.1.10',              tipo: 'success' },
  { id: '2',  fecha: '2026-02-23 09:20', usuario: 'Carlos Ramírez', accion: 'Creó equipo',                modulo: 'Activos',     detalle: 'Placa EAC000700 — Laptop Dell',           tipo: 'info'    },
  { id: '3',  fecha: '2026-02-23 09:45', usuario: 'Laura Gómez',    accion: 'Inicio de sesión',           modulo: 'Sistema',     detalle: 'Acceso desde 192.168.1.22',              tipo: 'success' },
  { id: '4',  fecha: '2026-02-23 10:02', usuario: 'Laura Gómez',    accion: 'Asignó equipo',              modulo: 'Asignaciones', detalle: 'EAC000037 → María García',              tipo: 'info'    },
  { id: '5',  fecha: '2026-02-23 10:30', usuario: 'Pedro Torres',   accion: 'Editó equipo',               modulo: 'Activos',     detalle: 'EAC000100 estado → En revisión',         tipo: 'info'    },
  { id: '6',  fecha: '2026-02-23 11:00', usuario: 'Sistema',        accion: 'Copia de seguridad',         modulo: 'Sistema',     detalle: 'Backup automático completado (2.4 MB)',   tipo: 'success' },
  { id: '7',  fecha: '2026-02-22 15:30', usuario: 'Carlos Ramírez', accion: 'Eliminó documento',          modulo: 'Documentos',  detalle: 'Acta-001.pdf v1 eliminado',              tipo: 'warning' },
  { id: '8',  fecha: '2026-02-22 16:10', usuario: 'Ana Ruiz',       accion: 'Intento de acceso fallido',  modulo: 'Sistema',     detalle: 'Contraseña incorrecta (3 intentos)',      tipo: 'error'   },
  { id: '9',  fecha: '2026-02-21 11:05', usuario: 'Pedro Torres',   accion: 'Subió documento',            modulo: 'Documentos',  detalle: 'Hoja-vida-EAC000500.pdf cargado',        tipo: 'info'    },
  { id: '10', fecha: '2026-02-20 16:48', usuario: 'Juan Méndez',    accion: 'Exportó reporte',            modulo: 'Reportes',    detalle: 'Inventario completo — 10 registros',     tipo: 'info'    },
];

// Mapeo de rol → color del Badge.
// Para cambiar el color de un rol: editar el valor (opciones: red, orange, blue, gray, green, purple, indigo).
// Para agregar un rol: añadir una entrada aquí.
const ROL_BADGE: Record<Rol, string> = {
  'Administrador': 'red',
  'Supervisor':    'orange',
  'Técnico':       'blue',
  'Solo lectura':  'gray',
};

// Mapeo de tipo de log → ícono con color.
// Para cambiar el ícono o color de un tipo: editar aquí.
// Para agregar un nuevo tipo: agregar entrada aquí y en el type de LogEntry.tipo.
const LOG_ICON: Record<string, ReactElement> = {
  success: <CheckCircle   size={14} className="text-emerald-500" />, // acción exitosa (verde)
  info:    <Info          size={14} className="text-blue-500"    />, // información neutral (azul)
  warning: <AlertTriangle size={14} className="text-amber-500"   />, // advertencia (amarillo)
  error:   <XCircle       size={14} className="text-red-500"     />, // error o fallo (rojo)
};

// ── Tabs ─────────────────────────────────────────────────────────────────────
// Cada tab tiene: id (clave interna), label (texto visible) e ícono.
// Para agregar una pestaña nueva:
//   1. Agregar un objeto a este arreglo con id, label e icon
//   2. Agregar el bloque { tab === 'nueva_id' && ( ... ) } en el JSX del return
//   3. Agregar el nuevo TabId al union type (se infiere automáticamente con "as const")
const TABS = [
  { id: 'general',  label: 'General',              icon: <Settings      size={16} /> },
  { id: 'usuarios', label: 'Usuarios del sistema',  icon: <Users         size={16} /> },
  { id: 'roles',    label: 'Roles y permisos',      icon: <ShieldCheck   size={16} /> },
  { id: 'log',      label: 'Registro de actividad', icon: <ClipboardList size={16} /> },
] as const; // "as const" hace que TypeScript infiera el tipo exacto de cada id

// TabId es el tipo de los ids válidos: 'general' | 'usuarios' | 'roles' | 'log'
type TabId = typeof TABS[number]['id'];

// ── Configuración general (estado local) ─────────────────────────────────────
// Campos del formulario de la tab "General".
// Para agregar un nuevo campo:
//   1. Agregar la propiedad aquí con su tipo
//   2. Agregar el valor inicial en CONFIG_INIT
//   3. Agregar el <input> correspondiente en el JSX de la tab General
interface ConfigGeneral {
  nombre_sistema:    string;  // nombre que aparece en el header y sidebar
  empresa:           string;  // razón social de la empresa
  ciudad:            string;  // ciudad y país
  correo_soporte:    string;  // correo que recibe solicitudes de soporte
  zona_horaria:      string;  // zona horaria para los timestamps
  idioma:            string;  // idioma de la interfaz
  backup_automatico: boolean; // activa/desactiva backups programados
  backup_frecuencia: string;  // frecuencia del backup ('Diario', 'Semanal', etc.)
  sesion_timeout:    string;  // tiempo antes de cerrar sesión por inactividad
  doble_factor:      boolean; // requiere OTP al iniciar sesión (2FA)
}

// Valores por defecto del formulario de configuración.
// Cuando el usuario no ha guardado nada, se muestran estos valores.
const CONFIG_INIT: ConfigGeneral = {
  nombre_sistema:   'ITAM System',
  empresa:          'Empresa S.A.S.',
  ciudad:           'Bogotá, Colombia',
  correo_soporte:   'soporte@empresa.com',
  zona_horaria:     'America/Bogota (UTC-5)',
  idioma:           'Español',
  backup_automatico: true,
  backup_frecuencia: 'Diario',
  sesion_timeout:   '30 minutos',
  doble_factor:     false,
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function AdministracionPage() {

  // Tab activa: controla cuál de las 4 pestañas se renderiza.
  // Para cambiar la pestaña inicial: cambiar 'general' por otro TabId.
  const [tab, setTab] = useState<TabId>('general');

  // ── Estados: tab General ──────────────────────────────────────────────
  // config: valores actuales del formulario. Leer: config.nombre_sistema
  //   Actualizar: setConfig((c) => ({ ...c, campo: valor }))
  const [config, setConfig] = useState<ConfigGeneral>(CONFIG_INIT);
  // configGuardada: muestra mensaje "✅ Configuración guardada" durante 2.5s
  const [configGuardada, setConfigGuardada] = useState(false);

  // ── Estados: tab Usuarios ───────────────────────────────────────────
  // Lista de cuentas del sistema en memoria.
  // En producción: reemplazar con fetch a la API y actualizar tras cada CRUD.
  const [usuarios, setUsuarios] = useState<SistemaUsuario[]>(SISTEMA_USUARIOS_INIT);
  // modalUsuario: true = el modal crear/editar está visible
  const [modalUsuario, setModalUsuario] = useState(false);
  // modalEliminar: guarda el usuario que se va a eliminar (null = modal cerrado)
  const [modalEliminar, setModalEliminar] = useState<SistemaUsuario | null>(null);
  // editUsuario: datos enlazados al formulario del modal.
  //   Partial porque al crear empiezan vacíos. Incluye password (solo al crear).
  const [editUsuario, setEditUsuario] = useState<Partial<SistemaUsuario> & { password?: string }>({});
  // modoEdicionU: false = crear | true = editar. Afecta título del modal y campo password.
  const [modoEdicionU, setModoEdicionU] = useState(false);
  // showPass: alterna visibilidad del campo contraseña (ojo abierto/cerrado)
  const [showPass, setShowPass] = useState(false);

  // ── Estado: tab Roles ──────────────────────────────────────────────────
  // Qué rol se está viendo en la tabla de permisos (columna derecha).
  // Cambia al hacer clic en cualquier botón de la lista izquierda.
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol>('Administrador');

  // ── Estados: tab Log ──────────────────────────────────────────────────
  // logFiltro: texto libre del buscador (filtra en usuario, acción, módulo y detalle)
  const [logFiltro, setLogFiltro] = useState('');
  // logTipo: filtro por tipo ('', 'success', 'info', 'warning', 'error')
  const [logTipo, setLogTipo] = useState('');

  // ── Handlers usuarios ────────────────────────────────────────────────────
  const abrirCrearU = () => {
    setEditUsuario({ activo: true, rol: 'Técnico' });
    setModoEdicionU(false);
    setShowPass(false);
    setModalUsuario(true);
  };
  const abrirEditarU = (u: SistemaUsuario) => {
    setEditUsuario({ ...u });
    setModoEdicionU(true);
    setShowPass(false);
    setModalUsuario(true);
  };
  const guardarUsuario = () => {
    if (!editUsuario.nombre || !editUsuario.correo || !editUsuario.rol) return;
    if (modoEdicionU) {
      setUsuarios((prev) => prev.map((u) => u.id === editUsuario.id ? { ...u, ...editUsuario } as SistemaUsuario : u));
    } else {
      const nuevo: SistemaUsuario = {
        id: Date.now().toString(),
        nombre: editUsuario.nombre!,
        correo: editUsuario.correo!,
        rol: editUsuario.rol!,
        activo: editUsuario.activo ?? true,
        ultimo_acceso: '—',
      };
      setUsuarios((prev) => [...prev, nuevo]);
    }
    setModalUsuario(false);
  };
  const toggleActivoU = (id: string) =>
    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, activo: !u.activo } : u));
  const confirmarEliminar = () => {
    if (modalEliminar) setUsuarios((prev) => prev.filter((u) => u.id !== modalEliminar.id));
    setModalEliminar(null);
  };

  // Guarda la configuración y muestra confirmación temporal.
  // En producción: hacer PUT /api/configuracion con el objeto config.
  const guardarConfig = () => {
    setConfigGuardada(true);
    setTimeout(() => setConfigGuardada(false), 2500); // ocultar mensaje tras 2.5s
  };

  // Log filtrado: valor derivado recalculado cuando logFiltro o logTipo cambian.
  // Filtra las entradas donde AMBAS condiciones (texto y tipo) se cumplan.
  const logFiltrado = LOG_ENTRIES.filter((e) => {
    // matchText: true si el texto aparece en cualquier campo del registro
    const matchText = logFiltro === '' || [e.usuario, e.accion, e.modulo, e.detalle].some((s) => s.toLowerCase().includes(logFiltro.toLowerCase()));
    // matchTipo: true si no hay filtro activo o si el tipo coincide exactamente
    const matchTipo = logTipo === '' || e.tipo === logTipo;
    return matchText && matchTipo;
  });

  // Definición completa del rol seleccionado (datos + permisos para la tabla).
  // El "!" indica que siempre habrá un resultado (rolSeleccionado siempre es un Rol válido).
  const rolDef = ROLES_DEF.find((r) => r.rol === rolSeleccionado)!

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ── Stats rápidas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Usuarios activos',    valor: usuarios.filter((u) => u.activo).length,   icon: <Users size={20} />,      color: 'bg-blue-50 text-blue-600'    },
          { label: 'Roles definidos',     valor: ROLES_DEF.length,                          icon: <ShieldCheck size={20} />, color: 'bg-violet-50 text-violet-600' },
          { label: 'Versión del sistema', valor: 'v1.0.0',                                  icon: <Monitor size={20} />,     color: 'bg-emerald-50 text-emerald-600'},
          { label: 'Último backup',       valor: 'Hoy 11:00',                               icon: <Database size={20} />,    color: 'bg-amber-50 text-amber-600'  },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-4">
            <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', s.color)}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-lg font-bold text-slate-800">{s.valor}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: GENERAL ══════════ */}
      {tab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Información del sistema */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={18} className="text-blue-600" />
              <h3 className="font-semibold text-slate-700">Información del sistema</h3>
            </div>
            {([ 
              { label: 'Nombre del sistema', key: 'nombre_sistema' },
              { label: 'Empresa',            key: 'empresa'        },
              { label: 'Ciudad / País',      key: 'ciudad'         },
              { label: 'Correo de soporte',  key: 'correo_soporte' },
              { label: 'Zona horaria',       key: 'zona_horaria'   },
              { label: 'Idioma',             key: 'idioma'         },
            ] as { label: string; key: keyof ConfigGeneral }[]).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={config[key] as string}
                  onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                />
              </div>
            ))}
          </Card>

          <div className="space-y-6">
            {/* Seguridad */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={18} className="text-violet-600" />
                <h3 className="font-semibold text-slate-700">Seguridad y sesión</h3>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tiempo de inactividad</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={config.sesion_timeout}
                  onChange={(e) => setConfig((c) => ({ ...c, sesion_timeout: e.target.value }))}
                >
                  {['15 minutos', '30 minutos', '1 hora', '2 horas', 'Nunca'].map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">Doble factor de autenticación</p>
                  <p className="text-xs text-slate-500">Requiere código OTP al iniciar sesión</p>
                </div>
                <button
                  onClick={() => setConfig((c) => ({ ...c, doble_factor: !c.doble_factor }))}
                  className={clsx(
                    'relative w-11 h-6 rounded-full transition-colors focus:outline-none',
                    config.doble_factor ? 'bg-blue-600' : 'bg-slate-300'
                  )}
                >
                  <span className={clsx(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    config.doble_factor ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>
            </Card>

            {/* Backups */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Database size={18} className="text-emerald-600" />
                <h3 className="font-semibold text-slate-700">Copias de seguridad</h3>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">Backup automático</p>
                  <p className="text-xs text-slate-500">Se ejecuta según la frecuencia configurada</p>
                </div>
                <button
                  onClick={() => setConfig((c) => ({ ...c, backup_automatico: !c.backup_automatico }))}
                  className={clsx(
                    'relative w-11 h-6 rounded-full transition-colors focus:outline-none',
                    config.backup_automatico ? 'bg-blue-600' : 'bg-slate-300'
                  )}
                >
                  <span className={clsx(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    config.backup_automatico ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>
              {config.backup_automatico && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Frecuencia</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={config.backup_frecuencia}
                    onChange={(e) => setConfig((c) => ({ ...c, backup_frecuencia: e.target.value }))}
                  >
                    {['Cada hora', 'Diario', 'Semanal', 'Mensual'].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" size="sm" icon={<Download size={14} />}>Descargar backup</Button>
                <Button variant="secondary" size="sm" icon={<Upload   size={14} />}>Restaurar</Button>
                <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />}>Hacer backup ahora</Button>
              </div>
            </Card>
          </div>

          {/* Botón guardar */}
          <div className="lg:col-span-2 flex justify-end gap-3">
            {configGuardada && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle size={16} /> Configuración guardada
              </span>
            )}
            <Button icon={<Save size={16} />} onClick={guardarConfig}>Guardar cambios</Button>
          </div>
        </div>
      )}

      {/* ══════════ TAB: USUARIOS DEL SISTEMA ══════════ */}
      {tab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-slate-500 flex-1">
              <strong>{usuarios.filter((u) => u.activo).length}</strong> usuarios activos de <strong>{usuarios.length}</strong> en total
            </p>
            <Button icon={<Plus size={16} />} onClick={abrirCrearU} className="w-full sm:w-auto">
              Nuevo usuario
            </Button>
          </div>

          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Usuario</Th>
                  <Th>Correo</Th>
                  <Th>Rol</Th>
                  <Th>Último acceso</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {u.nombre.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800">{u.nombre}</span>
                      </div>
                    </Td>
                    <Td className="text-slate-500 text-sm">{u.correo}</Td>
                    <Td>
                      <Badge variant={ROL_BADGE[u.rol] as any}>{u.rol}</Badge>
                    </Td>
                    <Td className="text-slate-400 text-xs">{u.ultimo_acceso}</Td>
                    <Td>
                      <button
                        onClick={() => toggleActivoU(u.id)}
                        className={clsx(
                          'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full',
                          u.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {u.activo ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEditarU(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setModalEliminar(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {/* Modal crear/editar usuario */}
          <Modal
            abierto={modalUsuario}
            onCerrar={() => setModalUsuario(false)}
            titulo={modoEdicionU ? 'Editar usuario del sistema' : 'Nuevo usuario del sistema'}
            size="sm"
          >
            <div className="space-y-4">
              <Field
                label="Nombre completo"
                value={editUsuario.nombre ?? ''}
                onChange={(e) => setEditUsuario((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Juan Pérez"
              />
              <Field
                label="Correo electrónico"
                type="email"
                value={editUsuario.correo ?? ''}
                onChange={(e) => setEditUsuario((p) => ({ ...p, correo: e.target.value }))}
                placeholder="usuario@empresa.com"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editUsuario.rol ?? 'Técnico'}
                  onChange={(e) => setEditUsuario((p) => ({ ...p, rol: e.target.value as Rol }))}
                >
                  {(['Administrador', 'Supervisor', 'Técnico', 'Solo lectura'] as Rol[]).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              {!modoEdicionU && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editUsuario.password ?? ''}
                      onChange={(e) => setEditUsuario((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activo-check"
                  checked={editUsuario.activo ?? true}
                  onChange={(e) => setEditUsuario((p) => ({ ...p, activo: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="activo-check" className="text-sm text-slate-700">Usuario activo</label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setModalUsuario(false)}>Cancelar</Button>
                <Button onClick={guardarUsuario}>Guardar</Button>
              </div>
            </div>
          </Modal>

          {/* Modal confirmar eliminar */}
          <Modal
            abierto={!!modalEliminar}
            onCerrar={() => setModalEliminar(null)}
            titulo="Eliminar usuario"
            size="sm"
          >
            <div className="space-y-4">
              <div className="flex gap-3 p-4 bg-red-50 rounded-lg">
                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  ¿Eliminar a <strong>{modalEliminar?.nombre}</strong>? Esta acción no se puede deshacer y revocará su acceso al sistema.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModalEliminar(null)}>Cancelar</Button>
                <Button variant="danger" onClick={confirmarEliminar}>Eliminar</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ══════════ TAB: ROLES Y PERMISOS ══════════ */}
      {tab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de roles */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">Roles disponibles</p>
            {ROLES_DEF.map((r) => (
              <button
                key={r.rol}
                onClick={() => setRolSeleccionado(r.rol)}
                className={clsx(
                  'w-full text-left p-4 rounded-xl border transition-all',
                  rolSeleccionado === r.rol
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800 text-sm">{r.rol}</span>
                  <Badge variant={ROL_BADGE[r.rol] as any} size="sm">{r.rol}</Badge>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{r.descripcion}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {usuarios.filter((u) => u.rol === r.rol).length} usuario(s)
                </p>
              </button>
            ))}
          </div>

          {/* Detalle de permisos */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{rolDef.rol}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{rolDef.descripcion}</p>
                </div>
                <UserCog size={28} className="text-slate-300" />
              </div>

              {/* Tabla de permisos */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Módulo</th>
                      {['Ver', 'Crear', 'Editar', 'Eliminar', 'Exportar'].map((p) => (
                        <th key={p} className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rolDef.permisos.map((p) => {
                      const ICONS: Record<string, ReactElement> = {
                        Activos:      <Monitor     size={14} className="text-blue-500"   />,
                        Usuarios:     <Users       size={14} className="text-violet-500" />,
                        Asignaciones: <RefreshCw   size={14} className="text-emerald-500"/>,
                        Accesorios:   <Settings    size={14} className="text-amber-500"  />,
                        Documentos:   <FileText    size={14} className="text-rose-500"   />,
                        Reportes:     <BarChart2   size={14} className="text-cyan-500"   />,
                      };
                      return (
                        <tr key={p.modulo} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              {ICONS[p.modulo]}
                              <span className="font-medium text-slate-700">{p.modulo}</span>
                            </div>
                          </td>
                          {[p.ver, p.crear, p.editar, p.eliminar, p.exportar].map((val, i) => (
                            <td key={i} className="text-center py-3 px-3">
                              {val
                                ? <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                                : <XCircle    size={16} className="text-slate-200 mx-auto"    />
                              }
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-lg flex gap-2 text-xs text-amber-700">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Los permisos son fijos por rol. Para ajustes personalizados, contacta al equipo de desarrollo.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════ TAB: REGISTRO DE ACTIVIDAD ══════════ */}
      {tab === 'log' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar por usuario, acción, módulo..."
                value={logFiltro}
                onChange={(e) => setLogFiltro(e.target.value)}
              />
              <ClipboardList size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <select
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={logTipo}
              onChange={(e) => setLogTipo(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="success">✅ Éxito</option>
              <option value="info">ℹ️ Información</option>
              <option value="warning">⚠️ Advertencia</option>
              <option value="error">❌ Error</option>
            </select>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} className="shrink-0">
              Exportar log
            </Button>
          </div>

          <Card>
            {logFiltrado.length === 0 ? (
              <EmptyState mensaje="No hay registros que coincidan con los filtros." icon={<ClipboardList size={40} />} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Tipo</Th>
                    <Th>Fecha y hora</Th>
                    <Th>Usuario</Th>
                    <Th>Módulo</Th>
                    <Th>Acción</Th>
                    <Th>Detalle</Th>
                  </tr>
                </thead>
                <tbody>
                  {logFiltrado.map((e) => (
                    <tr key={e.id} className={clsx(
                      'hover:bg-slate-50 transition-colors',
                      e.tipo === 'error'   && 'bg-red-50/40',
                      e.tipo === 'warning' && 'bg-amber-50/40',
                    )}>
                      <Td>
                        <div className="flex items-center justify-center w-6">
                          {LOG_ICON[e.tipo]}
                        </div>
                      </Td>
                      <Td className="text-xs text-slate-500 whitespace-nowrap">{e.fecha}</Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {e.usuario.charAt(0)}
                          </div>
                          <span className="text-sm text-slate-700 whitespace-nowrap">{e.usuario}</span>
                        </div>
                      </Td>
                      <Td>
                        <Badge variant="indigo" size="sm">{e.modulo}</Badge>
                      </Td>
                      <Td className="font-medium text-slate-700 text-sm whitespace-nowrap">{e.accion}</Td>
                      <Td className="text-slate-500 text-xs">{e.detalle}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <p className="text-xs text-slate-400 text-right">
            Mostrando {logFiltrado.length} de {LOG_ENTRIES.length} registros
          </p>
        </div>
      )}

    </div>
  );
}
