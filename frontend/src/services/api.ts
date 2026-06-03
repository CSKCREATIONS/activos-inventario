// Servicio centralizado de llamadas al backend REST
// Base URL: variable de entorno VITE_API_URL o fallback local

import type {
  Usuario, Equipo, Asignacion, Accesorio, Documento, Suministro, EquipoMantenimiento,
  AccesorioAsignado,
  Licencia, LicenciaAsignada,
} from '../models/types/index';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

// ─── Helper ──────────────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem('itam-auth');
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    const token = parsed?.state?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options?.headers as Record<string, string>),
    },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? json.message ?? `Error ${res.status}`);
  return json;
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  // attachment; filename="foo.pdf"
  const m = /filename\*?=(?:UTF-8''|")?([^;"\n]+)"?/i.exec(header);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function buildUrl(base: string, params?: Record<string, string | undefined>) {
  if (!params) return base;
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>
  ).toString();
  return q ? `${base}?${q}` : base;
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export const usuariosApi = {
  getAll: (params?: { busqueda?: string; area?: string }) =>
    request<{ data: Usuario[]; total: number }>(buildUrl('/usuarios', params)),
  getAreas: () => request<{ data: string[] }>('/usuarios/areas'),
  getById: (id: string) => request<{ data: Usuario }>(`/usuarios/${id}`),
  getPerfil: (id: string) => request<{ data: unknown }>(`/usuarios/${id}/perfil`),
  create: (body: Omit<Usuario, 'id' | 'fecha_registro'>) =>
    request<{ data: Usuario }>('/usuarios', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Usuario>) =>
    request<{ data: Usuario }>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string }>(`/usuarios/${id}`, { method: 'DELETE' }),
};

// ─── Equipos ──────────────────────────────────────────────────────────────────

export const equiposApi = {
  getAll: (params?: Record<string, string>) =>
    request<{ data: Equipo[]; total: number }>(buildUrl('/equipos', params)),
  getById: (id: string) => request<{ data: Equipo }>(`/equipos/${id}`),
  getHistorial: (id: string) => request<{ data: unknown }>(`/equipos/${id}/historial`),
  create: (body: (Omit<Equipo, 'id' | 'fecha_registro'> & { generar_hoja_vida?: boolean })) =>
    request<{ data: Equipo }>('/equipos', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: (Partial<Equipo> & { generar_hoja_vida?: boolean })) =>
    request<{ data: Equipo }>(`/equipos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string }>(`/equipos/${id}`, { method: 'DELETE' }),
  /** Genera y descarga la Hoja de Vida en PDF. Devuelve un Blob. */
  getHojaVidaPdf: async (id: string): Promise<Blob> => {
    const res = await fetch(`${BASE}/equipos/${id}/hoja-vida-pdf`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { message?: string }).message ?? `Error ${res.status}`);
    }
    return res.blob();
  },
};

// ─── Asignaciones ─────────────────────────────────────────────────────────────

export const asignacionesApi = {
  getAll: (params?: { busqueda?: string; estado?: string }) =>
    request<{ data: Asignacion[]; total: number; activas: number }>(buildUrl('/asignaciones', params)),
  getById: (id: string) => request<{ data: Asignacion }>(`/asignaciones/${id}`),
  getEquiposDisponibles: () => request<{ data: Equipo[] }>('/asignaciones/equipos-disponibles'),
  create: (body: { usuario_id: string; equipo_id: string; fecha_asignacion: string; observaciones?: string; accesorios_entregados?: (string | AccesorioAsignado)[]; generar_hoja_vida?: boolean }) =>
    request<{ data: Asignacion }>('/asignaciones', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Asignacion>) =>
    request<{ data: Asignacion }>(`/asignaciones/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  devolucion: (id: string) =>
    request<{ data: Asignacion }>(`/asignaciones/${id}/devolucion`, { method: 'POST' }),

  /** Genera/descarga el Acta de Entrega en PDF. Devuelve Blob + filename. */
  downloadActa: async (id: string, force?: boolean): Promise<{ blob: Blob; filename: string }> => {
    const url = buildUrl(`/asignaciones/${id}/acta-pdf`, force ? { force: 'true' } : undefined);
    const res = await fetch(`${BASE}${url}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { detail?: string; message?: string }).detail ?? (j as { message?: string }).message ?? `Error ${res.status}`);
    }
    const blob = await res.blob();
    const filename = filenameFromContentDisposition(res.headers.get('Content-Disposition')) ?? `acta_${id}.pdf`;
    return { blob, filename };
  },
};

// ─── Accesorios ───────────────────────────────────────────────────────────────

export const accesoriosApi = {
  getAll: (params?: { busqueda?: string; estado?: string }) =>
    request<{ data: Accesorio[]; total: number }>(buildUrl('/accesorios', params)),
  getById: (id: string) => request<{ data: Accesorio }>(`/accesorios/${id}`),
  create: (body: Omit<Accesorio, 'id' | 'fecha_registro'>) =>
    request<{ data: Accesorio }>('/accesorios', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Accesorio>) =>
    request<{ data: Accesorio }>(`/accesorios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string }>(`/accesorios/${id}`, { method: 'DELETE' }),
};

// ─── Documentos ───────────────────────────────────────────────────────────────

export const documentosApi = {
  getAll: (params?: { busqueda?: string; tipo?: string; equipo_id?: string; usuario_id?: string }) =>
    request<{ data: Documento[]; total: number }>(buildUrl('/documentos', params)),
  getById: (id: string) => request<{ data: Documento }>(`/documentos/${id}`),
  create: (body: FormData) =>
    fetch(`${BASE}/documentos`, { method: 'POST', headers: getAuthHeader(), body }).then(async (r) => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.message ?? `Error ${r.status}`);
      return j as { data: Documento };
    }),
  update: (id: string, body: Partial<Documento>) =>
    request<{ data: Documento }>(`/documentos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string }>(`/documentos/${id}`, { method: 'DELETE' }),

  /** Descarga el archivo del documento (BLOB desde BD o fallback uploads). */
  download: async (id: string): Promise<{ blob: Blob; filename: string } > => {
    const res = await fetch(`${BASE}/documentos/${id}/download`, { headers: getAuthHeader() });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { detail?: string; message?: string }).detail ?? (j as { message?: string }).message ?? `Error ${res.status}`);
    }
    const blob = await res.blob();
    const filename = filenameFromContentDisposition(res.headers.get('Content-Disposition')) ?? `documento_${id}`;
    return { blob, filename };
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => request<{ data: unknown }>('/dashboard'),
  getMantenimientosPendientes: () =>
    request<{ data: { total: number; sin_registro: number; vencidos: number; equipos: EquipoMantenimiento[] } }>(
      '/dashboard/mantenimientos-pendientes'
    ),
};

// ─── Auth ────────────────────────────────────────────────────────────────────

import type { AuthUser } from '../models/stores/useAuthStore';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ user: AuthUser }>('/auth/me'),
};

// ─── Suministros ─────────────────────────────────────────────────────────────

export const suministrosApi = {
  getAll: (params?: { busqueda?: string; tipo?: string; estado?: string; equipo_id?: string }) =>
    request<{ data: Suministro[]; total: number }>(buildUrl('/suministros', params)),
  getById: (id: string) => request<{ data: Suministro }>(`/suministros/${id}`),
  create: (body: Omit<Suministro, 'id' | 'fecha_registro' | 'equipo_placa'>) =>
    request<{ data: Suministro }>('/suministros', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Suministro>) =>
    request<{ data: Suministro }>(`/suministros/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string }>(`/suministros/${id}`, { method: 'DELETE' }),
};

