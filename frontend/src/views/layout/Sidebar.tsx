// VIEW: Sidebar — responsive
// - Mobile: drawer deslizable (controlado por Layout)
// - Tablet (md–lg): colapsado por defecto (solo íconos)
// - Desktop (lg+): expandido por defecto con opción de colapsar

import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Monitor, Users, Link2, Package,
  FileText, BarChart3, Settings, ChevronLeft, ChevronRight, Shield, X
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',              label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/activos',       label: 'Activos',        icon: Monitor },
  { to: '/usuarios',      label: 'Usuarios',       icon: Users },
  { to: '/asignaciones',  label: 'Asignaciones',   icon: Link2 },
  { to: '/accesorios',    label: 'Accesorios',     icon: Package },
  { to: '/documentos',    label: 'Documentos',     icon: FileText },
  { to: '/reportes',      label: 'Reportes',       icon: BarChart3 },
  { to: '/administracion',label: 'Administración', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, onMobileClose }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'flex flex-col bg-slate-900 text-white transition-all duration-300 h-screen',
        // En móvil siempre ancho completo (el drawer lo maneja el Layout)
        // En desktop respeta collapsed
        'w-64 lg:shrink-0',
        collapsed ? 'lg:w-16' : 'lg:w-60'
      )}
    >
      {/* Logo + botón cerrar móvil */}
      <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-700 min-h-[64px]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0">
            <Shield size={20} />
          </div>
          <div className={clsx('overflow-hidden transition-all duration-300', collapsed ? 'lg:hidden' : '')}>
            <p className="font-bold text-sm leading-tight text-white whitespace-nowrap">ITAM System</p>
            <p className="text-xs text-slate-400 leading-tight whitespace-nowrap">Gestión de Activos TI</p>
          </div>
        </div>
        {/* Botón X — solo visible en móvil */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
                collapsed && 'lg:justify-center lg:px-2'
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className={clsx('truncate', collapsed && 'lg:hidden')}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Toggle colapsar — solo visible en desktop */}
      <div className="hidden lg:block p-2 border-t border-slate-700">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span className="ml-2">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
