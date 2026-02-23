// ROUTES: Configuración central de rutas (MVC – Router como parte de la capa de presentación)
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../views/layout/Layout';
import { DashboardPage } from '../views/pages/dashboard/DashboardPage';
import { ActivosPage } from '../views/pages/activos/ActivosPage';
import { UsuariosPage } from '../views/pages/usuarios/UsuariosPage';
import { AsignacionesPage } from '../views/pages/asignaciones/AsignacionesPage';
import { AccesoriosPage } from '../views/pages/accesorios/AccesoriosPage';
import { DocumentosPage } from '../views/pages/documentos/DocumentosPage';
import { ReportesPage } from '../views/pages/reportes/ReportesPage';
import { AdministracionPage } from '../views/pages/administracion/AdministracionPage';

export const router = createBrowserRouter([
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
    ],
  },
]);
