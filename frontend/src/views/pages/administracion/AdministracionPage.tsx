// ============================================================================
// VIEW: Página de Administración del sistema ITAM
// ============================================================================

import { useState, type ReactElement } from 'react';
import {
  Settings, Users, ShieldCheck, ClipboardList,
  Plus, Pencil, Trash2, CheckCircle, XCircle,
  Save, Globe, Database, Lock, Eye, EyeOff,
  Download, Upload, RefreshCw, AlertTriangle, Info,
  Monitor, FileText, BarChart2, UserCog,
} from 'lucide-react';
import { Card, Button, Modal, Field, Badge, Table, Th, Td, EmptyState } from '../../components/ui/index';
import clsx from 'clsx';
import { useAdminController, type SistemaUsuario } from '../../../controllers/useAdminController';

// ============================================================================
// TIPOS LOCALES (solo para roles y permisos)
// ============================================================================
type Rol = 'Administrador' | 'Gestor' 

interface PermisoModulo {
  modulo: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  exportar: boolean;
}

interface RolDefinicion {
  rol: Rol;
  descripcion: string;
  color: string;
  permisos: PermisoModulo[];
}

interface LogEntry {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalle: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
}

// ── Datos estáticos (roles y logs mock, pero usuarios vienen del backend)
const MODULOS = ['Activos', 'Usuarios', 'Asignaciones', 'Accesorios', 'Documentos', 'Reportes'];

const ROLES_DEF: RolDefinicion[] = [
  {
    rol: 'Administrador', color: 'red',
    descripcion: 'Acceso total al sistema. Puede gestionar usuarios, roles y configuración.',
    permisos: MODULOS.map((m) => ({ modulo: m, ver: true, crear: true, editar: true, eliminar: true, exportar: true })),
  },
  {
    rol: 'Gestor', color: 'orange',
    descripcion: 'Puede ver y editar todo, pero no eliminar ni gestionar cuentas de sistema.',
    permisos: MODULOS.map((m) => ({ modulo: m, ver: true, crear: true, editar: true, eliminar: false, exportar: true })),
  },
  
];

const LOG_ENTRIES: LogEntry[] = [
  { id: '1', fecha: '2026-02-23 09:14', usuario: 'Carlos Ramírez', accion: 'Inicio de sesión', modulo: 'Sistema', detalle: 'Acceso desde 192.168.1.10', tipo: 'success' },
  { id: '2', fecha: '2026-02-23 09:20', usuario: 'Carlos Ramírez', accion: 'Creó equipo', modulo: 'Activos', detalle: 'Placa EAC000700 — Laptop Dell', tipo: 'info' },
  // ... (mantén el resto de LOG_ENTRIES igual, o déjalos como mock por ahora)
];

const ROL_BADGE: Record<Rol, string> = {
  'Administrador': 'red',
  'Gestor': 'orange',
};

const LOG_ICON: Record<string, ReactElement> = {
  success: <CheckCircle size={14} className="text-emerald-500" />,
  info: <Info size={14} className="text-blue-500" />,
  warning: <AlertTriangle size={14} className="text-amber-500" />,
  error: <XCircle size={14} className="text-red-500" />,
};

const TABS = [
  { id: 'general', label: 'General', icon: <Settings size={16} /> },
  { id: 'usuarios', label: 'Usuarios del sistema', icon: <Users size={16} /> },
  { id: 'roles', label: 'Roles y permisos', icon: <ShieldCheck size={16} /> },
  { id: 'log', label: 'Registro de actividad', icon: <ClipboardList size={16} /> },
] as const;
type TabId = typeof TABS[number]['id'];

interface ConfigGeneral {
  nombre_sistema: string;
  empresa: string;
  ciudad: string;
  correo_soporte: string;
  zona_horaria: string;
  idioma: string;
  backup_automatico: boolean;
  backup_frecuencia: string;
  sesion_timeout: string;
  doble_factor: boolean;
}

