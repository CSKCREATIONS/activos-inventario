// ============================================================================
// VIEW: Página de Administración del sistema ITAM
// ============================================================================

import { useState, useEffect, useCallback, type ReactElement } from "react";
import {
  Users,
  ShieldCheck,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Monitor,
  FileText,
  BarChart2,
  Settings,
  RefreshCw,
  UserCog,
  Download,
} from "lucide-react";
import {
  Card,
  Button,
  Modal,
  Field,
  Badge,
  Table,
  Th,
  Td,
  EmptyState,
} from "../../components/ui/index";
import clsx from "clsx";
import {
  useAdminController,
  type SistemaUsuario,
} from "../../../controllers/useAdminController";
import { auditApi } from "../../../services/api";

// ============================================================================
// TIPOS LOCALES
// ============================================================================
type Rol = "Administrador" | "Gestor" | "Técnico" | "Solo lectura";

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
  tipo: "info" | "warning" | "error" | "success";
}

// ── Módulos del sistema ─────────────────────────────────────────────────────
const MODULOS = [
  "Activos",
  "Usuarios",
  "Asignaciones",
  "Accesorios",
  "Documentos",
  "Reportes",
];

// ── Definición de roles con sus permisos ────────────────
const ROLES_DEF: RolDefinicion[] = [
  {
    rol: "Administrador",
    color: "red",
    descripcion: "Acceso total al sistema. Puede gestionar usuarios, roles y configuración.",
    permisos: MODULOS.map((m) => ({ modulo: m, ver: true, crear: true, editar: true, eliminar: true, exportar: true })),
  },
  {
    rol: "Gestor",
    color: "blue",
    descripcion: "Gestión completa de activos y asignaciones, pero sin permisos de administración.",
    permisos: MODULOS.map((m) => ({ modulo: m, ver: true, crear: true, editar: true, eliminar: false, exportar: true })),
  },
  {
    rol: "Técnico",
    color: "green",
    descripcion: "Gestiona activos y asignaciones. No puede eliminar ni exportar reportes.",
    permisos: MODULOS.map((m) => ({
      modulo: m,
      ver: true,
      crear: ["Activos", "Asignaciones", "Accesorios", "Documentos"].includes(m),
      editar: ["Activos", "Asignaciones", "Accesorios"].includes(m),
      eliminar: false,
      exportar: false,
    })),
  },
  {
    rol: "Solo lectura",
    color: "gray",
    descripcion: "Solo puede visualizar información. Sin permisos de escritura.",
    permisos: MODULOS.map((m) => ({ modulo: m, ver: true, crear: false, editar: false, eliminar: false, exportar: false })),
  },
];

// ── Mapeo de rol visible a color para badges ────────────────────────────────
const ROL_BADGE: Record<Rol, string> = {
  Administrador: "red",
  Gestor: "blue",
  Técnico: "green",
  "Solo lectura": "gray",
};

// ── Iconos para el log ────────────────────────────────────────────────────
const LOG_ICON: Record<string, ReactElement> = {
  success: <CheckCircle size={14} className="text-emerald-500" />,
  info: <Info size={14} className="text-blue-500" />,
  warning: <AlertTriangle size={14} className="text-amber-500" />,
  error: <XCircle size={14} className="text-red-500" />,
};

