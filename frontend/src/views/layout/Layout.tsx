// VIEW: Layout principal — responsive (drawer móvil, colapsado tablet, expandido desktop)

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const TITULOS: Record<string, { titulo: string; subtitulo: string }> = {
  '/':               { titulo: 'Dashboard',       subtitulo: 'Resumen general del inventario TI' },
  '/activos':        { titulo: 'Activos',          subtitulo: 'Gestión de equipos tecnológicos' },
  '/usuarios':       { titulo: 'Usuarios',         subtitulo: 'Gestión de responsables y asignaciones' },
  '/asignaciones':   { titulo: 'Asignaciones',     subtitulo: 'Historial y trazabilidad de activos' },
  '/accesorios':     { titulo: 'Accesorios',       subtitulo: 'Periféricos y dispositivos complementarios' },
  '/documentos':     { titulo: 'Documentos',       subtitulo: 'Gestión documental – actas, hojas de vida, garantías' },
  '/reportes':       { titulo: 'Reportes',         subtitulo: 'Reportes exportables y análisis del inventario' },
  '/administracion': { titulo: 'Administración',   subtitulo: 'Configuración del sistema' },
};

export function Layout() {
  // collapsed controla el estado desktop (true = solo íconos)
  const [collapsed, setCollapsed] = useState(false);
  // mobileOpen controla el drawer en móvil
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();

  // Cierra el drawer al navegar en móvil
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const basePath = '/' + location.pathname.split('/')[1];
  const meta = TITULOS[basePath] ?? TITULOS['/'];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — drawer en móvil, fijo en desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          titulo={meta.titulo}
          subtitulo={meta.subtitulo}
          onMenuClick={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
