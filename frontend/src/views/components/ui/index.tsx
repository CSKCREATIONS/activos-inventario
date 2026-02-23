// VIEW: Componentes UI reutilizables
// Puros — sin lógica de negocio, solo presentación.

import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import type { EstadoEquipo, Criticidad, Confidencialidad } from '../../../models/types/index';

// ─── BADGE GENÉRICO ───────────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode;
  variant?: 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'orange' | 'purple' | 'indigo';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        {
          'bg-slate-100 text-slate-700 border-slate-200': variant === 'gray',
          'bg-blue-100 text-blue-700 border-blue-200': variant === 'blue',
          'bg-emerald-100 text-emerald-700 border-emerald-200': variant === 'green',
          'bg-red-100 text-red-700 border-red-200': variant === 'red',
          'bg-yellow-100 text-yellow-700 border-yellow-200': variant === 'yellow',
          'bg-orange-100 text-orange-700 border-orange-200': variant === 'orange',
          'bg-purple-100 text-purple-700 border-purple-200': variant === 'purple',
          'bg-indigo-100 text-indigo-700 border-indigo-200': variant === 'indigo',
        }
      )}
    >
      {children}
    </span>
  );
}

// ─── ESTADO EQUIPO BADGE ──────────────────────────────────────────────────────

const estadoVariant: Record<EstadoEquipo, BadgeProps['variant']> = {
  Disponible: 'green',
  Asignado: 'blue',
  Dañado: 'red',
  Baja: 'gray',
  'En revisión': 'orange',
  Rentado: 'purple',
};

export function EstadoBadge({ estado }: { estado: EstadoEquipo }) {
  return <Badge variant={estadoVariant[estado]}>{estado}</Badge>;
}

// ─── CRITICIDAD BADGE ─────────────────────────────────────────────────────────

const criticidadVariant: Record<Criticidad, BadgeProps['variant']> = {
  Baja: 'green',
  Media: 'yellow',
  Alta: 'orange',
  Crítica: 'red',
};

export function CriticidadBadge({ criticidad }: { criticidad: Criticidad }) {
  return <Badge variant={criticidadVariant[criticidad]}>{criticidad}</Badge>;
}

// ─── CONFIDENCIALIDAD BADGE ───────────────────────────────────────────────────

const confVariant: Record<Confidencialidad, BadgeProps['variant']> = {
  Pública: 'green',
  Interna: 'blue',
  Confidencial: 'orange',
  Restringida: 'red',
};

export function ConfidencialidadBadge({ valor }: { valor: Confidencialidad }) {
  return <Badge variant={confVariant[valor]}>{valor}</Badge>;
}

// ─── BUTTON ──────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ children, variant = 'primary', size = 'md', loading, icon, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={clsx(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'px-2.5 py-1 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-5 py-2.5 text-base': size === 'lg',
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500': variant === 'primary',
          'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
          'text-slate-600 hover:bg-slate-100 focus:ring-slate-300': variant === 'ghost',
          'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400': variant === 'outline',
        },
        className
      )}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {children}
    </div>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  titulo: string;
  valor: number | string;
  icon: ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'slate';
  descripcion?: string;
}

const kpiColors = {
  blue:   'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
  green:  'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
  red:    'bg-red-50 text-red-600 ring-1 ring-red-100',
  orange: 'bg-orange-50 text-orange-600 ring-1 ring-orange-100',
  purple: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100',
  slate:  'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

export function KpiCard({ titulo, valor, icon, color, descripcion }: KpiCardProps) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className={clsx('p-2.5 rounded-lg', kpiColors[color])}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{titulo}</p>
        <p className="text-2xl font-bold text-slate-800">{valor}</p>
        {descripcion && <p className="text-xs text-slate-400 mt-0.5">{descripcion}</p>}
      </div>
    </Card>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ abierto, onCerrar, titulo, children, size = 'md' }: ModalProps) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCerrar}
        role="button"
        tabIndex={0}
        aria-label="Cerrar modal"
        onKeyDown={(e) => e.key === 'Escape' && onCerrar()}
      />
      <div
        className={clsx(
          'relative bg-white shadow-xl w-full flex flex-col',
          // Móvil: ocupa toda la pantalla o casi (bottom sheet)
          'max-h-[95vh] rounded-t-2xl sm:rounded-xl',
          {
            'sm:max-w-sm':  size === 'sm',
            'sm:max-w-lg':  size === 'md',
            'sm:max-w-2xl': size === 'lg',
            'sm:max-w-4xl': size === 'xl',
          }
        )}
      >
        {/* Handle indicator en móvil */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-slate-200">
          <h2 className="text-base md:text-lg font-semibold text-slate-800 truncate pr-4">{titulo}</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 md:px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── INPUT / SELECT FIELD ────────────────────────────────────────────────────

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, className, ...props }: FieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        {...props}
        className={clsx(
          'px-3 py-2 rounded-lg border text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-400' : 'border-slate-300'
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function SelectField({ label, error, options, className, ...props }: SelectFieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        {...props}
        className={clsx(
          'px-3 py-2 rounded-lg border text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-400' : 'border-slate-300'
        )}
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

export function EmptyState({ mensaje, icon }: { mensaje: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
      {icon ?? (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}

// ─── SEARCH INPUT ─────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  );
}

// ─── TABLE ────────────────────────────────────────────────────────────────────

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={clsx('px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={clsx('px-4 py-3 text-slate-700 border-b border-slate-100', className)}>
      {children}
    </td>
  );
}
