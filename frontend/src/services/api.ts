// Servicio centralizado de llamadas al backend REST
// Base URL: variable de entorno VITE_API_URL o fallback local

import type {
  Usuario, Equipo, Asignacion, Accesorio, Documento,
} from '../models/types/index';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

// ─── Helper ──────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `Error ${res.status}`);
  return json;
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
  create: (body: Omit<Equipo, 'id' | 'fecha_registro'>) =>
    request<{ data: Equipo }>('/equipos', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Equipo>) =>
    request<{ data: Equipo }>(`/equipos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string }>(`/equipos/${id}`, { method: 'DELETE' }),
};

// ─── Asignaciones ─────────────────────────────────────────────────────────────

export const asignacionesApi = {
  getAll: (params?: { busqueda?: string; estado?: string }) =>
    request<{ data: Asignacion[]; total: number; activas: number }>(buildUrl('/asignaciones', params)),
  getById: (id: string) => request<{ data: Asignacion }>(`/asignaciones/${id}`),
  getEquiposDisponibles: () => request<{ data: Equipo[] }>('/asignaciones/equipos-disponibles'),
  create: (body: { usuario_id: string; equipo_id: string; fecha_asignacion: string; observaciones?: string }) =>
    request<{ data: Asignacion }>('/asignaciones', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Asignacion>) =>
    request<{ data: Asignacion }>(`/asignaciones/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  devolucion: (id: string) =>
    request<{ data: Asignacion }>(`/asignaciones/${id}/devolucion`, { method: 'POST' }),
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
    fetch(`${BASE}/documentos`, { method: 'POST', body }).then(async (r) => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.message ?? `Error ${r.status}`);
      return j as { data: Documento };
    }),
  update: (id: string, body: Partial<Documento>) =>
    request<{ data: Documento }>(`/documentos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string }>(`/documentos/${id}`, { method: 'DELETE' }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => request<{ data: unknown }>('/dashboard'),
};