// ─── Licencias ────────────────────────────────────────────────────────────────

export const licenciasApi = {
  // Tipos de licencia
  getAll: (busqueda?: string) =>
    request<{ data: Licencia[]; total: number }>(buildUrl('/licencias', busqueda ? { busqueda } : undefined)),
  create: (body: Pick<Licencia, 'nombre'> & Partial<Licencia>) =>
    request<{ data: Licencia }>('/licencias', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Licencia>) =>
    request<{ data: Licencia }>(`/licencias/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string }>(`/licencias/${id}`, { method: 'DELETE' }),

  // Asignaciones individuales
  getAsignaciones: (licenciaId: string) =>
    request<{ data: LicenciaAsignada[]; total: number }>(`/licencias/${licenciaId}/asignaciones`),
  asignar: (licenciaId: string, body: Omit<LicenciaAsignada, 'id' | 'licencia_id' | 'equipo_placa' | 'equipo_nombre'>) =>
    request<{ data: LicenciaAsignada }>(`/licencias/${licenciaId}/asignaciones`, { method: 'POST', body: JSON.stringify(body) }),
  actualizarAsignacion: (id: string, body: Partial<LicenciaAsignada>) =>
    request<{ data: LicenciaAsignada }>(`/licencias/asignaciones/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  liberarAsignacion: (id: string) =>
    request<{ data: LicenciaAsignada }>(`/licencias/asignaciones/${id}/liberar`, { method: 'POST' }),
  eliminarAsignacion: (id: string) =>
    request<{ message: string }>(`/licencias/asignaciones/${id}`, { method: 'DELETE' }),
};

// ─── Importar CSV ─────────────────────────────────────────────────────────────

export type EntidadImportable = 'equipos' | 'usuarios' | 'suministros' | 'accesorios';

export interface ImportarErrorFila {
  fila: number;
  campos: Record<string, string>;
  error: string;
}

export interface ImportarResult {
  total: number;
  insertados: number;
  errores: ImportarErrorFila[];
}

export const importarApi = {
  upload: async (entidad: EntidadImportable, archivo: File): Promise<ImportarResult> => {
    const form = new FormData();
    form.append('archivo', archivo);
    const res = await fetch(`${BASE}/importar/${entidad}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: form,
    });
    const json = await res.json();
    if (!res.ok) throw new Error((json as { detail?: string }).detail ?? `Error ${res.status}`);
    return json as ImportarResult;
  },
  descargarPlantilla: (entidad: EntidadImportable) => {
    // Descargar usando fetch para poder enviar Authorization header
    fetch(`${BASE}/importar/${entidad}/plantilla`, { headers: getAuthHeader() })
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { detail?: string; message?: string }).detail ?? (j as { message?: string }).message ?? `Error ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantilla_${entidad}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((e) => {
        // No UI global aquí: la vista puede capturar/mostrar si lo requiere
        console.error(e);
      });
  },
};
