// ROUTES: Configuración central de rutas (MVC – Router como parte de la capa de presentación)
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Layout } from '../views/layout/Layout';
import { DashboardPage } from '../views/pages/dashboard/DashboardPage';
import { ActivosPage } from '../views/pages/activos/ActivosPage';
import { UsuariosPage } from '../views/pages/usuarios/UsuariosPage';
import { AsignacionesPage } from '../views/pages/asignaciones/AsignacionesPage';
import { AccesoriosPage } from '../views/pages/accesorios/AccesoriosPage';
import { DocumentosPage } from '../views/pages/documentos/DocumentosPage';
import { ReportesPage } from '../views/pages/reportes/ReportesPage';
import { AdministracionPage } from '../views/pages/administracion/AdministracionPage';
import { SuministrosPage } from '../views/pages/suministros/SuministrosPage';
import { LoginPage } from '../views/pages/login/LoginPage';
import { useAuthStore } from '../models/stores/useAuthStore';

// ─── Guard: redirige a /login si no está autenticado ─────
function PrivateRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// ─── Guard: redirige al dashboard si ya está logueado ────
function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export const router = createBrowserRouter([
  // ── Rutas públicas ──────────────────────────────────────
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },
  // ── Rutas protegidas ────────────────────────────────────
  {
    element: <PrivateRoute />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true,             element: <DashboardPage /> },
          { path: 'activos',         element: <ActivosPage /> },
          { path: 'usuarios',        element: <UsuariosPage /> },
          { path: 'asignaciones',    element: <AsignacionesPage /> },
          { path: 'accesorios',      element: <AccesoriosPage /> },
          { path: 'documentos',      element: <DocumentosPage /> },
          { path: 'reportes',        element: <ReportesPage /> },
          { path: 'administracion',  element: <AdministracionPage /> },
          { path: 'suministros',         element: <Navigate to="/suministros/toners" replace /> },
          { path: 'suministros/toners',   element: <SuministrosPage /> },
          { path: 'suministros/licencias', element: <SuministrosPage /> },
          { path: 'suministros/cables',   element: <SuministrosPage /> },
        ],
      },
    ],
  },
  // ── Fallback ─────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
]);

