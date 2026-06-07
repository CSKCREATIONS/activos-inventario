// VIEW: Dashboard
// Muestra KPIs, gráficas y alertas. Consume datos del useDashboardController.

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Monitor, CheckCircle, AlertTriangle, ShieldAlert, FileX, FileWarning, Repeat, Wrench, Clock } from 'lucide-react';
import { useDashboardController } from '../../../controllers/useDashboardController';
import { KpiCard, Card } from '../../components/ui/index';
import type { EquipoMantenimiento } from '../../../models/types/index';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

const CRITICIDAD_COLORS: Record<string, string> = {
  Baja: '#10b981',
  Media: '#f59e0b',
  Alta: '#f97316',
  Crítica: '#ef4444',
};

const ESTADO_COLORS: Record<string, string> = {
  Disponible: '#10b981',
  Asignado: '#3b82f6',
  Dañado: '#ef4444',
  Baja: '#94a3b8',
  'En revisión': '#f59e0b',
  Rentado: '#8b5cf6',
  Disposicion: '#6366f1',
};

export function DashboardPage() {
  const { stats, datosPorArea, datosPorCriticidad, datosPorSO, datosPorEstado, alertas, mantenimientosPendientes } =
    useDashboardController();

  return (
    <div className="space-y-6">

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                alerta.tipo === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : alerta.tipo === 'warning'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <AlertTriangle size={16} className="shrink-0" />
              {alerta.mensaje}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard titulo="Total activos" valor={stats.total_equipos} icon={<Monitor size={20} />} color="blue" />
        <KpiCard titulo="Asignados" valor={stats.equipos_asignados} icon={<CheckCircle size={20} />} color="green" />
        <KpiCard titulo="Disponibles" valor={stats.equipos_disponibles} icon={<Monitor size={20} />} color="slate" />
        <KpiCard titulo="Críticos / Altos" valor={stats.equipos_criticos} icon={<ShieldAlert size={20} />} color="red" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard titulo="Sin acta firmada" valor={stats.equipos_sin_acta} icon={<FileX size={20} />} color="orange" />
        <KpiCard titulo="Sin hoja de vida" valor={stats.equipos_sin_hoja_vida} icon={<FileWarning size={20} />} color="orange" />
        <KpiCard titulo="Equipos rentados" valor={stats.equipos_rentados} icon={<Repeat size={20} />} color="purple" />
      </div>

      {/* KPI Mantenimiento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          titulo="Pendientes de mantenimiento"
          valor={stats.equipos_pendientes_mantenimiento}
          icon={<Wrench size={20} />}
          color="red"
        />
        <KpiCard
          titulo="Sin mantenimiento registrado"
          valor={mantenimientosPendientes.sin_registro}
          icon={<AlertTriangle size={20} />}
          color="red"
        />
        <KpiCard
          titulo="Mantenimiento vencido"
          valor={mantenimientosPendientes.vencidos}
          icon={<Clock size={20} />}
          color="orange"
        />
      </div>

      {/* Gráficas - fila 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Por estado */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Equipos por estado</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={datosPorEstado}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {datosPorEstado.map((entry) => (
                  <Cell key={entry.name} fill={ESTADO_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Por criticidad */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Distribución por criticidad</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={datosPorCriticidad} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Equipos" radius={[4, 4, 0, 0]}>
                {datosPorCriticidad.map((entry) => (
                  <Cell key={entry.name} fill={CRITICIDAD_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Gráficas - fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Por área */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Activos por área</h3>
          {datosPorArea.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Sin datos de áreas</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datosPorArea} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Activos asignados" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Por sistema operativo */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Equipos por sistema operativo</h3>
          {datosPorSO.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Sin datos de SO</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={datosPorSO}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {datosPorSO.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Widget: Equipos pendientes de mantenimiento */}
      <TablaMantenimientos data={mantenimientosPendientes} />

    </div>
  );
}

// ── Componente tabla mantenimientos ──────────────────────────────────────────

function TablaMantenimientos({
  data,
}: Readonly<{
  data: { total: number; sin_registro: number; vencidos: number; equipos: EquipoMantenimiento[] };
}>) {
  if (data.total === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-red-600 to-orange-500">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-white" />
          <h3 className="text-white font-semibold text-sm">
            Equipos pendientes de mantenimiento
          </h3>
          <span className="text-xs text-red-100 hidden sm:inline">(intervalo: 6 meses)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
            {data.total} equipo{data.total === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide border-b">
              <th className="px-4 py-2.5 text-left font-medium">Placa</th>
              <th className="px-4 py-2.5 text-left font-medium">Equipo</th>
              <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Usuario</th>
              <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Área</th>
              <th className="px-4 py-2.5 text-left font-medium">Último mant.</th>
              <th className="px-4 py-2.5 text-center font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.equipos.slice(0, 10).map((eq) => (
              <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-mono font-semibold text-blue-700">{eq.placa}</td>
                <td className="px-4 py-2.5 text-slate-800">{eq.marca ?? ''} {eq.modelo ?? ''}</td>
                <td className="px-4 py-2.5 text-slate-600 truncate max-w-[140px] hidden sm:table-cell">
                  {eq.usuario_nombre ?? <span className="text-slate-400 italic">Sin asignar</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">{eq.area ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {eq.ultimo_mantenimiento
                    ? new Date(eq.ultimo_mantenimiento).toLocaleDateString('es-CO')
                    : <span className="text-red-500 italic">Nunca</span>}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {eq.urgencia === 'sin_registro' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                                     font-semibold bg-red-100 text-red-700 border border-red-200">
                      <AlertTriangle size={10} /> Sin registro
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                                     font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                      <Clock size={10} /> {eq.dias_vencido}d vencido
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.total > 10 && (
        <div className="px-5 py-3 bg-slate-50 border-t text-center">
          <span className="text-xs text-slate-500">
            Mostrando 10 de {data.total} equipos pendientes
          </span>
        </div>
      )}
    </Card>
  );
}
