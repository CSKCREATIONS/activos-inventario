// ─── ENUMS ────────────────────────────────────────────────────────────────────

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
}

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

// ─── DASHBOARD KPIs ───────────────────────────────────────────────────────────

export interface DashboardStats {
  total_equipos: number;
  equipos_asignados: number;
  equipos_disponibles: number;
  equipos_criticos: number;
  equipos_sin_acta: number;
  equipos_sin_hoja_vida: number;
  equipos_rentados: number;
}