const CONFIG_INIT: ConfigGeneral = {
  nombre_sistema: 'ITAM System',
  empresa: 'Empresa S.A.S.',
  ciudad: 'Bogotá, Colombia',
  correo_soporte: 'soporte@empresa.com',
  zona_horaria: 'America/Bogota (UTC-5)',
  idioma: 'Español',
  backup_automatico: true,
  backup_frecuencia: 'Diario',
  sesion_timeout: '30 minutos',
  doble_factor: false,
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function AdministracionPage() {
  const [tab, setTab] = useState<TabId>('general');

  // Configuración (mock)
  const [config, setConfig] = useState<ConfigGeneral>(CONFIG_INIT);
  const [configGuardada, setConfigGuardada] = useState(false);

  // Controlador de usuarios reales
  const { usuarios, loading, error: apiError, crearUsuario, actualizarUsuario, eliminarUsuario } = useAdminController();

  // Estados del modal de usuarios
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<SistemaUsuario | null>(null);
const [editUsuario, setEditUsuario] = useState<{
  id?: string;
  username?: string;
  nombre?: string;
  email?: string;
  rol?: 'admin' | 'gestor';   // ← valor real del backend
  rolDisplay?: string;        // ← valor para mostrar en el select
  activo?: boolean;
  password?: string;
}>({});  const [modoEdicionU, setModoEdicionU] = useState(false);

  const [showPass, setShowPass] = useState(false);

  // Roles
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol>('Administrador');

  // Log (mock)
  const [logFiltro, setLogFiltro] = useState('');
  const [logTipo, setLogTipo] = useState('');
  const logFiltrado = LOG_ENTRIES.filter((e) => {
    const matchText = logFiltro === '' || [e.usuario, e.accion, e.modulo, e.detalle].some((s) => s.toLowerCase().includes(logFiltro.toLowerCase()));
    const matchTipo = logTipo === '' || e.tipo === logTipo;
    return matchText && matchTipo;
  });

  // Handlers de usuarios
  const abrirCrearU = () => {
    setEditUsuario({ activo: true, rolDisplay: 'gestor' }); // 'gestor' es el valor que usa el backend
    setModoEdicionU(false);
    setShowPass(false);
    setModalUsuario(true);
  };

  const abrirEditarU = (u: SistemaUsuario) => {
  setEditUsuario({
    id: u.id,
    username: u.username,
    nombre: u.nombre || '',
    email: u.email || '',
    rol: u.rol,                     // guardamos el real (admin/gestor)
    rolDisplay: u.rol === 'admin' ? 'Administrador' : 'Gestor', // para mostrar
    activo: u.activo,
  });
  setModoEdicionU(true);
  setShowPass(false);
  setModalUsuario(true);
};

  const guardarUsuario = async () => {
  try {
    if (modoEdicionU && editUsuario.id) {
      const rolBackend = editUsuario.rolDisplay === 'Administrador' ? 'admin' : 'gestor';
      await actualizarUsuario(editUsuario.id, {
        nombre: editUsuario.nombre,
        email: editUsuario.email,
        rol: rolBackend,
        activo: editUsuario.activo,
      });
    } else {
      if (!editUsuario.username || !editUsuario.password) {
        alert('Usuario y contraseña son requeridos');
        return;
      }
      const rolBackend = editUsuario.rolDisplay === 'Administrador' ? 'admin' : 'gestor';
      await crearUsuario({
        username: editUsuario.username,
        password: editUsuario.password,
        rol: rolBackend,
        nombre: editUsuario.nombre,
        email: editUsuario.email,
      });
    }
    setModalUsuario(false);
    setEditUsuario({});
  } catch (err) {
    console.error(err);
    alert('Error al guardar usuario');
  }
};

  const toggleActivoU = async (id: string, activoActual: boolean) => {
    await actualizarUsuario(id, { activo: !activoActual });
  };

  const confirmarEliminar = async () => {
    if (modalEliminar) {
      await eliminarUsuario(modalEliminar.id);
      setModalEliminar(null);
    }
  };

  const guardarConfig = () => {
    setConfigGuardada(true);
    setTimeout(() => setConfigGuardada(false), 2500);
  };

  const rolDef = ROLES_DEF.find((r) => r.rol === rolSeleccionado)!;

  return (
    <div className="space-y-6">
      {/* Stats rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Usuarios activos', valor: usuarios.filter((u) => u.activo).length, icon: <Users size={20} />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Roles definidos', valor: ROLES_DEF.length, icon: <ShieldCheck size={20} />, color: 'bg-violet-50 text-violet-600' },
          { label: 'Versión del sistema', valor: 'v1.0.0', icon: <Monitor size={20} />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Último backup', valor: 'Hoy 11:00', icon: <Database size={20} />, color: 'bg-amber-50 text-amber-600' },
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: GENERAL (sin cambios, omito por brevedad, pero puedes mantener igual) */}
      {tab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ... contenido de general ... */}
          <div className="lg:col-span-2 flex justify-end gap-3">
            {configGuardada && <span className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle size={16} /> Configuración guardada</span>}
            <Button icon={<Save size={16} />} onClick={guardarConfig}>Guardar cambios</Button>
          </div>
        </div>
      )}

      {/* TAB: USUARIOS DEL SISTEMA */}
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

          {apiError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{apiError}</div>
          )}

          <Card>
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Cargando usuarios...</div>
            ) : usuarios.length === 0 ? (
              <EmptyState mensaje="No hay usuarios del sistema registrados." icon={<Users size={40} />} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Usuario</Th><Th>Correo</Th><Th>Rol</Th><Th>Último acceso</Th><Th>Estado</Th><Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm">
                            {(u.nombre || u.username).charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{u.nombre || u.username}</span>
                        </div>
                      </Td>
                      <Td className="text-slate-500 text-sm">{u.email || '—'}</Td>
                      <Td>
                        <Badge variant={u.rol === 'admin' ? 'red' : 'blue'}>{u.rol === 'admin' ? 'Administrador' : 'Gestor'}</Badge>
                      </Td>
                      <Td className="text-slate-400 text-xs">{u.ultimo_acceso || '—'}</Td>
                      <Td>
                        <button
                          onClick={() => toggleActivoU(u.id, u.activo)}
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
                          <button onClick={() => abrirEditarU(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setModalEliminar(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {/* Modal crear/editar */}
          <Modal abierto={modalUsuario} onCerrar={() => setModalUsuario(false)} titulo={modoEdicionU ? 'Editar usuario' : 'Nuevo usuario'} size="sm">
            <div className="space-y-4">
              {!modoEdicionU && (
                <Field
                  label="Nombre de usuario (login)"
                  value={editUsuario.username ?? ''}
                  onChange={(e) => setEditUsuario((p) => ({ ...p, username: e.target.value }))}
                  placeholder="ej: jperez"
                />
              )}
              <Field
                label="Nombre completo"
                value={editUsuario.nombre ?? ''}
                onChange={(e) => setEditUsuario((p) => ({ ...p, nombre: e.target.value }))}
              />
              <Field
                label="Correo electrónico"
                type="email"
                value={editUsuario.email ?? ''}
                onChange={(e) => setEditUsuario((p) => ({ ...p, email: e.target.value }))}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  value={editUsuario.rolDisplay ?? (modoEdicionU ? 'Gestor' : 'Gestor')}
                  onChange={(e) => setEditUsuario((p) => ({ ...p, rolDisplay: e.target.value }))}
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor">Gestor</option>
                  
                </select>
              </div>
              {!modoEdicionU && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg"
                      value={editUsuario.password ?? ''}
                      onChange={(e) => setEditUsuario((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="activo-check" checked={editUsuario.activo ?? true} onChange={(e) => setEditUsuario((p) => ({ ...p, activo: e.target.checked }))} />
                <label htmlFor="activo-check" className="text-sm">Usuario activo</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setModalUsuario(false)}>Cancelar</Button>
                <Button onClick={guardarUsuario}>Guardar</Button>
              </div>
            </div>
          </Modal>

          {/* Modal eliminar */}
          <Modal abierto={!!modalEliminar} onCerrar={() => setModalEliminar(null)} titulo="Eliminar usuario" size="sm">
            <div className="space-y-4">
              <div className="flex gap-3 p-4 bg-red-50 rounded-lg">
                <AlertTriangle size={20} className="text-red-500" />
                <p className="text-sm text-red-700">
                  ¿Eliminar a <strong>{modalEliminar?.nombre || modalEliminar?.username}</strong>? Esta acción no se puede deshacer.
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

      {/* TAB: ROLES (sin cambios, igual que antes) */}
      {tab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ... (igual que en tu código original) ... */}
        </div>
      )}

      {/* TAB: LOG (sin cambios) */}
      {tab === 'log' && (
        <div className="space-y-4">
          {/* ... (igual que en tu código original) ... */}
        </div>
      )}
    </div>
  );
}