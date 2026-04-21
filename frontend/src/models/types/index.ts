// ─── ENUMS ────────────────────────────────────────────────────────────────────

export type TipoSuministro = 'Toner' | 'Licencia' | 'Cable' | 'Rollo';
export type EstadoSuministro = 'Disponible' | 'Agotado' | 'Reservado' | 'Baja';

export type EstadoEquipo = 'Disponible' | 'Asignado' | 'Dañado' | 'Baja' | 'En revisión' | 'Rentado';
export type Criticidad = 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type Confidencialidad = 'Pública' | 'Interna' | 'Confidencial' | 'Restringida';
export type TipoEquipo = 'Laptop' | 'Desktop' | 'Tablet' | 'Impresora' | 'Celular' | 'Monitor' | 'Servidor' | 'Switch' | 'Router' | 'UPS' | 'Otro';
export type EstadoAsignacion = 'Activa' | 'Devuelta' | 'Extraviada';
export type TipoDocumento = 'Acta' | 'Hoja de vida' | 'Factura' | 'Garantía' | 'Contrato' | 'Manual' | 'Otro';

// ─── USUARIO ──────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  nombre: string;
  cargo: string;
  proceso: string;
  grupo_asignado: string;
  area: string;
  correo: string;
  ubicacion?: string;
  activo: boolean;
  fecha_registro: string;
}

// ─── EQUIPO ───────────────────────────────────────────────────────────────────

export interface Equipo {
  id: string;
  placa: string;
  serial?: string;
  tipo_equipo: TipoEquipo;
  marca?: string;
  modelo?: string;
  sistema_operativo?: string;
  version_so?: string;
  ram?: string;
  disco?: string;
  tecnologia?: string;
  criticidad: Criticidad;
  confidencialidad: Confidencialidad;
  estado: EstadoEquipo;
  fecha_registro: string;
  fecha_compra?: string;
  proveedor?: string;
  costo?: number;
  es_rentado: boolean;
  observaciones?: string;
  // ── Campos Hoja de Vida ──────────────────────────────
  procesador?: string;
  nombre_equipo?: string;
  licenciamiento_so?: string;
  licenciamiento_office?: string;
  marca_monitor?: string;
  placa_monitor?: string;  // ── Mantenimiento ─────────────────────────────────────────
  ultimo_mantenimiento?: string | null;}

// ─── ASIGNACIÓN ───────────────────────────────────────────────────────────────

export interface Asignacion {
  id: string;
  usuario_id: string;
  equipo_id: string;
  fecha_asignacion: string;
  fecha_devolucion?: string;
  estado: EstadoAsignacion;
  observaciones?: string;
  acta_pdf?: string;
  hoja_vida_pdf?: string;
}

// ─── ACCESORIO ────────────────────────────────────────────────────────────────

export interface Accesorio {
  id: string;
  nombre: string;
  placa?: string;
  serial?: string;
  equipo_principal_id?: string;
  cantidad: number;
  estado: 'Disponible' | 'Asignado' | 'Dañado' | 'Baja';
  observaciones?: string;
  fecha_registro: string;
}

// ─── DOCUMENTO ────────────────────────────────────────────────────────────────

export interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  equipo_id?: string;
  asignacion_id?: string;
  usuario_id?: string;
  url: string;
  version: number;
  fecha_carga: string;
  cargado_por?: string;
}

// ─── SUMINISTRO ──────────────────────────────────────────────────────────────

export interface Suministro {
  id: string;
  nombre: string;
  tipo: TipoSuministro;
  referencia?: string;
  marca?: string;
  cantidad: number;
  cantidad_minima: number;
  estado: EstadoSuministro;
  equipo_id?: string;
  equipo_placa?: string;
  observaciones?: string;
  fecha_registro: string;
}

// ─── LICENCIA ─────────────────────────────────────────────────────────────────

export type EstadoLicencia = 'Disponible' | 'Stock bajo' | 'Sin stock';
export type EstadoLicenciaAsignada = 'Activa' | 'Liberada' | 'Vencida';

export interface Licencia {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  cantidad_total: number;
  cantidad_minima: number;
  cantidad_asignada: number;
  cantidad_disponible: number;
  estado: EstadoLicencia;
  observaciones?: string;
  fecha_registro: string;
}

export interface LicenciaAsignada {
  id: string;
  licencia_id: string;
  serial?: string;
  equipo_id?: string;
  equipo_placa?: string;
  equipo_nombre?: string;
  usuario?: string;
  estado: EstadoLicenciaAsignada;
  fecha_asignacion: string;
  fecha_vencimiento?: string;
  observaciones?: string;
}

// ─── DASHBOARD KPIs ───────────────────────────────────────────────────────────

export interface DashboardStats {
  total_equipos: number;
  equipos_asignados: number;
  equipos_disponibles: number;
  equipos_criticos: number;
  equipos_sin_acta: number;
  equipos_sin_hoja_vida: number;
  equipos_rentados: number;  equipos_pendientes_mantenimiento: number;
}

export interface EquipoMantenimiento {
  id: string;
  placa: string;
  marca?: string;
  modelo?: string;
  tipo_equipo: string;
  estado: string;
  ultimo_mantenimiento?: string | null;
  usuario_nombre?: string;
  area?: string;
  cargo?: string;
  dias_vencido?: number | null;
  urgencia: 'sin_registro' | 'vencido';}