// ── Tabs de la página ───────────────────────────────────────────────────────
const TABS = [
  { id: "usuarios", label: "Usuarios del sistema", icon: <Users size={16} /> },
  { id: "roles", label: "Roles y permisos", icon: <ShieldCheck size={16} /> },
  { id: "log", label: "Registro de actividad", icon: <ClipboardList size={16} /> },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function AdministracionPage() {
  const [tab, setTab] = useState<TabId>("usuarios");
  const [passwordError, setPasswordError] = useState("");

  // Logs reales
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFiltro, setLogFiltro] = useState("");
  const [logTipo, setLogTipo] = useState("");

  // Paginación logs
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // Controlador de usuarios reales
  const {
    usuarios,
    loading,
    error: apiError,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    cambiarPassword,
  } = useAdminController();

  // Estados del modal de usuarios
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<SistemaUsuario | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editUsuario, setEditUsuario] = useState<{
    id?: string;
    username?: string;
    nombre?: string;
    email?: string;
    rol?: "admin" | "gestor" | "tecnico" | "solo_lectura";
    rolDisplay?: string;
    activo?: boolean;
    password?: string;
  }>({});
  const [modoEdicionU, setModoEdicionU] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Roles (para la pestaña de permisos)
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol>("Administrador");

  // Cargar logs cuando se activa la pestaña de log
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await auditApi.getLogs({ limit: 500 });
      const formattedLogs = res.data.map((log: any) => ({
        id: log.id,
        fecha: new Date(log.fecha).toLocaleString("es-CO"),
        usuario: log.usuario_nombre || log.username || "Sistema",
        accion: log.accion,
        modulo: log.modulo,
        detalle: log.detalle || "",
        tipo: "info",
      }));
      setLogs(formattedLogs);
    } catch (error) {
      console.error("Error cargando logs:", error);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "log") {
      fetchLogs();
    }
  }, [tab, fetchLogs]);

  // Filtrado local de logs
  const logFiltrado = logs.filter((e) => {
    const matchText =
      logFiltro === "" ||
      [e.usuario, e.accion, e.modulo, e.detalle].some((s) =>
        s.toLowerCase().includes(logFiltro.toLowerCase())
      );
    const matchTipo = logTipo === "" || e.tipo === logTipo;
    return matchText && matchTipo;
  });

  // Resetear página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [logFiltro, logTipo]);

  // Paginación
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logFiltrado.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logFiltrado.length / logsPerPage);

  // Handlers de usuarios
  const abrirCrearU = () => {
    setEditUsuario({ activo: true, rolDisplay: "Gestor" });
    setModoEdicionU(false);
    setShowPass(false);
    setModalUsuario(true);
  };

  const abrirEditarU = (u: SistemaUsuario) => {
    let rolFrontend: Rol;
    switch (u.rol) {
      case "admin":
        rolFrontend = "Administrador";
        break;
      case "gestor":
        rolFrontend = "Gestor";
        break;
      case "tecnico":
        rolFrontend = "Técnico";
        break;
      case "solo_lectura":
        rolFrontend = "Solo lectura";
        break;
      default:
        rolFrontend = "Gestor";
    }
    setEditUsuario({
      id: u.id,
      username: u.username,
      nombre: u.nombre || "",
      email: u.email || "",
      rol: u.rol,
      rolDisplay: rolFrontend,
      activo: u.activo,
    });
    setModoEdicionU(true);
    setShowPass(false);
    setModalUsuario(true);
  };

  const guardarUsuario = async () => {
    let rolBackend: string;
    switch (editUsuario.rolDisplay) {
      case "Administrador":
        rolBackend = "admin";
        break;
      case "Gestor":
        rolBackend = "gestor";
        break;
      case "Técnico":
        rolBackend = "tecnico";
        break;
      case "Solo lectura":
        rolBackend = "solo_lectura";
        break;
      default:
        rolBackend = "gestor";
    }

    try {
      if (modoEdicionU && editUsuario.id) {
        await actualizarUsuario(editUsuario.id, {
          nombre: editUsuario.nombre,
          email: editUsuario.email,
          rol: rolBackend,
          activo: editUsuario.activo,
        });
        if (newPassword && newPassword.trim() !== "") {
          if (newPassword.length < 6) {
            setPasswordError("La contraseña debe tener mínimo 6 caracteres");
            return;
          }
          await cambiarPassword(editUsuario.id, newPassword);
          setNewPassword("");
        }
      } else {
        if (!editUsuario.username || !editUsuario.password) {
          alert("Usuario y contraseña son requeridos");
          return;
        }
        if (editUsuario.password.length < 6) {
          setPasswordError("La contraseña debe tener mínimo 6 caracteres");
          return;
        }
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
      setNewPassword("");
      setPasswordError("");
    } catch (err) {
      console.error(err);
      alert("Error al guardar usuario");
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

  const rolDef = ROLES_DEF.find((r) => r.rol === rolSeleccionado)!;

  // Exportar logs a CSV
  const handleExportLogs = () => {
    if (logFiltrado.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }

    const headers = ["Tipo", "Fecha y hora", "Usuario", "Módulo", "Acción", "Detalle"];

    const rows = logFiltrado.map((log) => [
      log.tipo,
      log.fecha,
      log.usuario,
      log.modulo,
      log.accion,
      log.detalle,
    ]);

    const escapeCell = (cell: string) => {
      if (cell === undefined || cell === null) return "";
      const str = String(cell);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `registro_actividad_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Stats rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Usuarios activos",
            valor: usuarios.filter((u) => u.activo).length,
            icon: <Users size={20} />,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Roles definidos",
            valor: ROLES_DEF.length,
            icon: <ShieldCheck size={20} />,
            color: "bg-violet-50 text-violet-600",
          },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-4">
            <div
              className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                s.color
              )}
            >
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
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: USUARIOS DEL SISTEMA */}
      {tab === "usuarios" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-slate-500 flex-1">
              <strong>{usuarios.filter((u) => u.activo).length}</strong> usuarios
              activos de <strong>{usuarios.length}</strong> en total
            </p>
            <Button
              icon={<Plus size={16} />}
              onClick={abrirCrearU}
              className="w-full sm:w-auto"
            >
              Nuevo usuario
            </Button>
          </div>

          {apiError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {apiError}
            </div>
          )}

          <Card>
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Cargando usuarios...
              </div>
            ) : usuarios.length === 0 ? (
              <EmptyState
                mensaje="No hay usuarios del sistema registrados."
                icon={<Users size={40} />}
              />
            ) : (
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
                    <tr key={u.id} className="hover:bg-slate-50">
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm">
                            {(u.nombre || u.username).charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">
                            {u.nombre || u.username}
                          </span>
                        </div>
                      </Td>
                      <Td className="text-slate-500 text-sm">{u.email || "—"}</Td>
                      <Td>
                        <Badge
                          variant={
                            u.rol === "admin"
                              ? "red"
                              : u.rol === "gestor"
                              ? "blue"
                              : u.rol === "tecnico"
                              ? "green"
                              : "gray"
                          }
                        >
                          {u.rol === "admin"
                            ? "Administrador"
                            : u.rol === "gestor"
                            ? "Gestor"
                            : u.rol === "tecnico"
                            ? "Técnico"
                            : "Solo lectura"}
                        </Badge>
                      </Td>
                      <Td className="text-slate-400 text-xs">
                        {u.ultimo_acceso || "—"}
                      </Td>
                      <Td>
                        <button
                          onClick={() => toggleActivoU(u.id, u.activo)}
                          className={clsx(
                            "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
                            u.activo
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {u.activo ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {u.activo ? "Activo" : "Inactivo"}
                        </button>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirEditarU(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setModalEliminar(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
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

          {/* Modal crear/editar usuario */}
          <Modal
            abierto={modalUsuario}
            onCerrar={() => setModalUsuario(false)}
            titulo={modoEdicionU ? "Editar usuario" : "Nuevo usuario"}
            size="sm"
          >
            <div className="space-y-4">
              {!modoEdicionU && (
                <Field
                  label="Nombre de usuario (login)"
                  value={editUsuario.username ?? ""}
                  onChange={(e) =>
                    setEditUsuario((p) => ({ ...p, username: e.target.value }))
                  }
                  placeholder="ej: jperez"
                />
              )}
              <Field
                label="Nombre completo"
                value={editUsuario.nombre ?? ""}
                onChange={(e) =>
                  setEditUsuario((p) => ({ ...p, nombre: e.target.value }))
                }
              />
              <Field
                label="Correo electrónico"
                type="email"
                value={editUsuario.email ?? ""}
                onChange={(e) =>
                  setEditUsuario((p) => ({ ...p, email: e.target.value }))
                }
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rol
                </label>
                <select
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  value={editUsuario.rolDisplay ?? (modoEdicionU ? "Gestor" : "Gestor")}
                  onChange={(e) =>
                    setEditUsuario((p) => ({ ...p, rolDisplay: e.target.value }))
                  }
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Solo lectura">Solo lectura</option>
                </select>
              </div>
              {modoEdicionU && (
                <div className="border-t border-slate-200 pt-3 mt-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cambiar contraseña (opcional)
                  </label>
                  <input
                    type="password"
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      passwordError ? "border-red-500" : "border-slate-300"
                    }`}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    placeholder="Nueva contraseña (mínimo 6 caracteres)"
                  />
                  {passwordError && (
                    <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                  )}
                </div>
              )}
              {!modoEdicionU && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg"
                      value={editUsuario.password ?? ""}
                      onChange={(e) =>
                        setEditUsuario((p) => ({ ...p, password: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo-check"
                  checked={editUsuario.activo ?? true}
                  onChange={(e) =>
                    setEditUsuario((p) => ({ ...p, activo: e.target.checked }))
                  }
                />
                <label htmlFor="activo-check" className="text-sm">
                  Usuario activo
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setModalUsuario(false)}>
                  Cancelar
                </Button>
                <Button onClick={guardarUsuario}>Guardar</Button>
              </div>
            </div>
          </Modal>

          {/* Modal eliminar */}
          <Modal
            abierto={!!modalEliminar}
            onCerrar={() => setModalEliminar(null)}
            titulo="Eliminar usuario"
            size="sm"
          >
            <div className="space-y-4">
              <div className="flex gap-3 p-4 bg-red-50 rounded-lg">
                <AlertTriangle size={20} className="text-red-500" />
                <p className="text-sm text-red-700">
                  ¿Eliminar a{" "}
                  <strong>{modalEliminar?.nombre || modalEliminar?.username}</strong>?
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModalEliminar(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={confirmarEliminar}>
                  Eliminar
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* TAB: ROLES Y PERMISOS */}
      {tab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de roles (izquierda) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
              Roles disponibles
            </p>
            {ROLES_DEF.map((r) => (
              <button
                key={r.rol}
                onClick={() => setRolSeleccionado(r.rol)}
                className={clsx(
                  "w-full text-left p-4 rounded-xl border transition-all",
                  rolSeleccionado === r.rol
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800 text-sm">
                    {r.rol}
                  </span>
                  <Badge variant={r.color} size="sm">
                    {r.rol}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{r.descripcion}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {
                    usuarios.filter((u) => {
                      const rolBackend =
                        r.rol === "Administrador"
                          ? "admin"
                          : r.rol === "Gestor"
                          ? "gestor"
                          : r.rol === "Técnico"
                          ? "tecnico"
                          : "solo_lectura";
                      return u.rol === rolBackend && u.activo;
                    }).length
                  }{" "}
                  usuario(s)
                </p>
              </button>
            ))}
          </div>

          {/* Detalle de permisos (derecha) */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{rolDef.rol}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{rolDef.descripcion}</p>
                </div>
                <UserCog size={28} className="text-slate-300" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                        Módulo
                      </th>
                      {["Ver", "Crear", "Editar", "Eliminar", "Exportar"].map((p) => (
                        <th
                          key={p}
                          className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rolDef.permisos.map((p) => {
                      const ICONS: Record<string, ReactElement> = {
                        Activos: <Monitor size={14} className="text-blue-500" />,
                        Usuarios: <Users size={14} className="text-violet-500" />,
                        Asignaciones: <RefreshCw size={14} className="text-emerald-500" />,
                        Accesorios: <Settings size={14} className="text-amber-500" />,
                        Documentos: <FileText size={14} className="text-rose-500" />,
                        Reportes: <BarChart2 size={14} className="text-cyan-500" />,
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
                              {val ? (
                                <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                              ) : (
                                <XCircle size={16} className="text-slate-200 mx-auto" />
                              )}
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
                Los permisos son fijos por rol. Para ajustes personalizados, contacta al
                equipo de desarrollo.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: REGISTRO DE ACTIVIDAD con paginación */}
      {tab === "log" && (
        <div className="space-y-4">
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
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              className="shrink-0"
              onClick={handleExportLogs}
            >
              Exportar log
            </Button>
          </div>

          <Card>
            {logsLoading ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Cargando registros...
              </div>
            ) : logFiltrado.length === 0 ? (
              <EmptyState
                mensaje="No hay registros de actividad."
                icon={<ClipboardList size={40} />}
              />
            ) : (
              <>
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
                    {currentLogs.map((e) => (
                      <tr
                        key={e.id}
                        className={clsx(
                          "hover:bg-slate-50 transition-colors",
                          e.tipo === "error" && "bg-red-50/40",
                          e.tipo === "warning" && "bg-amber-50/40"
                        )}
                      >
                        <Td>
                          <div className="flex items-center justify-center w-6">
                            {LOG_ICON[e.tipo] || LOG_ICON.info}
                          </div>
                        </Td>
                        <Td className="text-xs text-slate-500 whitespace-nowrap">{e.fecha}</Td>
                        <Td>
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                              {e.usuario.charAt(0)}
                            </div>
                            <span className="text-sm text-slate-700 whitespace-nowrap">
                              {e.usuario}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <Badge variant="indigo" size="sm">
                            {e.modulo}
                          </Badge>
                        </Td>
                        <Td className="font-medium text-slate-700 text-sm whitespace-nowrap">
                          {e.accion}
                        </Td>
                        <Td className="text-slate-500 text-xs">{e.detalle}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <div className="text-xs text-slate-500">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400 text-right px-4 pb-3">
                  Mostrando {logFiltrado.length === 0 ? 0 : indexOfFirstLog + 1} -{" "}
                  {Math.min(indexOfLastLog, logFiltrado.length)} de {logFiltrado.length} registros
                </p>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}